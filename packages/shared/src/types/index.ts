// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'teacher' | 'secretary' | 'admin'

export type StudentStatus =
  | 'pre_enrolled'
  | 'enrolled'
  | 'active'
  | 'suspended'
  | 'graduated'
  | 'withdrawn'

export type DegreeType = 'bachelor' | 'master' | 'phd' | 'single_cycle'

export type GradeStatus = 'proposed' | 'accepted' | 'rejected' | 'published'

export type ExamBookingStatus = 'booked' | 'cancelled' | 'present' | 'absent' | 'graded'

export type FeeStatus = 'pending' | 'paid' | 'overdue' | 'waived'

export type ThesisStatus =
  | 'proposed'
  | 'approved'
  | 'in_progress'
  | 'submitted'
  | 'defended'
  | 'rejected'

export type DocumentType =
  | 'id_card'
  | 'passport'
  | 'diploma'
  | 'transcript'
  | 'photo'
  | 'other'

// ─── Base ─────────────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// ─── User & Profiles ──────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  email: string
  role: UserRole
  firstName: string
  lastName: string
  avatarUrl?: string
  isActive: boolean
}

export interface Student extends BaseEntity {
  userId: string
  matricola: string
  status: StudentStatus
  enrollmentYear: number
  degreeProgramId: string
  currentYear: number
  totalCfuEarned: number
  gpa: number
  user?: User
  degreeProgram?: DegreeProgram
}

export interface Teacher extends BaseEntity {
  userId: string
  employeeId: string
  departmentId: string
  title: string
  officeLocation?: string
  officeHours?: string
  user?: User
}

// ─── Academic ─────────────────────────────────────────────────────────────────

export interface DegreeProgram extends BaseEntity {
  name: string
  code: string
  type: DegreeType
  departmentId: string
  durationYears: number
  totalCfu: number
  description?: string
}

export interface Department extends BaseEntity {
  name: string
  code: string
  headTeacherId?: string
}

export interface Course extends BaseEntity {
  name: string
  code: string
  degreeProgramId: string
  teacherId: string
  year: number
  semester: 1 | 2
  cfu: number
  description?: string
  teacher?: Teacher
}

export interface ExamSession extends BaseEntity {
  courseId: string
  date: string
  location: string
  maxStudents: number
  registrationDeadline: string
  course?: Course
}

export interface ExamBooking extends BaseEntity {
  studentId: string
  examSessionId: string
  status: ExamBookingStatus
  student?: Student
  examSession?: ExamSession
}

export interface Grade extends BaseEntity {
  studentId: string
  courseId: string
  examSessionId: string
  examBookingId: string
  value: number | 'honors'
  cfu: number
  status: GradeStatus
  publishedAt?: string
  student?: Student
  course?: Course
}

export interface StudyPlan extends BaseEntity {
  studentId: string
  academicYear: string
  isApproved: boolean
  courses: Course[]
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface TuitionFee extends BaseEntity {
  studentId: string
  academicYear: string
  amount: number
  dueDate: string
  status: FeeStatus
  paidAt?: string
  student?: Student
}

// ─── Thesis ───────────────────────────────────────────────────────────────────

export interface Thesis extends BaseEntity {
  studentId: string
  supervisorId: string
  title: string
  status: ThesisStatus
  proposedAt?: string
  defendedAt?: string
  grade?: number
  student?: Student
  supervisor?: Teacher
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface StudentDocument extends BaseEntity {
  studentId: string
  type: DocumentType
  fileName: string
  fileUrl: string
  isVerified: boolean
  verifiedAt?: string
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface StudentDashboard {
  student: Student
  upcomingExams: ExamSession[]
  recentGrades: Grade[]
  pendingFees: TuitionFee[]
  cfuProgress: { earned: number; total: number; percentage: number }
}
