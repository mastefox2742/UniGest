import { Router } from 'express'
import { authRouter }          from './auth.routes'
import { studentsRouter }      from './students.routes'
import { enrollmentRouter }    from './enrollment.routes'
import { coursesRouter }       from './courses.routes'
import { examsRouter }         from './exams.routes'
import { gradesRouter }        from './grades.routes'
import { feesRouter }          from './fees.routes'
import { certificatesRouter }  from './certificates.routes'
import { notificationsRouter } from './notifications.routes'
import { elearningRouter }    from './elearning.routes'
import { quizRouter }         from './quiz.routes'
import { forumRouter }        from './forum.routes'

export const router = Router()

router.get('/ping', (_req, res) => res.json({ message: 'pong' }))

// Phase 1 — Auth & Immatriculation
router.use('/auth',        authRouter)
router.use('/students',    studentsRouter)
router.use('/students',    enrollmentRouter)

// Phase 2 — Cœur Académique
router.use('/teachers',    coursesRouter)
router.use('/exams',       examsRouter)
router.use('/grades',      gradesRouter)

// Phase 3 — Administration & Finances
router.use('/fees',          feesRouter)
router.use('/certificates',  certificatesRouter)
router.use('/notifications', notificationsRouter)

// Phase 4 — E-Learning
router.use('/elearning',     elearningRouter)
router.use('/quiz',          quizRouter)
router.use('/forum',         forumRouter)

// Phase 5 — Thèse & Finalisation
import { thesisRouter }     from './thesis.routes'
router.use('/thesis',        thesisRouter)

// Phase 6 — Back-office Admin
import { roomsRouter }      from './rooms.routes'
import { calendarRouter }   from './calendar.routes'
import { graduationRouter } from './graduation.routes'
import { missionsRouter }   from './missions.routes'
import { programsRouter }   from './programs.routes'
import { reportsRouter }    from './reports.routes'
import { auditRouter }      from './audit.routes'
import { internshipsRouter } from './internships.routes'
import { alumniRouter }     from './alumni.routes'

router.use('/rooms',         roomsRouter)
router.use('/calendar',      calendarRouter)
router.use('/graduation',    graduationRouter)
router.use('/missions',      missionsRouter)
router.use('/programs',      programsRouter)
router.use('/reports',       reportsRouter)
router.use('/audit',         auditRouter)
router.use('/internships',   internshipsRouter)
router.use('/alumni',        alumniRouter)

// Phase 7 — RGPD (Articles 15, 16, 17, 20)
import { gdprRouter } from './gdpr.routes'
router.use('/gdpr', gdprRouter)
