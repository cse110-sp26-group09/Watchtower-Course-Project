# Architecture and workflow diagrams

These diagrams describe the active implementation in `src/`. Code takes precedence over existing documentation. Node labels are kept short; edge labels carry the protocols, endpoints, and calls.

Primary sources: [server.js](../../src/backend/server.js), [server-helpers.js](../../src/backend/server-helpers.js), [event-store.js](../../src/backend/event-store.js), [watchtower.js](../../src/sdk/watchtower.js), [event-utils.js](../../src/shared/utils/event-utils.js), [auth.js](../../src/frontend/auth/auth.js), [auth-guard.js](../../src/frontend/dashboard/auth-guard.js), [dashboard app.js](../../src/frontend/dashboard/app.js), and [demo app.js](../../src/frontend/demo/app.js).

Deployment labels (Render and the separate GitHub Pages test app) come from [README.md](../../README.md) and [auth-workflow.md](auth-workflow.md). The external test app's source and deployed environment are outside this checkout; its configured endpoint is documented, not independently verified here. No unimplemented project-key service or additional database table is assumed.

## 1. System architecture

```mermaid
flowchart LR
    subgraph monitored["Monitored browser app"]
        app["App code"]
        sdk["Embedded SDK"]
        app -->|"Browser events / JS trackClick()"| sdk
    end
    pages["GitHub Pages test app"]
    dashboard["Dashboard browser"]
    backend["Node.js on Render"]
    clerk["Clerk"]
    memory["Memory event buffer"]
    subgraph database["Supabase / Postgres"]
        events[("prototype3_events")]
        users[("app_users")]
    end

    pages -->|"HTTPS static app + local SDK copy"| app
    sdk -->|"HTTPS POST /api/events; JSON batches"| backend
    sdk -->|"HTTPS POST /api/beacon; sendBeacon"| backend
    sdk -->|"HTTPS OPTIONS; cross-origin preflight"| backend
    dashboard -->|"HTTPS GET /dashboard and /dashboard/*"| backend
    dashboard -->|"HTTPS GET /login/ and /login/*"| backend
    dashboard -->|"HTTPS GET /api/stats, /api/events, /api/developer/insights"| backend
    dashboard -->|"HTTPS GET /api/developer/stream; developer mode"| backend
    dashboard -->|"HTTPS POST /api/users/sync, /api/developer/query"| backend
    dashboard -->|"HTTPS POST /api/developer/feature-flags/evaluate"| backend
    dashboard -->|"HTTPS Clerk JS; sign-in and session token"| clerk
    backend -->|"HTTPS GET issuer/.well-known/jwks.json"| clerk
    backend <-->|"HTTPS Supabase API; upsert, scoped select, count, prune"| events
    backend -->|"HTTPS Supabase API; upsert by clerk_user_id"| users
    backend <-->|"JS store calls; no Supabase config"| memory
```

