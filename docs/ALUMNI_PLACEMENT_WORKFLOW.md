# Alumni And Placement Workflow

Phase 6.3 adds the first alumni and employment outcome model.

## Scope

- Students maintain their own alumni profile.
- Alumni submit one placement survey per year.
- Staff can list alumni profiles and review employment outcomes.
- Reporting includes employment rate, sectors, contract types, and survey breakdowns.

## API

- `GET /api/alumni/me`
- `PUT /api/alumni/me`
- `POST /api/alumni/me/surveys`
- `GET /api/alumni?graduationYear=2026`
- `GET /api/alumni/placement/stats`

## Data Model

Migration `supabase/migrations/00018_alumni_placement.sql` adds:

- `alumni_profiles`
- `placement_surveys`
- `alumni_employment_status` enum
- RLS policies for own alumni data and staff reads
- placement indexes by year, status, and sector

## Rules

Rules live in `packages/api/src/services/alumni-rules.ts`.

- Employed or self-employed alumni must provide a company or job title.
- Employment dates cannot be in the future.
- Salary ranges are normalized and constrained.
- Placement outcome metrics are computed from surveys.

## Web

Student surface:

- `/student/alumni`
- `packages/web/components/student/AlumniProfilePage.tsx`
- `packages/web/lib/hooks/useStudentAlumni.ts`

The page supports alumni profile updates, placement consent, and annual placement survey submission.

Mobile student surface:

- `packages/mobile/app/(student)/alumni.tsx`
- Hidden route exposed from the student dashboard quick actions.

The mobile screen supports alumni profile updates, placement consent, and annual placement survey submission.

Admin surface:

- `/admin/alumni`
- `packages/web/components/admin/AdminAlumniPlacement.tsx`
- `packages/web/lib/hooks/useAdminAlumni.ts`

Reporting:

- `/admin/reports` now exposes a `Placement` tab.

## Verification

- `npm.cmd --workspace @unigest/api test`
- `npm.cmd --workspace @unigest/api run build`
- `npm.cmd --workspace @unigest/web run type-check`
