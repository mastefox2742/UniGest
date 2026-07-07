# Internships / Tirocini Workflow

Phase 6.2 adds the first auditable internship workflow.

## Scope

- Staff creates internship opportunities with company, dates, CFU, tutor, deadline, and publication status.
- Students list open opportunities and submit one application per opportunity.
- Staff updates application status through guarded transitions.
- Students submit a report URL after approval/start.
- Staff records an evaluation score and feedback.

## API

- `GET /api/internships/opportunities?status=open`
- `POST /api/internships/opportunities`
- `GET /api/internships/me`
- `POST /api/internships/apply`
- `GET /api/internships/applications?status=submitted`
- `PATCH /api/internships/applications/:id/status`
- `POST /api/internships/applications/:id/report`
- `POST /api/internships/applications/:id/evaluate`

## Statuses

Opportunities:

- `draft`
- `open`
- `closed`

Applications:

- `submitted`
- `approved`
- `in_progress`
- `report_submitted`
- `evaluated`
- `closed`
- `refused`

Allowed transitions are enforced in `packages/api/src/services/internship-rules.ts`.

## Data Model

Migration `supabase/migrations/00017_internships_workflow.sql` adds:

- `internship_opportunities`
- `internship_applications`
- enum types for opportunity/application statuses
- indexes for staff and student views
- RLS policies for own student applications and staff operations

## Web

Student surface:

- `/student/internships`
- `packages/web/components/student/InternshipsPage.tsx`
- `packages/web/lib/hooks/useStudentInternships.ts`

The page supports opportunity browsing, application submission, application tracking, and report URL submission.

Admin surface:

- `/admin/internships`
- `packages/web/components/admin/AdminInternships.tsx`
- `packages/web/lib/hooks/useAdminInternships.ts`

The page supports opportunity creation, application filtering, guarded status transitions, report access, and final evaluation.

## Verification

- `npm.cmd --workspace @unigest/api test`
- `npm.cmd --workspace @unigest/api run build`
- `npm.cmd --workspace @unigest/web run type-check`
