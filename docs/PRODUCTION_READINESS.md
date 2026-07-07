# Production Readiness

UniGest is functionally close to a staging release. Production still requires operational hardening.

## Release Gates

- All code committed and reviewed.
- `npm run verify:demo` passes locally and in CI.
- Supabase migrations `00001` through `00020` applied on staging.
- RLS policies reviewed on staging with student/teacher/admin accounts.
- `send-push` Edge Function deployed and tested.
- Web demo mode disabled in production.
- Sentry, logs, backups, and rollback procedures configured.

## Required Commands

```bash
npm --workspace @unigest/api test
npm --workspace @unigest/api run build
npm --workspace @unigest/web run type-check
npm --workspace @unigest/mobile run type-check
```

## Environment Checklist

Production must define:

- `NODE_ENV=production`
- `NEXT_PUBLIC_DEMO_MODE=false`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`
- `PUBLIC_APP_URL`
- `SUPABASE_FUNCTIONS_URL`
- `SENTRY_DSN`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `REQUIRE_MFA=true` for staff/admin launch

Never expose `SUPABASE_SERVICE_ROLE_KEY` to web/mobile clients.

## Staging Checklist

- Create fresh staging Supabase project.
- Apply all migrations.
- Deploy `send-push`.
- Seed demo/staging users.
- Verify storage buckets: `documents`, `avatars`.
- Verify private document access and certificate QR validation.
- Run smoke tests for student, teacher, admin roles.

## Smoke Test Matrix

Student:

- login;
- career/libretto;
- exam booking/cancel;
- grade response;
- fees and certificates;
- thesis/graduation;
- LMS content, assignment, quiz, forum;
- internships;
- alumni survey;
- notifications.

Teacher:

- course detail;
- exam session and bookings;
- grade publication/verbale;
- LMS content/assignments/quizzes/announcements.

Admin:

- students/back-office;
- fees/certificates;
- audit logs;
- reports/export;
- internships;
- alumni placement.

## Rollback Plan

- Keep database backup before migration.
- Deploy API and web with immutable release IDs.
- If a migration fails, stop deployment and restore staging/prod backup.
- If web/API fails after deploy, roll back platform deployment first, then investigate DB compatibility.
- If push fails, disable push dispatch while keeping in-app notifications active.

## Current Open Items

- Validate `supabase/functions/send-push/index.ts` with Deno or Supabase CLI.
- Replace mobile EAS placeholders with real project values.
- Run end-to-end tests on staging.
- Decide final production hosting targets and domains.