- The Node server serves the frontend and `/sdk/watchtower.js`. Its `/demo/` page is an in-repo monitored app; `/dashboard-demo/` is a static preview. The external Pages app is a separate documented consumer of the same ingestion API.
- The dashboard reads backend JSON; it does not subscribe directly to Supabase. HTTPS denotes the documented hosted deployment; the Node listener itself is plain `http.createServer` and local development uses HTTP.
- Table names above are defaults. `SUPABASE_P3_EVENTS_TABLE` and `SUPABASE_P3_USERS_TABLE` can override them. The server selects Supabase when `SUPABASE_URL` and either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` exist, preferring the service-role key. Otherwise it selects memory at startup. A Supabase failure does not switch storage to memory.
- The feature-flag evaluation endpoint exists and requires authentication, but its current dashboard caller omits auth headers; see the discrepancies below.

## 2. Event ingestion

```mermaid
sequenceDiagram
    participant App as Monitored app
    participant SDK as Browser SDK
    participant API as Node backend
    participant Store as Event store
    participant DB as Supabase
    participant Mem as Memory buffer

    App->>SDK: error / unhandledrejection listeners
    App->>SDK: App handler calls trackClick(target, text)
    App->>SDK: pushState / replaceState / popstate
    App->>SDK: Navigation Timing and PerformanceObserver metrics
    SDK->>SDK: Enqueue envelope with session, route and metadata
    Note over SDK: Flush every 2000 ms, up to 50 events per fetch

    opt Cross-origin JSON request needs preflight
        SDK->>API: OPTIONS /api/events with Origin
        API->>API: Match Origin in CORS_ALLOWED_ORIGINS
        API-->>SDK: 204, allow-origin only for an exact match
        Note over SDK,API: Browser blocks the POST if preflight fails.<br/>Server CORS code does not reject POSTs by Origin.
    end

    opt Browser permits delivery
        SDK->>API: POST /api/events, JSON events batch
        API->>API: readJsonBody, maximum 1 MiB
        alt Invalid JSON or oversized body
            API-->>SDK: 400 or 413 JSON error
        else Parsed body
            API->>API: Resolve authenticated owner, else DEFAULT_INGEST_OWNER_USER_ID
            Note over API: JWT verification when configured,<br/>trusted header only in fallback mode
            API->>API: Unwrap events array, raw array or single event
            alt More than 100 incoming events
                API-->>SDK: 413 Too many events in one request
            else Batch within limit
                API->>API: Filter with server-helpers.isValidEvent
                Note over API: Only requires an object with string type.<br/>Invalid entries are silently dropped.
                API->>API: Stamp userId with resolved owner
                Note over API: No owner: null, except payload userId allowed<br/>when Clerk verification is disabled
                API->>Store: insertEvents(valid events)
                Store->>Store: Normalize fields, add receivedAt and id
                alt Supabase configured at startup
                    Store->>DB: Upsert prototype3_events by id, ignore duplicates
                    DB-->>Store: Rows or error
                else Supabase not configured
                    Store->>Mem: Append, drop oldest above maxEvents
                    Mem-->>Store: Normalized events
                end
                alt Insert succeeds
                    Store-->>API: Normalized events
                    API->>Store: pruneOldest(MAX_EVENTS)
                    Note over Store: Applies to the whole store, default cap 10000
                    alt Prune succeeds
                        API->>API: applyCors to response
                        API-->>SDK: 200 JSON with accepted count
                    else Prune fails
                        API-->>SDK: 500 Failed to store events
                    end
                else Insert fails
                    Store-->>API: Error, no switch to memory
                    API-->>SDK: 500 Failed to store events
                end
            end
        end
    end

    Note over SDK: Fetch rejection requeues the batch.<br/>HTTP error statuses are not checked by _flush().
    opt Page hidden or pagehide with queued events remaining
        SDK->>API: POST /api/beacon via sendBeacon, JSON Blob
        API->>API: Same parsing, owner and ingestion logic
        API-->>SDK: 204 even on parsing or storage error
        Note over SDK: Beacon sends the whole remaining queue.<br/>If unavailable or enqueue fails, SDK tries _flush().
    end
```

Capture details are from `watchtower.js`: errors are automatic; clicks require explicit `trackClick()` calls (wired in `demo/app.js`); route tracking wraps history changes and listens for `popstate`; performance capture includes `pageload` plus LCP, CLS, and INP-labelled observer samples when supported. These are the implementation's samples, not a claim of full Web Vitals aggregation.

Owner precedence is authenticated user, then `DEFAULT_INGEST_OWNER_USER_ID`, then the local payload-owner exception, then `null`. With verification enabled, client payload ownership is overwritten even when no default exists. With verification disabled, the listener binds to `127.0.0.1` and payload `userId` can be retained. The SDK itself sends no Clerk token or user header.

CORS is response-header logic: `*` is excluded from the configured allowlist, and absent/disallowed origins get no `Access-Control-Allow-Origin`. Same-origin browser calls do not need CORS permission. Direct HTTP clients can still POST; there is no server-side origin-denial branch. `/api/beacon` has the same cross-origin considerations and the same 100-event limit, even though the SDK's beacon flush can exceed it.

## 3. Dashboard auth and data read

```mermaid
sequenceDiagram
    actor User
    participant UI as Login and dashboard
    participant Clerk
    participant API as Node backend
    participant Store as Event store
    participant DB as Supabase

    User->>UI: Open /login/
    UI->>API: GET /login/ and /login/clerk-config.js
    API-->>UI: HTML, auth.js and publishable key
    UI->>Clerk: HTTPS load Clerk JS, mountSignIn
    User->>Clerk: Sign in through Clerk component
    Clerk-->>UI: Active user and session
    UI->>API: GET /dashboard and dashboard assets
    API-->>UI: Public static shell, auth-guard.js and app.js
    UI->>Clerk: Clerk.load, inspect user/session
    alt No user or Clerk/config load failure
        UI->>UI: Keep shell hidden, redirect to /login/
    else Signed in
        UI->>UI: Reveal shell, publish user, store local demo user id
        UI->>Clerk: session.getToken()
        Clerk-->>UI: Session JWT
        UI->>API: POST /api/users/sync with Bearer JWT and user header
        API->>Clerk: HTTPS GET issuer/.well-known/jwks.json as needed
        Clerk-->>API: Public signing keys cached by jose
        API->>API: jwtVerify signature, issuer and time claims, require integer exp
        alt Invalid token or missing subject
            API-->>UI: 401 Authentication required
        else Verified sub
            API->>Store: syncUser with clerkUserId from verified sub
            alt Supabase configured
                Store->>DB: Upsert app_users by clerk_user_id
                DB-->>Store: User row
            else Memory store
                Store->>Store: Return input, no user table persisted
            end
            Store-->>API: User
            API-->>UI: 200 JSON
        end
        Note over UI,API: User sync is fire-and-forget.<br/>Reads can start before sync completes.

        loop Initial load, every 3000 ms, or manual refresh
            UI->>UI: Skip data fetch if no Clerk user
            UI->>Clerk: session.getToken()
            Clerk-->>UI: JWT
            par Parallel authenticated reads
                UI->>API: GET /api/stats
            and Recent events
                UI->>API: GET /api/events?limit=600
            and Developer insights
                UI->>API: GET /api/developer/insights
            end
            API->>API: requireCurrentUser on each request, verify JWT
            alt Authentication fails
                API-->>UI: 401 JSON, no event-store query
            else Authenticated user
                API->>Store: getAnalyticsSnapshot, listEvents, allEvents with userId
                alt Supabase configured
                    Store->>DB: Select/count prototype3_events where user_id equals sub
                    DB-->>Store: Only matching rows/counts
                else Memory store
                    Store->>Store: Filter events by event.userId
                end
                Store-->>API: Events and analytics
                API-->>UI: JSON responses
                UI->>UI: Render stats, events and developer workbench
                opt Developer mode after refresh
                    UI->>API: GET /api/developer/stream with auth headers and filters
                    API->>API: requireCurrentUser
                    API->>Store: allEvents(MAX_EVENTS, userId)
                    Store-->>API: Owner-scoped events
                    API->>API: Filter, sort and paginate in JavaScript
                    API-->>UI: JSON inspector page
                end
            end
        end
    end
