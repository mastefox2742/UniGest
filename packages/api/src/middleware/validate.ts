import type { Request, Response, NextFunction } from 'express'
import { z, type ZodSchema } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Middleware de validation UUID sur les paramètres de route.
 * Protège contre les injections via des IDs malformés.
 *
 * Usage :
 *   router.get('/:id', validateParams('id'), handler)
 *   router.get('/:courseId/:examId', validateParams('courseId', 'examId'), handler)
 */
export function validateParams(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const param of paramNames) {
      const value = req.params[param]
      if (!value || !UUID_REGEX.test(value)) {
        return res.status(400).json({
          error:      'Bad Request',
          message:    `Paramètre invalide : "${param}" doit être un UUID valide.`,
          statusCode: 400,
        })
      }
    }
    return next()
  }
}

/**
 * Middleware de validation Zod.
 * Valide req.body contre le schéma fourni.
 * Retourne 422 avec les erreurs si invalide.
 *
 * Usage :
 *   router.post('/route', validate(MySchema), handler)
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }))
      return res.status(422).json({
        error:      'Validation Error',
        message:    'Données invalides',
        errors,
        statusCode: 422,
      })
    }
    req.body = result.data  // Remplace le body par les données validées et typées
    return next()
  }
}

// ─── Schémas Zod réutilisables ────────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    z.string().email('Email invalide').max(255),
  password: z.string().min(6, 'Mot de passe trop court').max(128),
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
})

export const CreateFeeSchema = z.object({
  studentId:       z.string().uuid(),
  academicYearId:  z.string().uuid(),
  amount:          z.number().positive().max(100_000),
  dueDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  description:     z.string().max(500).optional(),
})

export const PayFeeSchema = z.object({
  paymentRef: z.string().min(3).max(100),
  method:     z.enum(['bank_transfer', 'card', 'cash', 'check', 'online']),
  amount:     z.number().positive(),
})

export const CreateBookingSchema = z.object({
  classroomId: z.string().uuid(),
  title:       z.string().min(3).max(200),
  day:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  startTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  endTime:     z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  notes:       z.string().max(500).optional(),
}).refine(
  data => data.startTime < data.endTime,
  { message: 'L\'heure de fin doit être après l\'heure de début', path: ['endTime'] },
)

export const CreateEventSchema = z.object({
  universityId:    z.string().uuid(),
  academicYearId:  z.string().uuid().optional(),
  title:           z.string().min(3).max(200),
  description:     z.string().max(1000).optional(),
  type:            z.enum(['semester', 'exam_session', 'holiday', 'resit', 'deadline', 'event']),
  startDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(
  data => data.startDate <= data.endDate,
  { message: 'La date de fin doit être après la date de début', path: ['endDate'] },
)

export const AddJuryMemberSchema = z.object({
  name:      z.string().min(2).max(100),
  role:      z.enum(['president', 'rapporteur', 'examiner', 'supervisor', 'external']),
  teacherId: z.string().uuid().optional(),
})

export const SetDefenseDateSchema = z.object({
  defenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomId:      z.string().uuid().optional(),
})

export const ApproveMissionSchema = z.object({
  paymentRef: z.string().min(3).max(100),
})

export const RefuseMissionSchema = z.object({
  reason: z.string().min(10, 'Le motif doit faire au moins 10 caractères').max(500),
})

export const CreateMissionSchema = z.object({
  teacherId:   z.string().uuid(),
  destination: z.string().min(3).max(200),
  purpose:     z.string().min(10).max(500),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expenses:    z.array(z.object({
    label:  z.string().min(2).max(100),
    amount: z.number().positive().max(50_000),
  })).min(1, 'Au moins une ligne de frais').max(20),
})

export const GenerateDiplomaSchema = z.object({})  // Pas de body, validation via params

export const WaiveFeeSchema = z.object({
  reason: z.string().max(300).optional(),
})
