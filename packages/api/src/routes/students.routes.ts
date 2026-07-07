import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { getCareer, getDashboard, getGrades, exportLibrettoPdf } from '../controllers/students.controller'

export const studentsRouter = Router()

// Toutes les routes /api/students nécessitent d'être étudiant
studentsRouter.use(authMiddleware)
studentsRouter.use(requireRole('student'))

/** GET /api/students/me/dashboard */
studentsRouter.get('/me/dashboard', getDashboard)

/** GET /api/students/me/career */
studentsRouter.get('/me/career', getCareer)

/** GET /api/students/me/grades */
studentsRouter.get('/me/grades', getGrades)

/** POST /api/students/me/libretto/pdf */
studentsRouter.post('/me/libretto/pdf', exportLibrettoPdf)
