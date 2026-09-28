# Architecture illustration prompts

Tool: built-in image generator. Style: Ian Xiaohei illustrations. Source: `docs/architecture/diagrams.md`. English identifiers and technical fidelity take precedence over the skill's default Chinese annotations and metaphor-only compositions.

## System architecture

Final image: `01-system-architecture.png`

### Initial prompt

```text
Use case: infographic-diagram. Create ONE standalone 16:9 landscape raster image, high resolution with legible technical labels. This is a faithful illustrated conversion of one WatchTower architecture diagram, in the requested Ian Xiaohei illustration style.
VISUAL STYLE: Pure white #ffffff background, spare black slightly wobbly pen linework, generous white space. Orange for main arrows, blue for secondary/auth/read paths, red only for important caveats. No gradients, shadows, textures, realistic UI, glossy art, marketing infographic cards, thick borders, or cute mascots. Use a small solid-black irregular bean creature Xiaohei with white dot eyes, thin legs/arms, deadpan expression, actively performing the core action. It represents the existing code operation, NEVER an extra software component. No large title or type heading in the top-left. Keep the layout calm and readable, using English for all labels since source is English; preserve exact identifiers and endpoints. This user specifically asks to convert technical diagrams: accuracy, arrow direction, all essential components, and readable labels take priority over the style guide's usual sparse metaphor-only rules. Do not invent services or tables. Do not put Mermaid code syntax in the image. Use original understated physical metaphors, not stock flowchart clip art.

COMPOSITION AND REQUIRED FACTS:
Render a readable left-to-right architecture sketch. At left, GitHub Pages serves the monitored browser app containing app code and its embedded SDK. Center, Node.js backend on Render. At right Supabase/Postgres with exactly two drawers labelled prototype3_events and app_users. A dashboard browser sits below, Clerk above/right, and a separate small memory buffer below the backend. Xiaohei operates a small sorting slot built INTO the backend: it dispatches events to the configured store, embodying the backend action. Make sure arrow directions and connection labels follow the source. Keep multiple same-direction endpoint labels together on a neatly handwritten annotation to reduce crossing lines. Important labels: HTTPS POST /api/events; HTTPS POST /api/beacon; HTTPS OPTIONS; HTTPS GET /dashboard, /login/; dashboard GET /api/stats, /api/events, /api/developer/insights; developer GET /api/developer/stream; POST /api/users/sync and /api/developer/query; POST /api/developer/feature-flags/evaluate (small red note: caller lacks auth headers); Clerk sign-in/session over HTTPS and backend GET /.well-known/jwks.json. Database arrows labelled HTTPS Supabase API. Memory path labelled no Supabase config; small red note no outage failover. app to embedded SDK is local browser events / trackClick(). The Pages app is documented externally, not hosted on the backend. Each connection has a brief protocol/endpoint label. Supabase connects to backend only, not directly to dashboard.

SOURCE MERMAID TO CONVERT (authoritative relationships):
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

### Revision prompt

```text
Edit this hand-drawn WatchTower diagram, preserving the exact 16:9 dimensions, white background, all existing component boxes, all labels, style, and Xiaohei. Correct arrow connectivity ONLY: (1) The upper blue line labelled HTTPS Clerk JS sign-in and session token currently begins above the monitored browser app with a dangling end. This MUST start visibly at the Dashboard browser laptop at bottom-left, route up the far-left margin without touching GitHub Pages or the monitored app, continue across the top, and end in Clerk at top-right. Browser app/SDK must NOT connect to Clerk. (2) Every orange dashboard API endpoint arrow must visibly terminate at the Node.js on Render box; in particular extend the bottom POST /api/developer/feature-flags/evaluate path, retaining caller lacks auth headers. Keep the backend's separate blue GET /.well-known/jwks.json arrow to Clerk unchanged. Do not add or remove components, do not change any code identifiers, do not alter the other paths. Eliminate any dangling connector by attaching it to its intended source/destination.
```

## Event ingestion

Final image: `02-event-ingestion.png`

### Initial prompt

```text
Use case: infographic-diagram. Create ONE standalone 16:9 landscape raster image, high resolution with legible technical labels. This is a faithful illustrated conversion of one WatchTower architecture diagram, in the requested Ian Xiaohei illustration style.
VISUAL STYLE: Pure white #ffffff background, spare black slightly wobbly pen linework, generous white space. Orange for main arrows, blue for secondary/auth/read paths, red only for important caveats. No gradients, shadows, textures, realistic UI, glossy art, marketing infographic cards, thick borders, or cute mascots. Use a small solid-black irregular bean creature Xiaohei with white dot eyes, thin legs/arms, deadpan expression, actively performing the core action. It represents the existing code operation, NEVER an extra software component. No large title or type heading in the top-left. Keep the layout calm and readable, using English for all labels since source is English; preserve exact identifiers and endpoints. This user specifically asks to convert technical diagrams: accuracy, arrow direction, all essential components, and readable labels take priority over the style guide's usual sparse metaphor-only rules. Do not invent services or tables. Do not put Mermaid code syntax in the image. Use original understated physical metaphors, not stock flowchart clip art.

