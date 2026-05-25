export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  SECRETARY: 'secretary',
  ADMIN: 'admin',
} as const

export const STUDENT_STATUSES = {
  PRE_ENROLLED: 'pre_enrolled',
  ENROLLED: 'enrolled',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  GRADUATED: 'graduated',
  WITHDRAWN: 'withdrawn',
} as const

export const GRADE_MIN = 18
export const GRADE_MAX = 30
export const GRADE_HONORS = 'honors'
export const GRADE_PASS = 18

export const DEGREE_TYPES = {
  BACHELOR: 'bachelor',
  MASTER: 'master',
  PHD: 'phd',
  SINGLE_CYCLE: 'single_cycle',
} as const

export const DEGREE_DURATIONS: Record<string, number> = {
  bachelor: 3,
  master: 2,
  phd: 3,
  single_cycle: 5,
}

export const EXAM_BOOKING_STATUSES = {
  BOOKED: 'booked',
  CANCELLED: 'cancelled',
  PRESENT: 'present',
  ABSENT: 'absent',
  GRADED: 'graded',
} as const

export const FEE_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  WAIVED: 'waived',
} as const

export const API_ROUTES = {
  AUTH: '/api/auth',
  STUDENTS: '/api/students',
  TEACHERS: '/api/teachers',
  COURSES: '/api/courses',
  EXAMS: '/api/exams',
  GRADES: '/api/grades',
  FEES: '/api/fees',
  THESIS: '/api/thesis',
  DOCUMENTS: '/api/documents',
  DASHBOARD: '/api/dashboard',
} as const
