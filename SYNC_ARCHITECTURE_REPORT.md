# Data Synchronization Audit

Date: 2026-06-23

## Scope

Scanned application code under `src/` and `backend/src/` for:

- `setInterval`
- periodic refresh loops
- timed background fetches
- polling-style sync logic
- WebSocket/socket code
- client-side and server-side refresh loops

Excluded generated and vendor content such as `dist/`, `backend/dist/`, `node_modules/`, and old runtime logs.

## Polling Mechanisms Found

### Removed

1. `src/app/App.tsx`
   - Previous behavior: a 2-second `setInterval` called a shared refresh routine that reloaded:
     - master data
     - workflow state
     - bookings
     - service bookings
   - Why it was unnecessary:
     - the database is now the primary source of truth
     - this loop created constant background reads even when nothing changed
     - the same datasets are already written through API/database flows
   - Replacement:
     - WebSocket invalidation events
     - selective API reload of only the changed resource
     - focus/visibility refresh fallback

### Retained

1. `src/app/App.tsx`
   - `window.setTimeout(..., 250)` around booking sync
   - `window.setTimeout(..., 250)` around service booking sync
   - Reason retained:
     - these are write debounces, not polling
     - they coalesce rapid UI edits before sending per-record CRUD writes
     - removing them would increase write chatter and race risk

2. `src/app/components/calendar/ConfirmationCountdown.tsx`
   - `setInterval(calculateTimeRemaining, 1000)`
   - Reason retained:
     - UI-only countdown
     - no API/database traffic
     - unrelated to persistence synchronization

### Retained Request-Driven Refresh Hooks

1. `src/app/App.tsx`
   - refresh on window `focus`
   - refresh on `visibilitychange`
   - Reason retained:
     - cheap recovery path after tab sleep, reconnect, or missed browser events
     - request-based, not constant polling

2. Local event refresh paths
   - `masterDataUpdated`
   - `workflowStateUpdated`
   - `storage`
   - Reason retained:
     - same-tab and cross-tab cache invalidation
     - zero background fetch load by themselves
     - still useful with local cache plus backend persistence

### Not Found

1. No server-side cron polling or recurring refresh jobs in `backend/src/`
2. No React Query `refetchInterval` usage
3. No periodic server fetch loops outside the removed `App.tsx` live sync interval

## Socket Architecture Implemented

### Principles

1. Database remains the source of truth.
2. REST API remains the read/write path.
3. WebSocket sends change notifications only.
4. Clients load initial state from API/database, then reload the affected resource after notification.

### Backend

Added:

- `backend/src/modules/realtime/realtime.module.ts`
- `backend/src/modules/realtime/realtime.service.ts`

Behavior:

1. The Nest HTTP server now accepts WebSocket upgrades on `/ws`.
2. Clients authenticate immediately after connect using the existing JWT.
3. After successful writes, backend services emit `resource.changed` notifications.
4. Notifications are broadcast to authenticated clients except the client that originated the write.

Changed backend write paths:

- `master-data` upsert emits `resource.changed`
- `app-state` upsert emits `resource.changed`
- `bookings` create/update/delete/bulk-sync emits `resource.changed`
- `service-bookings` create/update/delete/bulk-sync emits `resource.changed`

### Frontend

Added:

- `src/app/lib/liveSyncSocket.ts`
- `src/app/lib/clientInstance.ts`

Changed:

- `src/app/lib/apiBaseUrl.ts`
  - every API request now includes `X-VenueOps-Client-Id`
- `src/app/App.tsx`
  - removed the 2-second polling loop
  - subscribes once to live sync events
  - selectively reloads only the changed dataset

## Socket Events Added

### Connection events

- `connection.ready`
- `connection.authenticated`

### Data invalidation event

- `resource.changed`
  - `resource`: `master-data` | `workflow-state` | `bookings` | `service-bookings`
  - `action`: `upsert` | `delete` | `bulk-sync`
  - optional `key`
  - optional `recordId`
  - `timestamp`

## Why These Areas Use Real-Time Updates

### Good fit for sockets

1. Bookings
   - calendar conflicts and reservation status changes are multi-user and time-sensitive

2. Service bookings
   - shared operational schedule; users benefit from seeing external changes without manual refresh

3. Master data
   - setup changes affect active forms and selectors across tabs/users

4. Workflow state
   - kitchen, procurement, inventory, and finance screens reuse persisted shared datasets

### Better as request-based

1. Reports
   - usually read-on-demand, potentially heavy, and not worth constant live fan-out

2. Auth/session/profile fetches
   - request-based is sufficient

3. Low-volatility admin/reference screens
   - can load on entry and refresh on user action/focus

## Load and Safety Decisions

1. No duplicate listeners
   - frontend uses a singleton socket manager with subscription cleanup

2. Proper cleanup
   - socket subscription is removed on React effect cleanup
   - backend removes client entries on close/end/error

3. Reconnection handling
   - frontend reconnects with backoff
   - successful reconnect triggers a normal API refresh

4. Minimal load
   - no background 2-second read loop
   - no full-state push over socket
   - only changed resource is reloaded
   - origin client echo is suppressed using `X-VenueOps-Client-Id`

5. Compatibility
   - existing REST endpoints remain intact
   - existing local cache and storage event flows remain intact
   - legacy `frontend-sync` endpoints were retained for compatibility, but they are not the preferred live update path

## Architectural Conclusion

The application is now aligned with the intended model:

- database = source of truth
- API = authoritative read/write interface
- localStorage = client cache and offline-ish staging buffer
- WebSocket = invalidation and coordination channel only

This removes unnecessary steady-state polling while preserving safe recovery paths and current ERP behavior.
