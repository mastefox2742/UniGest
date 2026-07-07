# Appelli And Prenotazioni

This module covers exam sessions and student bookings.

## Roles

- `student`: list available sessions, book an exam, cancel an active booking.
- `teacher`: create sessions for owned courses, list bookings for a session.
- `secretary`: list sessions and bookings.
- `admin`: list sessions/bookings and create sessions.

## API

### Student

- `GET /api/exams/available`
  - Returns exam sessions open for booking for the authenticated student's degree program.
- `GET /api/exams/my-bookings`
  - Returns active bookings for the authenticated student.
- `POST /api/exams/:examId/book`
  - Books an exam session.
- `DELETE /api/exams/:examId/book`
  - Cancels an active booking before the registration deadline.

### Teacher/Admin

- `GET /api/exams/courses/:courseId/exams`
  - Lists sessions for a course.
- `POST /api/exams/courses/:courseId/exams`
  - Creates an exam session.
- `GET /api/exams/:examId/bookings`
  - Lists bookings for an exam session.

### Verbale And Grades

- `GET /api/grades/exams/:examId/verbale`
  - Returns the electronic verbale with bookings and grades.
- `POST /api/grades/exams/:examId/grades`
  - Proposes or updates a grade for a booking in the selected exam session.
- `POST /api/grades/exams/:examId/publish`
  - Publishes a complete verbale.
- `GET /api/grades/me/pending`
  - Lists proposed grades waiting for student response.
- `POST /api/grades/:gradeId/accept`
  - Student accepts a proposed grade.
- `POST /api/grades/:gradeId/refuse`
  - Student refuses a proposed grade.

## Business Rules

- The registration deadline must be before the exam date.
- Students cannot book after the registration deadline.
- Students cannot keep two active bookings for the same exam session.
- Capacity is enforced when `max_students` is set.
- Students cannot book another exam inside the configured conflict window, currently 120 minutes.
- Students cannot cancel after the registration deadline.
- Grades must be integers from 18 to 30.
- `30L` is valid only when the numeric grade is 30.
- Accepted and published grades cannot be edited by teachers.
- A verbale can be published only when every active booking has a proposed or accepted grade.
- A verbale containing rejected grades cannot be published.

## Database

Migration `supabase/migrations/00010_exam_booking_guards.sql` adds:

- `exam_sessions_registration_before_date` check constraint.
- Indexes for course/date lookup, registration deadlines, active session bookings, and student booking lists.
- `exam_session_booking_counts` view for active booking counts and available seats.

Migration `supabase/migrations/00011_grade_verbale_guards.sql` adds:

- honors and status/timestamp check constraints on `grades`.
- indexes for verbale lookup, booking grade lookup, and pending student grades.

## Tests

Run:

```bash
npm --workspace @unigest/api test
```

Covered rules:

- valid booking
- expired deadline
- full capacity
- duplicate active booking
- cancelled booking reactivation
- schedule conflict
- cancellation before/after deadline
- valid and invalid grade values
- honors validation
- accepted/published grade immutability
- verbale publication completeness