COMPOSITION AND REQUIRED FACTS:
Convert the sequence to an airy readable staged left-to-right process with a small conditional fork at storage. Preserve logical order: 1 capture errors/unhandled rejections, app trackClick(), history route changes, Navigation Timing / observer performance; 2 SDK queue, flush 2000 ms, 50 per batch; 3 browser OPTIONS preflight to backend (CORS_ALLOWED_ORIGINS exact match), then POST /api/events; 4 backend parse JSON max 1 MiB, resolve owner, batch max 100, validate object + string type, drop invalid, stamp userId, normalize + id + receivedAt; 5 Supabase upsert prototype3_events OR memory only when unconfigured; prune to MAX_EVENTS default 10000; success 200 accepted count, insert/prune error 500. Xiaohei at the owner-stamping operation threads the correct userId tag through each incoming event, not a decorative observer. Owner priority must show authenticated user > DEFAULT_INGEST_OWNER_USER_ID > null, with a small side note payload userId allowed only when Clerk verification is disabled. Do not imply strict shared-schema validation. Keep three concise red caveats: browser enforces CORS, server does not reject Origin; HTTP error status is not checked by SDK; Supabase failure does not fall back to memory. Along the bottom, a thin alternate arrow SDK -> backend labelled pagehide / hidden: POST /api/beacon, same ingestion, always 204, sends remaining queue. Include compact 400 invalid JSON / 413 size or batch limit annotation. Maintain all essential conditions but avoid long paragraphs or copying giant formal sequence boxes.

SOURCE MERMAID TO CONVERT (authoritative relationships):
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

## Dashboard auth and polling

Final image: `03-dashboard-auth-and-polling.png`

### Initial prompt

