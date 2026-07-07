# Career And Libretto

This module exposes the student's academic career and official libretto.

## API

- `GET /api/students/me/career`
  - Returns student identity, program information, calculated career summary, and published libretto entries.
  - Optional query params:
    - `semester=1|2`
    - `courseYear=1..6`
- `GET /api/students/me/grades`
  - Backward-compatible endpoint returning only libretto entries.
- `POST /api/students/me/libretto/pdf`
  - Generates a PDF libretto from published grades.

## Career Summary

The API calculates:

- passed exams
- earned CFU
- total CFU
- CFU progress percentage
- arithmetic mean
- weighted mean by CFU
- estimated Italian laurea start score on a 110 scale

## Web

- `packages/web/lib/hooks/useLibretto.ts`
  - `useStudentCareer()` fetches `/api/students/me/career`.
  - `useLibretto()` remains available and maps to the career response's `libretto` field.
- `packages/web/components/student/LibrettoPage.tsx`
  - Uses the API career summary.
  - Demo rows are shown only when `NEXT_PUBLIC_DEMO_MODE=true`.

## Mobile

- `packages/mobile/app/(student)/libretto.tsx`
  - Fetches `/api/students/me/career` through `apiFetch`.
  - Displays student identity, CFU progress, exams count, weighted/arithmetic means, laurea estimate, and published libretto entries.

## Tests

Run:

```bash
npm.cmd --workspace @unigest/api test
```

Covered calculation rules:

- `30L` normalization
- arithmetic mean
- weighted mean by CFU
- earned CFU
- CFU progress percentage
- laurea start score