```

The sequence shows normal Clerk verification. `getClerkUserHeaders()` also sends `X-Clerk-User-Id`; it is ignored unless verification is disabled or `WATCHTOWER_TRUST_USER_HEADER=true`. Production startup rejects disabled verification and rejects header trust. In non-production, explicitly enabling header trust with verification configured still binds to `0.0.0.0`; it is not inherently loopback-only.

**Updates are HTTP polling, not SSE or websockets.** `POLL_INTERVAL = 3000` drives `fetchDashboardStats()`. Each refresh fetches stats, 600 recent events, and developer insights concurrently; developer mode additionally fetches a JSON inspector page. `/api/developer/stream` is a paginated JSON endpoint, and there is no active `/api/events/stream` route, `EventSource`, WebSocket client, or WebSocket server in these sources. SDK delivery independently runs every 2000 ms.

The query workbench uses authenticated `POST /api/developer/query`: the backend loads owner-scoped events and evaluates its restricted SQL-like syntax in JavaScript, not against a separate SQL table. User sync is not required to establish event ownership; the verified subject supplies the filter directly.

## 4. Backend module map

Solid arrows indicate imports; dashed arrows identify static resources or documentation relationships. Every file currently under `src/backend/` appears below.

```mermaid
flowchart TD
    subgraph backend["src/backend"]
        server["server.js"]
        helpers["server-helpers.js"]
        store["event-store.js"]
        readme["README.md"]
        server -->|"require; pure helpers"| helpers
        server -->|"require; configured store"| store
        store -->|"require; normalization and math"| helpers
        readme -.->|"Documents HTTP and auth"| server
        readme -.->|"Documents pure helpers"| helpers
        readme -.->|"Documents storage"| store
    end

    jose["jose"]
    supabase["@supabase/supabase-js"]
    dotenv["dotenv"]
    node["Node built-ins"]
    frontend["src/frontend/*"]
    sdk["src/sdk/watchtower.js"]
    shared["shared/utils/event-utils.js"]

    server -->|"require; createRemoteJWKSet, jwtVerify"| jose
    server -->|"require; http, fs, path"| node
    store -->|"require; path, crypto.randomUUID"| node
    store -->|"require; load environment"| dotenv
    store -->|"require; createClient"| supabase
    server -.->|"fs static serving; HTTP GET"| frontend
    server -.->|"fs static serving; GET /sdk/watchtower.js"| sdk
