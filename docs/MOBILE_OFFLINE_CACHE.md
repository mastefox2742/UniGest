# Mobile Offline Cache

Phase 5 adds a lightweight read-through cache for student mobile screens.

## Scope

Cached screens:

- `packages/mobile/app/(student)/libretto.tsx`
- `packages/mobile/app/(student)/exams.tsx`
- `packages/mobile/app/(student)/fees.tsx`
- `packages/mobile/app/(student)/certificates.tsx`

The cache uses `@react-native-async-storage/async-storage` through `packages/mobile/lib/offlineCache.ts`.

## Behavior

- The app always tries the API first.
- Successful GET responses are stored locally with `updatedAt`.
- If the API request fails, the screen falls back to the last local copy.
- Cached data is clearly marked with a local/offline banner and last sync time.
- Mutating actions such as exam booking, cancellation, and certificate requests still require a live API call.

## Verification

- `npm.cmd --workspace @unigest/mobile run type-check`