```text
Use case: infographic-diagram. Create ONE standalone 16:9 landscape raster image, high resolution with legible technical labels. This is a faithful illustrated conversion of one WatchTower architecture diagram, in the requested Ian Xiaohei illustration style.
VISUAL STYLE: Pure white #ffffff background, spare black slightly wobbly pen linework, generous white space. Orange for main arrows, blue for secondary/auth/read paths, red only for important caveats. No gradients, shadows, textures, realistic UI, glossy art, marketing infographic cards, thick borders, or cute mascots. Use a small solid-black irregular bean creature Xiaohei with white dot eyes, thin legs/arms, deadpan expression, actively performing the core action. It represents the existing code operation, NEVER an extra software component. No large title or type heading in the top-left. Keep the layout calm and readable, using English for all labels since source is English; preserve exact identifiers and endpoints. This user specifically asks to convert technical diagrams: accuracy, arrow direction, all essential components, and readable labels take priority over the style guide's usual sparse metaphor-only rules. Do not invent services or tables. Do not put Mermaid code syntax in the image. Use original understated physical metaphors, not stock flowchart clip art.

COMPOSITION AND REQUIRED FACTS:
Illustrate two visually connected phases on one wide canvas: upper sign-in then lower repeating data read. Login/dashboard browser at left, Clerk at upper center, Node backend at center/right, event store and Supabase drawers at right. Trace /login/ and clerk-config.js loading, Clerk sign-in -> session -> /dashboard -> guard (no session redirects /login/) -> session.getToken() -> Bearer JWT. Backend obtains public keys at issuer/.well-known/jwks.json, verifies signature + issuer + time claims + integer exp, takes userId from sub. Xiaohei is part of the backend identity-check action: peers through a JWT-shaped keyhole, then opens only the matching user's data drawer, not a new service. User sync POST /api/users/sync upserts app_users; blue note fire-and-forget, reads don't wait. Lower loop visually prominent with precise label POLL EVERY 3000 ms: dashboard concurrently GET /api/stats, GET /api/events?limit=600, GET /api/developer/insights, all with JWT, backend verifies per request and queries prototype3_events WHERE user_id = sub, JSON back to dashboard. Optional developer mode GET /api/developer/stream returns paginated JSON. Mark authentication failure 401, memory store filters event.userId when unconfigured and has no persisted users. Small red annotation POLLING — NO SSE / WEBSOCKETS. Blue fine print X-Clerk-User-Id only fallback; production requires JWT. Do not suggest browser talks directly to Supabase, JWKS endpoint authenticates user, app_users gates reads, or storage pushes updates. Keep readable restrained handwriting.

SOURCE MERMAID TO CONVERT (authoritative relationships):
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

### Revision prompt

```text
Edit this existing WatchTower authentication illustration to correct misrouted arrows. Preserve 16:9 image, handwriting, white background, all component boxes and text, bottom polling phase, and black Xiaohei. IMPORTANT CORRECTIONS in TOP phase: GET /login/ and /login/clerk-config.js must be a request from Login and dashboard browser to Node backend, NOT Clerk; the response HTML, auth.js and publishable key must go from Node backend back to browser. GET /dashboard and dashboard assets must go browser -> Node backend, NOT Clerk; response Public static shell, auth-guard.js and app.js goes backend -> browser. Route these four paths around the Clerk box so they never attach to it; rearrange top labels/paths as needed for legibility. Only Clerk JS load/mountSignIn, sign-in, Clerk.load, and session.getToken go browser -> Clerk; Active user and session and Session JWT go Clerk -> browser with one-direction arrowheads. JWKS top connection must be Node backend -> Clerk labelled HTTPS GET issuer/.well-known/jwks.json, with a separate Clerk -> backend public signing keys response; do not depict request going in both directions. POST /api/users/sync remains browser -> backend; user-row JSON backend -> browser. In LOWER phase make JSON responses arrowhead clearly point back to dashboard, not backend, and remove arrowheads from annotation-only lines. Keep all GET polling requests browser -> backend, backend/store/Supabase relationships, and POLL EVERY 3000 ms. Remove the top-left numbered section title, leaving white space; keep phase separation readable without a large heading. No other new components or content.
```

### Final regeneration prompt

The first edit did not resolve incorrect routing. This prompt produced the selected final image.

```text
Create ONE 16:9 landscape image in Ian Xiaohei hand-drawn technical illustration style: pure white, thin irregular black pen, black bean creature with white dot eyes operating the backend identity check, orange requests, blue responses, sparse red notes, legible English labels, no title, no shadows, no texture. This is a precise WatchTower authentication and polling sequence. Use ONLY FOUR well-spaced VERTICAL COLUMNS, headed left to right "Dashboard browser", "Clerk", "Node backend", "Event store". Use dashed vertical lifelines. The Event store column may include tiny drawers labelled app_users and prototype3_events; it means Supabase when configured or memory otherwise. No separate unlabeled boxes. High resolution for readability.
Arrange the following numbered-in-prompt steps TOP TO BOTTOM. DO NOT print step numbers. Every arrow connects the named lifelines with a single arrowhead at the DESTINATION. Text can be compact but must be exact.
1. Dashboard browser -> Node backend: "GET /login/ + /dashboard". This long arrow CROSSES the Clerk lifeline WITHOUT connecting to Clerk. Node backend -> Dashboard browser: "HTML, JS, Clerk publishable key". Again crosses Clerk WITHOUT a connection.
2. Dashboard browser -> Clerk: "Clerk sign-in". Clerk -> Dashboard browser: "Session JWT (getToken)".
3. Dashboard browser -> Node backend: "POST /api/users/sync • Bearer JWT". Crosses Clerk without connecting.
4. Node backend -> Clerk: "GET /.well-known/jwks.json". Clerk -> Node backend: "Public signing keys (cached)".
5. Beside Node backend only a concise note "Verify signature, issuer, time claims + exp; userId = sub". Xiaohei is actively examining the JWT at this point. Red note "Invalid token: 401".
6. Node backend -> Event store: "Upsert app_users by clerk_user_id". Small blue note "User sync is fire-and-forget".
7. In lower half a loose hand-drawn loop bracket labelled "Initial load + every 3000 ms + manual refresh". Inside it:
Dashboard browser -> Node backend: "Bearer JWT + parallel GET requests" with a 3-line label:
"GET /api/stats"
"GET /api/events?limit=600"
"GET /api/developer/insights"
Node backend -> Event store: "Query prototype3_events: user_id = sub"
Event store -> Node backend: "Matching rows + counts"
Node backend -> Dashboard browser: "JSON to render"
Dashboard browser -> Node backend: "Developer mode: GET /api/developer/stream (JSON)"
Keep all these long browser/backend arrows crossing Clerk with no connection dot and no arrowhead at Clerk.
Below loop add small red note "POLLING — NO SSE / WEBSOCKETS".
Three short bottom footnotes in blue: "No session: redirect /login/" | "Memory mode: filter event.userId; no user table" | "Production requires JWT; header trust is fallback only".
Critical: login/dashboard static files come from Node backend, NEVER Clerk. Clerk is used only for authentication/session and JWKS public keys. Browser NEVER queries store directly. Store DOES NOT push; all reads are polling. Ensure final JSON response has arrowhead at dashboard on LEFT, not backend. Avoid duplicated participant columns and avoid arrows terminating on label text. All labels English, exact identifiers. Preserve generous margins.
```

## Backend module map

Final image: `04-backend-module-map.png`

### Initial prompt

```text
Use case: infographic-diagram. Create ONE standalone 16:9 landscape raster image, high resolution with legible technical labels. This is a faithful illustrated conversion of one WatchTower architecture diagram, in the requested Ian Xiaohei illustration style.
VISUAL STYLE: Pure white #ffffff background, spare black slightly wobbly pen linework, generous white space. Orange for main arrows, blue for secondary/auth/read paths, red only for important caveats. No gradients, shadows, textures, realistic UI, glossy art, marketing infographic cards, thick borders, or cute mascots. Use a small solid-black irregular bean creature Xiaohei with white dot eyes, thin legs/arms, deadpan expression, actively performing the core action. It represents the existing code operation, NEVER an extra software component. No large title or type heading in the top-left. Keep the layout calm and readable, using English for all labels since source is English; preserve exact identifiers and endpoints. This user specifically asks to convert technical diagrams: accuracy, arrow direction, all essential components, and readable labels take priority over the style guide's usual sparse metaphor-only rules. Do not invent services or tables. Do not put Mermaid code syntax in the image. Use original understated physical metaphors, not stock flowchart clip art.

