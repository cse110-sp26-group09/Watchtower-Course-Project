# Research: Timezone Button Backend Fix

**Author:** @waleedA13
**Issue:** [#161](https://github.com/cse110-sp26-group09/Watchtower-Course-Project/issues/161)
**Reviewers:** @AdityaJadhav17 @woosik-study @dwu0501

---

## Summary

| Layer | Problem | Fix |
|---|---|---|
| `app.js` - event listener | `#timezone-select` has no change handler | Add `initializeTimezoneControl()` wired to `uiState.timezone` |
| `app.js` - formatting | `formatClockTime()` and `formatTimestamp()` ignore timezone | Pass `timeZone` option from `uiState.timezone` |
| `app.js` - persistence | No `TIMEZONE_STORAGE_KEY`, no save/load | Add storage key, load on init, save on change |
| `server.js` - API | `POST /api/users/sync` drops `timezone` field | Accept and return `timezone` |
| `event-store.js` - DB | `app_users` has no `timezone` column | Add column, update `syncUser()` |

The frontend layer fixes the visible bug. The API and DB layers make the preference persist across devices and sessions beyond localStorage.

---

## Problem Analysis

### What the user sees

The timezone selector in Settings renders and is interactive, but selecting any option has zero effect on the timestamps shown anywhere in the dashboard: timelines, issue tables, analytics, the "Updated" label, and the developer stream all continue to show the browser's local time regardless of what is selected.

### Why it does nothing

There are three independent gaps, each of which must be closed for the feature to work end-to-end.

**Gap 1 - No event listener or state update**

`app.js` initializes every other setting via a dedicated function (`initializeDarkModeToggle`, `initializeContrastToggle`, etc.) but there is no `initializeTimezoneControl()`. The element `#timezone-select` (index.html:742) is never queried and never gets a `change` listener. `uiState` (app.js:268) has no `timezone` property.

**Gap 2 - Formatting functions are timezone-blind**

All time rendering flows through two functions:

```js
// app.js:317
function formatClockTime(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// app.js:324
function formatTimestamp(value) {
  if (!value) return "--";
  let ts = getValidTimestamp(value);
  if (ts === null) return "--";
  return new Date(ts).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
```

Both call `toLocaleTimeString` / `toLocaleString` without a `timeZone` option, so they always fall back to the browser's system timezone. Even if `uiState.timezone` existed and was set, these functions would not use it.

**Gap 3 - No persistence**

The other settings use a `saveUiPreference` / `loadUiPreference` pattern backed by `localStorage` (app.js:386-398). There is no `TIMEZONE_STORAGE_KEY` defined (app.js:259-264), so the preference cannot survive a page reload even if the first two gaps were fixed.

The server-side gap (no `timezone` field in `POST /api/users/sync` and no column in `app_users`) means the preference is also not synced across devices or sessions where `localStorage` is cleared.

---

## Affected Code Locations

| File | Location | What is missing |
|---|---|---|
| `src/prototype_3/app.js` | Line 259 - storage keys | `TIMEZONE_STORAGE_KEY` constant |
| `src/prototype_3/app.js` | Line 268 - `uiState` | `timezone: "auto"` property |
| `src/prototype_3/app.js` | Line 317 - `formatClockTime` | `timeZone` option in `toLocaleTimeString` |
| `src/prototype_3/app.js` | Line 324 - `formatTimestamp` | `timeZone` option in `toLocaleString` |
| `src/prototype_3/app.js` | Line 1486 area | `initializeTimezoneControl()` function |
| `src/prototype_3/app.js` | Line 2783 - init call site | Call to `initializeTimezoneControl()` |
| `src/prototype_3/server/server.js` | Line 1138 - `syncUser` call | `timezone` field not passed through |
| `src/prototype_3/server/event-store.js` | Line 253 - `syncUser()` | No `timezone` column read/write |

---

## How `Intl` / `toLocaleString` Timezone Works

JavaScript's `Intl.DateTimeFormat` API (which backs `toLocaleString` and `toLocaleTimeString`) accepts an IANA timezone string in its options object. The timezone values already present in `#timezone-select` (index.html:745-753) are valid IANA strings (`America/New_York`, `Europe/Berlin`, etc.).

```js
new Date(isoTimestamp).toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/New_York"   // forces Eastern time regardless of browser locale
});
```

When `timeZone` is omitted or `undefined`, the browser falls back to its system timezone - which is the current behavior. For the `auto` option we simply pass `undefined`, which preserves the existing behavior.

This approach requires no external library. The browser handles all DST rules automatically because IANA timezone identifiers encode them.

---

## Recommended Solution

### Layer 1 - app.js (core fix)

**Step 1: Add storage key and uiState property**

```js
// after line 264 in app.js
let TIMEZONE_STORAGE_KEY = "watchtower_timezone";
```

```js
// inside uiState object (line 268)
timezone: "auto",
```

**Step 2: Thread timezone into both formatting functions**

```js
function formatClockTime(isoTimestamp) {
  let opts = { hour: "2-digit", minute: "2-digit" };
  if (uiState.timezone && uiState.timezone !== "auto") opts.timeZone = uiState.timezone;
  return new Date(isoTimestamp).toLocaleTimeString([], opts);
}

function formatTimestamp(value) {
  if (!value) return "--";
  let ts = getValidTimestamp(value);
  if (ts === null) return "--";
  let opts = {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  };
  if (uiState.timezone && uiState.timezone !== "auto") opts.timeZone = uiState.timezone;
  return new Date(ts).toLocaleString([], opts);
}
```

**Step 3: Add initializeTimezoneControl**

Modeled on the existing `initializeDarkModeToggle` pattern (app.js:1486).

```js
function initializeTimezoneControl() {
  let timezoneSelect = document.getElementById("timezone-select");
  let saved = loadUiPreference(TIMEZONE_STORAGE_KEY);
  if (saved) {
    uiState.timezone = saved;
    if (timezoneSelect) timezoneSelect.value = saved;
  }
  if (!timezoneSelect) return;
  timezoneSelect.addEventListener("change", function () {
    uiState.timezone = timezoneSelect.value;
    saveUiPreference(TIMEZONE_STORAGE_KEY, uiState.timezone);
    renderAll();   // re-render so timestamps update immediately
  });
}
```

**Step 4: Call it from the initialization block**

```js
// inside initializeWatchTowerFrontend(), after initializeDarkModeToggle()
initializeTimezoneControl();
```

### Layer 2 - server.js (API sync)

Add `timezone` to the `syncUser` call so it can round-trip through the API:

```js
// server.js line 1138
const user = await eventStore.syncUser({
  clerkUserId: clerkUserId,
  email: safeString(body && body.email).trim(),
  displayName: safeString(body && body.displayName).trim(),
  timezone: safeString(body && body.timezone).trim() || "",
});
```

### Layer 3 - event-store.js and database (persistence)

**Migration SQL** (run against Supabase):

```sql
alter table public.app_users
  add column if not exists timezone text not null default '';
```

**Update syncUser in event-store.js** (line 259):

```js
const row = {
  clerk_user_id: clerkUserId,
  email: input.email || "",
  display_name: input.displayName || "",
  timezone: input.timezone || "",
  last_seen_at: new Date().toISOString(),
};
```

---

## Implementation Order

1. **app.js changes first** - fixes the visible bug immediately, no server dependency
2. **server.js change** - one-line addition, non-breaking, can go in the same PR
3. **DB migration** - run the `ALTER TABLE` in Supabase before deploying the server change
4. **event-store.js change** - after migration is confirmed

Steps 2-4 are independent of the UI fix and can ship in a follow-up if the migration needs separate review.

---

## What `renderAll` Should Do

After the user changes the timezone, all displayed timestamps need to refresh. The existing polling/refresh cycle in `initializeWatchTowerFrontend` (app.js:2731) re-renders on every data fetch. To make the update feel instant without waiting for the next poll cycle, `initializeTimezoneControl` should trigger a re-render after saving the preference.

If a top-level `renderAll()` or equivalent does not already exist, calling the individual render functions for the active view is sufficient.

---

## Edge Cases

| Case | Behavior |
|---|---|
| `auto` selected | `timeZone` option is `undefined`; browser uses system timezone (current behavior) |
| Invalid IANA string in storage | `toLocaleString` throws `RangeError`; wrap in try/catch and fall back to `auto` |
| User clears localStorage | Preference resets to `auto`; no crash |
| No Supabase configured | `syncUser` stores to in-memory fallback; timezone field is accepted but not persisted to DB |

---

## No New Dependencies

All three layers use only what the project already has:

- `Intl` / `toLocaleString` - native JS, no import needed
- `localStorage` - already used by `saveUiPreference` / `loadUiPreference`
- Supabase `upsert` - already used by `syncUser`
- PostgreSQL `ALTER TABLE` - standard SQL, no migration framework needed
