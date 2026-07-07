'use client'

import Link from 'next/link'
import { useStudentElearningCourses } from '@/lib/hooks/useElearning'

function CourseSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  )
}

export function ElearningCourseList() {
  const { data: courses, isLoading } = useStudentElearningCourses()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map(i => <CourseSkeleton key={i} />)}
      </div>
    )
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Aucun cours e-learning disponible pour le moment.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((ec: any) => {
        const course   = ec.courses as any
        const teacher  = course?.teachers as any
        const profile  = teacher?.profiles as any
        const sections = (ec.elearning_sections as any[]) ?? []
        const materials = (ec.elearning_materials as any[]) ?? []
        const progress = ec.progress_summary as { completed?: number; total?: number; progressPct?: number } | undefined
        const progressPct = progress?.progressPct ?? 0

        return (
          <Link
            key={ec.id}
            href={`/student/courses/${ec.id}`}
            className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
          >
            {ec.thumbnail_url ? (
              <img
                src={ec.thumbnail_url}
                alt={course?.name}
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
            ) : (
              <div className="w-full h-32 rounded-lg mb-4 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-4xl">📚</span>
              </div>
            )}

            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
              {course?.name ?? 'Cours'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {course?.code} • {course?.cfu} CFU
            </p>

            {profile && (
              <p className="text-xs text-muted-foreground mt-1">
                Prof. {profile.last_name ?? ''} {profile.first_name ?? ''}
              </p>
            )}

            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>📂 {sections.length} section(s)</span>
              <span>📎 {materials.length} matériaux</span>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progression</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
              </div>
              {progress ? (
                <p className="text-right text-[10px] text-muted-foreground">
                  {progress.completed ?? 0}/{progress.total ?? 0} termines
                </p>
              ) : null}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
