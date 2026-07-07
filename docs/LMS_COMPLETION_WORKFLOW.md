# LMS Completion Workflow

Phase 6.1 completes the existing e-learning module with persistent announcements and normalized progress summaries.

## Scope

- Teachers publish announcements for an e-learning course.
- Students see course announcements in the course player.
- Student course lists include real progress summaries based on completed materials.
- Material progress is normalized to `0..100`.
- Mobile students can launch and submit published quizzes.
- Mobile students can read course forum threads and post replies.
- Mobile students can submit or update assignment work with text content and an optional file URL.
- Student quiz payloads never expose `is_correct` flags before submission.

## API

- `POST /api/elearning/courses/:ecId/announcements`
- `GET /api/quiz/:quizId` returns a sanitized quiz payload for students.
- `POST /api/quiz/:quizId/start`
- `POST /api/quiz/attempts/:attemptId/submit`
- `GET /api/quiz/:quizId/attempts`
- `GET /api/forum/courses/:ecId`
- `POST /api/forum/courses/:ecId`
- `DELETE /api/forum/posts/:postId` only allows staff or the post author.
- `POST /api/elearning/assignments/:assignmentId/submit`
- Student course detail payloads include `my_submission` for each assignment.
- Existing student course endpoints now include:
  - `progress_summary` in `GET /api/elearning/student/courses`
  - `progressSummary` in `GET /api/elearning/student/courses/:ecId`
  - `elearning_announcements` in teacher/student course payloads

## Data Model

Migration `supabase/migrations/00019_elearning_announcements_progress.sql` adds:

- `elearning_announcements`
- announcement indexes by course and publish date
- a student progress index by `last_seen_at`
- RLS policies for published course reads and teacher/admin writes

## Rules

Rules live in `packages/api/src/services/elearning-rules.ts`.

- Progress percentages are clamped and rounded.
- Course progress is summarized from material completion.
- Announcement title/body length and presence are validated.

## Web

Teacher:

- `packages/web/components/teacher/ElearningEditor.tsx`
- Adds an `Annonces` tab.

Student:

- `packages/web/components/student/CoursePlayer.tsx`
- Adds an `Annonces` tab.
- `packages/web/components/student/ElearningCourseList.tsx`
- Displays progress from `progress_summary`.

Mobile student:

- `packages/mobile/app/(student)/courses.tsx`
- Displays progress summaries and opens a mobile course detail.
- `packages/mobile/app/(student)/course-detail.tsx`
- Shows content sections, announcements, assignments, quizzes, forum threads, and lets students mark materials complete.
- Quiz UI supports starting an attempt, selecting answers, submitting, and reviewing latest attempt status.
- Forum UI supports top-level posts and replies.
- Assignment UI supports rendering content, optional file URL, last submission status, score, and teacher feedback.

Security:

- `packages/api/src/services/quiz-rules.ts` strips correctness flags from student quiz payloads.
- `packages/api/src/__tests__/quiz-rules.test.ts` covers this behavior.
- `packages/api/src/services/forum-rules.ts` restricts post deletion to staff or the author.
- `packages/api/src/services/elearning-rules.ts` validates assignment submission content.

## Verification

- `npm.cmd --workspace @unigest/api test`
- `npm.cmd --workspace @unigest/api run build`
- `npm.cmd --workspace @unigest/web run type-check`
- `npm.cmd --workspace @unigest/mobile run type-check`
