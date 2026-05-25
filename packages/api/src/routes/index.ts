import { Router } from 'express'

export const router = Router()

// ─── Health ───────────────────────────────────────────────────────────────────
router.get('/ping', (_req, res) => {
  res.json({ message: 'pong' })
})

// ─── À venir (Phase 1) ────────────────────────────────────────────────────────
// router.use('/auth',      authRouter)
// router.use('/students',  studentsRouter)
// router.use('/teachers',  teachersRouter)
// router.use('/courses',   coursesRouter)
// router.use('/exams',     examsRouter)
// router.use('/grades',    gradesRouter)
// router.use('/fees',      feesRouter)
// router.use('/thesis',    thesisRouter)
// router.use('/documents', documentsRouter)
// router.use('/dashboard', dashboardRouter)
