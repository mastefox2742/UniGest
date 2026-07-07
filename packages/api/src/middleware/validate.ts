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
  method:     z.enum(['pagopa', 'bank_transfer', 'card', 'cash', 'check', 'online', 'mobile_money']),
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

export const CreateExamSessionSchema = z.object({
  date: z.string().datetime(),
  registrationDeadline: z.string().datetime(),
  classroomId: z.string().uuid().optional(),
  maxStudents: z.number().int().positive().max(2_000).optional(),
  notes: z.string().max(1_000).optional(),
}).refine(
  data => new Date(data.registrationDeadline).getTime() < new Date(data.date).getTime(),
  { message: 'La deadline de prenotation doit preceder la date de l examen', path: ['registrationDeadline'] },
)

export const ProposeGradeSchema = z.object({
  bookingId: z.string().uuid(),
  value: z.number().int().min(18).max(30),
  isHonors: z.boolean().default(false),
  notes: z.string().max(1_000).optional(),
}).refine(
  data => !data.isHonors || data.value === 30,
  { message: '30L necessite une note de 30', path: ['isHonors'] },
)

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

export const GraduationStatusSchema = z.enum([
  'pending',
  'eligible',
  'jury_incomplete',
  'jury_complete',
  'defended',
  'diploma_issued',
  'blocked',
])

export const UpdateGraduationStatusSchema = z.object({
  status: GraduationStatusSchema,
  notes: z.string().max(1_000).optional(),
})

export const SubmitGraduationApplicationSchema = z.object({
  thesisTitle: z.string().min(3).max(300).optional(),
})

export const ThesisStatusSchema = z.enum(['proposed', 'approved', 'in_progress', 'submitted', 'defended', 'rejected'])

export const SubmitThesisSchema = z.object({
  title: z.string().min(3).max(300),
  abstract: z.string().max(5_000).optional(),
  documentUrl: z.string().url().max(1_000).optional(),
  advisorName: z.string().max(200).optional(),
  coAdvisorName: z.string().max(200).optional(),
})

export const UpdateThesisStatusSchema = z.object({
  status: ThesisStatusSchema,
  notes: z.string().max(1_000).optional(),
  defenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const RegisterPushTokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().max(200).optional(),
})

export const DeactivatePushTokenSchema = z.object({
  token: z.string().min(10).max(500),
})

export const NotificationPreferencesSchema = z.object({
  general: z.boolean().optional(),
  exam: z.boolean().optional(),
  fee: z.boolean().optional(),
  grade: z.boolean().optional(),
  certificate: z.boolean().optional(),
  thesis: z.boolean().optional(),
  graduation: z.boolean().optional(),
  elearning: z.boolean().optional(),
  internship: z.boolean().optional(),
  alumni: z.boolean().optional(),
})

export const CertificateTypeSchema = z.enum(['enrollment', 'transcript', 'degree', 'attendance', 'other'])

export const IssueCertificateSchema = z.object({
  studentId: z.string().uuid(),
  type: CertificateTypeSchema,
  expiresAt: z.string().datetime().optional(),
})

export const RequestCertificateSchema = z.object({
  type: CertificateTypeSchema,
})

export const InternshipOpportunityStatusSchema = z.enum(['draft', 'open', 'closed'])

export const InternshipApplicationStatusSchema = z.enum([
  'submitted',
  'approved',
  'in_progress',
  'report_submitted',
  'evaluated',
  'closed',
  'refused',
])

export const CreateInternshipOpportunitySchema = z.object({
  title: z.string().min(3).max(200),
  companyName: z.string().min(2).max(200),
  location: z.string().max(200).optional(),
  description: z.string().max(5_000).optional(),
  requirements: z.string().max(2_000).optional(),
  tutorName: z.string().max(200).optional(),
  tutorEmail: z.string().email().max(255).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cfu: z.number().int().min(0).max(60).optional(),
  applicationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: InternshipOpportunityStatusSchema.optional(),
}).refine(
  data => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: 'La date de fin doit suivre la date de debut', path: ['endDate'] },
)

export const ApplyInternshipSchema = z.object({
  opportunityId: z.string().uuid(),
  motivation: z.string().max(2_000).optional(),
})

export const UpdateInternshipStatusSchema = z.object({
  status: InternshipApplicationStatusSchema,
})

export const SubmitInternshipReportSchema = z.object({
  reportUrl: z.string().url().max(1_000),
})

export const EvaluateInternshipSchema = z.object({
  score: z.number().int().min(0).max(30),
  feedback: z.string().max(2_000).optional(),
})

export const AlumniEmploymentStatusSchema = z.enum([
  'seeking',
  'employed',
  'self_employed',
  'continuing_studies',
  'not_available',
])

export const UpsertAlumniProfileSchema = z.object({
  graduationYear: z.number().int().min(1900).max(2100).optional(),
  currentCity: z.string().max(120).optional(),
  currentCountry: z.string().max(120).optional(),
  linkedinUrl: z.string().url().max(500).optional(),
  consentPlacementTracking: z.boolean().optional(),
})

export const SubmitPlacementSurveySchema = z.object({
  employmentStatus: AlumniEmploymentStatusSchema,
  companyName: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  contractType: z.string().max(100).optional(),
  sector: z.string().max(120).optional(),
  salaryRange: z.enum(['<20k', '20-30k', '30-40k', '40-60k', '60k+', 'non_disclosed']).optional(),
  employedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2_000).optional(),
})

export const CreateElearningAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5_000),
  isPinned: z.boolean().optional(),
})
