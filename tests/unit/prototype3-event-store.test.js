"use strict";

const {
  DEFAULT_TABLE,
  DEFAULT_USERS_TABLE,
  APP_USERS_TIMEZONE_MIGRATION_SQL,
  hasSupabaseConfig,
  normalizeForStorage,
  eventToRow,
  rowToEvent,
  createMemoryEventStore,
  createSupabaseEventStore,
} = require("../../src/prototype_3/server/event-store");

function createFakeSupabaseClient(initialRows) {
  const rows = (initialRows || []).slice();
  return {
    _rows: rows,
    from() {
      return {
        upsert(inputRows) {
          return {
            select() {
              inputRows.forEach(function (row) {
                rows.push(row);
              });
              return Promise.resolve({ data: inputRows });
            },
          };
        },
        select(_columns, options) {
          if (options && options.head) {
            return Promise.resolve({ count: rows.length });
          }
          const query = {
            _rows: rows.slice(),
            order(field, sortOptions) {
              const ascending = sortOptions && sortOptions.ascending;
              this._rows.sort(function (left, right) {
                const a = left[field] || "";
                const b = right[field] || "";
                return ascending ? String(a).localeCompare(String(b)) : String(b).localeCompare(String(a));
              });
              return this;
            },
            limit(count) {
              return Promise.resolve({ data: this._rows.slice(0, count) });
            },
          };
          return query;
        },
        delete() {
          return {
            in(field, ids) {
              for (let index = rows.length - 1; index >= 0; index -= 1) {
                if (ids.indexOf(rows[index][field]) !== -1) {
                  rows.splice(index, 1);
                }
              }
              return Promise.resolve({});
            },
          };
        },
      };
    },
  };
}

describe("Prototype 3 event store", () => {
  test("uses Supabase when credentials are available", () => {
    expect(
      hasSupabaseConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "secret",
      })
    ).toBe(true);

    expect(
      hasSupabaseConfig({
        SUPABASE_URL: "https://example.supabase.co",
      })
    ).toBe(false);
  });

  test("maps normalized events to rows and back", () => {
    const event = normalizeForStorage({
      type: "pageload",
      eventName: "pageload",
      sessionId: "s-1",
      userId: "u-1",
      route: "/checkout",
      deployVersion: "v1",
      appName: "shopdemo",
      environment: "staging",
      sdkVersion: "sdk-test",
      data: { duration: 123 },
    });

    const row = eventToRow(event);
    expect(row).toEqual(
      expect.objectContaining({
        id: event.id,
        type: "pageload",
        event_name: "pageload",
        session_id: "s-1",
        user_id: "u-1",
        route: "/checkout",
        deploy_version: "v1",
        app_name: "shopdemo",
        environment: "staging",
        sdk_version: "sdk-test",
        data: { duration: 123 },
      })
    );

    expect(rowToEvent(row)).toEqual(expect.objectContaining({
      id: event.id,
      eventName: "pageload",
      sessionId: "s-1",
      userId: "u-1",
      route: "/checkout",
      data: { duration: 123 },
    }));
  });

  test("memory store preserves current local behavior", async () => {
    const store = createMemoryEventStore({ maxEvents: 2 });
    await store.insertEvents([
      { type: "custom", sessionId: "s-1", data: { seq: 1 } },
      { type: "custom", sessionId: "s-2", data: { seq: 2 } },
      { type: "custom", sessionId: "s-3", data: { seq: 3 } },
    ]);

    const events = await store.allEvents();
    expect(events).toHaveLength(2);
    expect(events.map(function (event) { return event.sessionId; })).toEqual(["s-2", "s-3"]);
  });

  test("Supabase store inserts, lists, and prunes rows", async () => {
    const client = createFakeSupabaseClient();
    const store = createSupabaseEventStore(client, { tableName: DEFAULT_TABLE });

    const inserted = await store.insertEvents([
      { type: "custom", sessionId: "s-1", data: { seq: 1 } },
      { type: "custom", sessionId: "s-2", data: { seq: 2 } },
    ]);

    expect(inserted).toHaveLength(2);
    expect(client._rows).toHaveLength(2);

    const listed = await store.listEvents(1);
    expect(listed).toHaveLength(1);

    const pruned = await store.pruneOldest(1);
    expect(pruned).toBe(1);
    expect(client._rows).toHaveLength(1);
  });

  // Helper that captures upsert calls to the users table so we can assert on
  // the exact row shape without depending on the events-table fake client.
  function createFakeUserSyncClient() {
    const capturedUserRows = [];
    const fakeClient = {
      _capturedUserRows: capturedUserRows,
      from() {
        return {
          upsert(rowData) {
            capturedUserRows.push(rowData);
            return {
              select() {
                return Promise.resolve({ data: [rowData] });
              },
            };
          },
        };
      },
    };
    return fakeClient;
  }

  test("syncUser writes the timezone field to the upserted row", async () => {
    const fakeClient = createFakeUserSyncClient();
    const store = createSupabaseEventStore(fakeClient, {
      tableName: DEFAULT_TABLE,
      usersTableName: DEFAULT_USERS_TABLE,
    });

    await store.syncUser({
      clerkUserId: "clerk-tz-001",
      email: "dev@example.com",
      displayName: "Dev User",
      timezone: "America/New_York",
    });

    expect(fakeClient._capturedUserRows).toHaveLength(1);
    expect(fakeClient._capturedUserRows[0]).toMatchObject({
      clerk_user_id: "clerk-tz-001",
      email: "dev@example.com",
      display_name: "Dev User",
      timezone: "America/New_York",
    });
  });

  test("syncUser defaults timezone to empty string when caller omits it", async () => {
    const fakeClient = createFakeUserSyncClient();
    const store = createSupabaseEventStore(fakeClient, {
      tableName: DEFAULT_TABLE,
      usersTableName: DEFAULT_USERS_TABLE,
    });

    await store.syncUser({
      clerkUserId: "clerk-tz-002",
      email: "anon@example.com",
      displayName: "Anonymous",
    });

    // An empty string satisfies the NOT NULL column constraint; null would not.
    expect(fakeClient._capturedUserRows[0].timezone).toBe("");
  });

  test("APP_USERS_TIMEZONE_MIGRATION_SQL contains a non-destructive ALTER TABLE", () => {
    // Verify the migration uses IF NOT EXISTS so it is safe to re-run.
    expect(APP_USERS_TIMEZONE_MIGRATION_SQL).toMatch(/add column if not exists/i);
    expect(APP_USERS_TIMEZONE_MIGRATION_SQL).toMatch(/timezone/i);
  });
});