```

| Backend file | Responsibilities |
| --- | --- |
| `server.js` | Starts plain Node HTTP; serves static frontend/SDK files; applies CORS and response headers; parses and limits bodies; verifies Clerk JWTs; resolves ingest owners; routes event ingestion and scoped reads; syncs users; builds developer insights; evaluates SQL-like queries and feature flags. Query rate limits are in-memory. |
| `server-helpers.js` | Dependency-free functions for permissive event validation, normalization, numeric summaries, timestamps, environment/name derivation, inspector filters/pagination, recent events and concurrency counts. Imported by both runtime modules. |
| `event-store.js` | Loads dotenv configuration; selects Supabase or memory; normalizes events and assigns IDs; maps camelCase events to snake_case rows; inserts/lists/counts/prunes events; syncs users; computes analytics snapshots. Exports schema/migration SQL strings but does not execute migrations. |
| `README.md` | Describes the three JavaScript modules and links configuration/API documentation. No runtime dependency. |

The isolated `shared/utils/event-utils.js` node is intentional: none of the active backend modules imports it. Its stricter validator is not on the ingestion path. The SDK and frontend are served as files, not imported into the server process. Memory storage and Supabase access both live in `event-store.js`; there are no separate controller, auth, CORS, queue, or database modules to add to this map.

## Documentation/code discrepancies

| Documentation or assumption | Verified implementation |
| --- | --- |
| Root README calls the dashboard "real-time" and describes streaming. Historical [API v1](api-contract-v1.md) describes SSE broadcasts. | Current `dashboard/app.js` polls every **3000 ms**; SDK delivery runs every **2000 ms**. The v1 SSE endpoint is retired, as the v1 banner and later auth documentation correctly acknowledge. The current developer "stream" returns JSON. |
| [auth-workflow.md](auth-workflow.md), page responsibilities and user recognition, emphasizes `X-Clerk-User-Id` as the scoping mechanism. | Both auth-guard and normal dashboard reads attempt to send a Bearer JWT plus the header. With verification enforced, the JWT's verified `sub` controls ownership. The later trust-model section is closer to the code. |
| [API v2](api-contract-v2.md) says header-trust mode binds only to loopback. | Binding depends on `CLERK_VERIFICATION_ENABLED`, not the trust flag. No verification means `127.0.0.1`; verification plus explicit header trust in non-production means `0.0.0.0`. Production rejects header trust. |
| [Shared utilities README](../../src/shared/utils/README.md) calls `event-utils.js` the canonical implementation used by the backend. [Event schema v1](event-schema-v1.md) says the server stores events without revalidation. | Active ingestion filters using `server-helpers.isValidEvent`: object plus string `type` only, even an empty string. The unimported shared validator instead requires a nonempty type, parseable timestamp, and object data. Missing fields are normalized later; invalid nonempty timestamps are not repaired. |
| [API v2](api-contract-v2.md) says all JSON endpoints send CORS headers; README says unset CORS allows only same-origin requests. | Allowed methods/headers are emitted, but allow-origin appears only for an exact configured origin. There is no Origin rejection in ingestion. Browser CORS enforcement and server authorization are distinct. |
| [Event schema v2](event-schema-v2.md) presents snake_case fields and says browser/API payloads "may use" camelCase. | Ingestion normalization reads camelCase metadata (`userId`, `sessionId`, `eventName`, etc.). Snake_case names describe database rows; there is no general snake_case input adapter. `user_id` in a payload does not assign an owner. |
| [API v2](api-contract-v2.md) shows `eventsByType`, `averageLatency`, and an `analytics` object in `/api/stats`. | The configured stores implement `getAnalyticsSnapshot()`, returning `eventBreakdown`, `feedbackCounts`, `featureCounts`, `userActivity`, `analyticsRanges`, and `maxUsers` alongside totals and recent events. The documented example is not the actual current response shape. |
| Auth workflow user-sync examples omit timezone; a source comment says sync ensures the user row exists before reads. | `auth-guard.js` sends the stored timezone, and the store writes `timezone` plus `last_seen_at`. Sync is fire-and-forget and reads wait for Clerk user availability, not completion of the upsert. |
| Auth workflow ends its configuration section by referring to backend verification being added later. Its opening logout sketch returns to the landing page. | Verification already exists through `jose` and public JWKS, requiring no Clerk secret. Both dashboard sign-out controls redirect to `/login/`, consistent with the document's later logout section. |
| [API v2](api-contract-v2.md) presents feature-flag evaluation as a working dashboard call and illustrates `flags` as an object. | The server requires an authenticated user and returns a flags array. The button handler currently sends only `Content-Type`, so that call gets 401 against the active backend; it does not use the normal auth-header helper. |
| Root README says threshold-based email alerting exists today. | Active backend files contain no email transport or sending route. Dashboard notification settings and alert indicators exist; an email-delivery component cannot be substantiated from this implementation and is omitted. |
| A reader could interpret the storage "fallback" as database-outage failover or assume SDK retries every failed HTTP response. | Store selection occurs at startup based on configuration. Supabase insert/prune errors return 500 for `/api/events`; beacon errors are swallowed with 204. SDK `_flush()` retries rejected fetch promises but never checks `response.ok`, so HTTP 400/413/500 responses are treated as delivery success. |

Path clarification: the requested `src/shared/event-utils.js` does not exist; the file reviewed is `src/shared/utils/event-utils.js`. Historical v1 contracts and the original external-app separation plan are not treated as active architecture; the plan's Prototype 3 addendum records the later external deployment.