COMPOSITION AND REQUIRED FACTS:
Create a clear hand-drawn module dependency sketch with all FOUR files under src/backend: server.js (HTTP, static files, auth, API routes, developer logic), server-helpers.js (pure validation, normalization, math, filters), event-store.js (Supabase or memory, user sync, analytics, retention), README.md (documentation only). Use solid directed arrows for require imports: server.js -> server-helpers.js; server.js -> event-store.js; event-store.js -> server-helpers.js; server.js -> jose labelled JWT/JWKS; server.js -> Node built-ins labelled http/fs/path; event-store.js -> Node built-ins labelled path/crypto; event-store.js -> dotenv labelled env; event-store.js -> @supabase/supabase-js labelled createClient. Dashed document arrows README.md -> the three JS files. Dashed static-serving arrows from server.js to src/frontend/* and src/sdk/watchtower.js (GET /sdk/watchtower.js). A separate isolated shared/utils/event-utils.js with red annotation NOT IMPORTED; never draw a dependency to it. Put a tiny legend solid = require, dashed = docs/static files. Xiaohei physically balances the server's three imported module connectors as if operating a switchboard, actively encoding dependency relationships; it isn't an extra node. No invented backend files or folders, no network databases in this image (library dependency only). Keep paths exact and very legible.

SOURCE MERMAID TO CONVERT (authoritative relationships):
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

### Revision prompt

```text
Edit this backend module-map illustration with one precise connector correction, preserving every node, label, arrow, image size, white background, Xiaohei, and style. The blue dashed arrow labelled Documents HTTP and auth must start at README.md and extend all the way to terminate on the BOTTOM EDGE of the server.js box. Currently it stops in empty space between server-helpers.js and event-store.js. Extend this connector vertically through that gap until it touches server.js, with its arrowhead at server.js. Maintain separation from solid orange dependency lines. Do not change the other connections or any labels.
```
