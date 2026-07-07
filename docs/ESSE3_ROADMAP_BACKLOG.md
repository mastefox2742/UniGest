# UniGest ESSE3/Alice Roadmap Backlog

This document turns the ESSE3/Alice roadmap into an implementation backlog for the UniGest monorepo.

## Delivery Principles

- Implement feature by feature, not as a large rewrite.
- Extend existing schema, routes, components, and shared types before creating parallel systems.
- Keep `packages/shared` as the source for cross-app DTOs, enums, and constants.
- Add Supabase migrations under `supabase/migrations` with RLS, indexes, and seed-safe changes.
- For every major feature, deliver database changes, API routes, web UI, mobile screen, tests, and short docs.
- Preserve multi-tenant readiness with `tenant_id` on new business tables and tenant-aware access checks.

## Phase 0: Foundation And Architecture

Goal: make the platform secure, tenant-aware, observable, and ready for larger ESSE3-like modules.

### Epic 0.1: Auth, Roles, And Tenant Context

User stories:

- As an admin, I can assign a user to a tenant and role.
- As the API, I can resolve the authenticated user's tenant and role for every protected request.
- As a web or mobile user, I am redirected to the correct area after login.

Acceptance criteria:

- `staff` role is added alongside `student`, `teacher`, `secretary`, and `admin`.
- User profile records are linked to a tenant.
- Protected API routes reject missing or inconsistent tenant context.
- Web and mobile login flows continue to work.

Implementation notes:

- Add or normalize `tenants`, `profiles.tenant_id`, and role constants.
- Add shared tenant-aware auth types.
- Extend API auth/RBAC middleware.
- Update web redirects and mobile session bootstrap.

### Epic 0.2: Multi-Tenant Database Baseline

User stories:

- As a platform admin, I can host multiple universities or campuses in the same database.
- As a tenant user, I can only access data belonging to my tenant.

Acceptance criteria:

- Core business tables have `tenant_id` or derive tenant ownership through a strict parent relationship.
- RLS policies enforce tenant isolation.
- Tenant indexes exist on high-volume tables.
- Existing seed data remains usable.

Implementation notes:

- Start with the most-used tables: profiles, students, teachers, courses, exams, grades, fees, certificates, theses.
- Prefer additive migrations and backfill existing rows from current university data.

### Epic 0.3: Audit Trail

User stories:

- As an admin, I can inspect sensitive changes made to academic, finance, and identity records.
- As the system, I store who changed what, when, and from which module.

Acceptance criteria:

- `audit_logs` table exists with tenant, actor, action, resource, before, after, and request metadata.
- Critical API mutations write audit records.
- Admin users can query audit logs through a protected endpoint.

Implementation notes:

- Add a small API audit service reused by feature modules.
- Avoid logging secrets, tokens, or full document contents.

## Phase 1: Career And Exams MVP

Goal: deliver the core student career, libretto, exam booking, and grading flows.

### Epic 1.1: Student Career And Libretto

User stories:

- As a student, I can see my degree program, academic year, CFU progress, GPA, and passed exams.
- As a secretary, I can inspect a student's career and study plan.
- As the system, I can calculate GPA and CFU progress consistently.

Acceptance criteria:

- API exposes `/career` and `/grades` endpoints for the authenticated student.
- Web page `/student/career` shows libretto, GPA, CFU progress, and academic status.
- Mobile screen shows the same read-only career summary.
- Shared types cover career summary, grade rows, and GPA/CFU DTOs.
- Tests cover GPA/CFU calculations and authorization.

Dependencies:

- Phase 0 tenant context should be in place or explicitly stubbed for current single-tenant data.

### Epic 1.2: Appelli And Prenotazioni

User stories:

- As a student, I can see available exam sessions and book or cancel before the deadline.
- As a teacher, I can see bookings for my exam sessions.
- As the system, I prevent overbooking, duplicate bookings, and schedule conflicts.

Acceptance criteria:

- API exposes `/exams` and `/exam-bookings` flows with Zod validation.
- Booking logic enforces capacity, registration deadline, cancellation deadline, and duplicate prevention.
- Web page `/student/exams` supports list, filters, booking, and cancellation.
- Web page `/teacher/exams` shows sessions and bookings.
- Mobile screen supports exam list and booking status.
- Tests cover booking capacity, deadline, conflicts, and RBAC.

Dependencies:

- Existing `exam_sessions` and `exam_bookings` tables.
- Current `exams.routes.ts` and related services should be extended rather than replaced.

### Epic 1.3: Grades And Verbali

User stories:

- As a teacher, I can enter and publish exam results.
- As a student, I can see published grades and optionally accept or reject a grade.
- As a secretary, I can audit grade publication and finalization.

Acceptance criteria:

- API supports session results through `/exam-sessions/:id/results` or an equivalent existing route.
- Grade state transitions are validated.
- Published grades update career summaries.
- Web UI displays results to students and teacher-side verbale tables.
- Tests cover publication and invalid transitions.

## Phase 2: Finance And Certificates

Goal: deliver tuition fees, payments, scholarships, receipts, certificates, and transcripts.

### Epic 2.1: Tasse And Contributi

User stories:

- As a student, I can see pending, paid, overdue, and waived fees.
- As a secretary, I can create and manage fee schedules.
- As the system, I can calculate fees by academic year and student status.

Acceptance criteria:

- API exposes `/fees` and fee schedule management.
- Web page `/student/fees` shows balance, deadlines, and receipts.
- Secretary/admin page supports fee management.
- Mobile fees screen provides read-only status and receipt download.
- Tests cover fee status transitions and calculation rules.

### Epic 2.2: Payments And Receipts

User stories:

- As a student, I can initiate a payment through an abstract provider.
- As a finance admin, I can reconcile payment status.
- As the system, I can generate receipts with QR validation.

Acceptance criteria:

- Provider abstraction supports PagoPA, bank transfer, and Mobile Money placeholders.
- Payment records are idempotent and auditable.
- Receipt generation is linked to payment status.
- Tests cover payment callback idempotency.

### Epic 2.3: Certificates And Transcript

User stories:

- As a student, I can request enrollment certificates and transcripts.
- As an external verifier, I can validate a certificate through a QR code.
- As an admin, I can manage certificate templates.

Acceptance criteria:

- API exposes `/certificates`.
- PDF generation includes certificate metadata and QR validation token.
- Web and mobile allow certificate listing and download.
- Verification endpoint returns validity without exposing private student data.

## Phase 3: Laurea And Tesi

Goal: manage graduation requests, thesis workflows, commissions, and final records.

### Epic 3.1: Domanda Di Laurea

User stories:

- As a student, I can submit a graduation request.
- As a secretary, I can approve, reject, or request changes.
- As the system, I check prerequisites before submission.

Acceptance criteria:

- Graduation workflow states are explicit and validated.
- API exposes `/graduation`.
- Web pages exist for student and secretary flows.
- Tests cover prerequisite checks and state transitions.

### Epic 3.2: Thesis Workflow

User stories:

- As a student, I can propose or track a thesis.
- As a teacher, I can approve and supervise thesis work.
- As a secretary, I can coordinate thesis defense sessions.

Acceptance criteria:

- Existing thesis module is extended with proposals and supervisors where needed.
- Student and teacher thesis pages support the workflow.
- API authorization separates student, teacher, and secretary actions.

## Phase 4: Segreteria And Reporting

Goal: create a full back office and decision-support reporting layer.

### Epic 4.1: Segreteria Back Office

User stories:

- As a secretary, I can manage enrollments, transfers, student statuses, and study plans.
- As an admin, I can review sensitive changes.

Acceptance criteria:

- Admin career and enrollment endpoints exist.
- Web back office supports search, filters, and controlled edits.
- Every sensitive mutation writes an audit log.

### Epic 4.2: Reporting And Legal Export

User stories:

- As leadership, I can see success, dropout, average duration, and course occupancy metrics.
- As an admin, I can export legal/statistical files.

Acceptance criteria:

- Reporting endpoints return tenant-scoped aggregates.
- Admin dashboards visualize key indicators.
- Export jobs are auditable and reproducible.

## Phase 5: Advanced Mobile And Offline

Goal: make the mobile app useful with weak connectivity.

### Epic 5.1: Offline Career And Exams

User stories:

- As a student, I can consult career, exams, fees, and downloaded certificates offline.
- As the app, I can sync pending actions when connectivity returns.

Acceptance criteria:

- Local cache exists for read-heavy student data.
- Sync metadata tracks freshness and pending actions.
- Offline UI clearly separates cached data from live data.

Delivered baseline:

- Mobile read-through cache for career/libretto, exams, fees, and certificates.
- Cached screens show an offline banner with last successful sync time.
- Mutating actions remain online-only.

### Epic 5.2: Push Notifications

User stories:

- As a student, I receive deadline, result, fee, and announcement notifications.
- As the system, I can target notifications by tenant and role.

Acceptance criteria:

- Push token registration is tenant-aware.
- Supabase Edge Function can send scenario-based notifications.
- Mobile handles notification navigation.

## Phase 6: E-Learning, Internships, And Alumni

Goal: complete the platform with LMS, internships, and alumni/placement.

### Epic 6.1: LMS Completion

User stories:

- As a teacher, I can publish resources, assignments, quizzes, and announcements.
- As a student, I can track course progress.

Acceptance criteria:

- Existing e-learning modules are consolidated with progress tracking.
- Web and mobile expose consistent course learning views.

### Epic 6.2: Stage And Tirocini

User stories:

- As a student, I can apply for internship opportunities.
- As a company or staff member, I can evaluate internship progress.

Acceptance criteria:

- Internship agreements, reports, and evaluations are modeled.
- Student and staff workflows are auditable.

### Epic 6.3: Alumni And Placement

User stories:

- As an alumnus, I can maintain a profile.
- As the university, I can track placement outcomes.

Acceptance criteria:

- Alumni profile and survey models exist.
- Reporting includes employment outcomes.

## Recommended Implementation Order

1. Phase 0 tenant and RBAC baseline.
2. Career and libretto read model.
3. Exam booking rules.
4. Grade publication and verbali.
5. Fees and receipts.
6. Certificates and transcript with QR validation.
7. Graduation and thesis workflows.
8. Segreteria back office and audit expansion.
9. Reporting and legal export.
10. Mobile offline and notifications.
11. LMS completion, internships, and alumni.

## First Sprint Candidate

Recommended first sprint: Phase 1, Epic 1.2 Appelli And Prenotazioni, because the existing repository already has `exam_sessions`, `exam_bookings`, exam routes, student exam UI, teacher exam UI, and mobile student exam screens. This makes it the fastest path to a visible ESSE3-like workflow while still exercising DB, API, web, mobile, and tests.
