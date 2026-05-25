import { Router } from 'express'
import { authRouter } from './auth.routes'

export const router = Router()

router.get('/ping', (_req, res) => res.json({ message: 'pong' }))

router.use('/auth', authRouter)

// À venir Phase 1+
// router.use('/students',  studentsRouter)
// router.use('/teachers',  teachersRouter)
// router.use('/courses',   coursesRouter)
// router.use('/exams',     examsRouter)
// router.use('/grades',    gradesRouter)
// router.use('/fees',      feesRouter)
// router.use('/thesis',    thesisRouter)
// router.use('/documents', documentsRouter)
// router.use('/dashboard', dashboardRouter)
