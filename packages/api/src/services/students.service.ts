import { createClient } from '@supabase/supabase-js'
import {
  arithmeticMean,
  cfuEarned,
  cfuProgress,
  laureaStartScore,
  weightedMean,
} from './career-rules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface DashboardData {
  studentId:        string
  matricola:        string | null
  fullName:         string
  degreeProgram:    string
  totalCfu:         number
  totalCfuEarned:   number
  cfuProgressPct:   number
  gpa:              number
  currentYear:      number
  enrollmentYear:   number
  status:           string
  nextExamDate:     string | null
  pendingFeesTotal: number
}

export interface LibrettoEntry {
  matricola?:     string
  studentName?:   string
  degreeProgram?: string
  degreeType?:    string
  id:            string
  courseCode:    string
  courseName:    string
  cfu:           number
  courseYear:    number
  semester:      number
  grade:         string
  gradeStatus:   string
  publishedAt:   string | null
  examDate:      string | null
  teacherName:   string
}

export interface StudentCareer {
  student: {
    id: string
    matricola: string | null
    fullName: string
    status: string
    currentYear: number
    enrollmentYear: number
    degreeProgram: string
    degreeType: string
    totalCfu: number
  }
  summary: {
    passedExams: number
    totalCfuEarned: number
    totalCfu: number
    cfuProgressPct: number
    arithmeticMean: number
    weightedMean: number
    laureaStartScore: number
  }
  libretto: LibrettoEntry[]
}

export async function getStudentDashboard(userId: string): Promise<DashboardData | null> {
  // Récupérer le profil + email
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) return null

  const { data: authUser } = await supabase.auth.admin.getUserById(userId)
  const email = authUser?.user?.email ?? ''

  const { data, error } = await supabase
    .from('student_dashboard')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !data) return null

  return {
    studentId:        data.student_id as string,
    matricola:        data.matricola as string | null,
    fullName:         data.full_name as string,
    degreeProgram:    data.degree_program as string,
    totalCfu:         data.total_cfu as number,
    totalCfuEarned:   data.total_cfu_earned as number,
    cfuProgressPct:   data.cfu_progress_pct as number ?? 0,
    gpa:              data.gpa as number,
    currentYear:      data.current_year as number,
    enrollmentYear:   data.enrollment_year as number,
    status:           data.status as string,
    nextExamDate:     data.next_exam_date as string | null,
    pendingFeesTotal: data.pending_fees_total as number,
  }
}

export async function getStudentGrades(
  userId: string,
  filters: { semester?: number; courseYear?: number } = {},
): Promise<LibrettoEntry[]> {
  const { data: student } = await supabase
    .from('students')
    .select('matricola')
    .eq('user_id', userId)
    .single()

  if (!student?.matricola) return []

  let query = supabase
    .from('libretto')
    .select('*')
    .eq('matricola', student.matricola)

  if (filters.semester)   query = query.eq('semester', filters.semester)
  if (filters.courseYear) query = query.eq('course_year', filters.courseYear)

  const { data, error } = await query.order('exam_date', { ascending: false })
  if (error || !data) return []

  return (data as Record<string, unknown>[]).map((r) => ({
    matricola:     r.matricola as string,
    studentName:   r.student_name as string,
    degreeProgram: r.degree_program as string,
    degreeType:    r.degree_type as string,
    id:          r.id as string,
    courseCode:  r.course_code as string,
    courseName:  r.course_name as string,
    cfu:         r.cfu as number,
    courseYear:  r.course_year as number,
    semester:    r.semester as number,
    grade:       r.grade as string,
    gradeStatus: r.grade_status as string,
    publishedAt: r.published_at as string | null,
    examDate:    r.exam_date as string | null,
    teacherName: r.teacher_name as string,
  }))
}

export async function getStudentCareer(
  userId: string,
  filters: { semester?: number; courseYear?: number } = {},
): Promise<StudentCareer | null> {
  const { data: student, error } = await supabase
    .from('students')
    .select(`
      id, matricola, status, current_year, enrollment_year,
      profiles!user_id(first_name, last_name),
      degree_programs!degree_program_id(name, type, total_cfu)
    `)
    .eq('user_id', userId)
    .single()

  if (error || !student) return null

  const profile = student.profiles as any
  const program = student.degree_programs as any
  const libretto = await getStudentGrades(userId, filters)
  const earned = cfuEarned(libretto)
  const weighted = weightedMean(libretto)
  const totalCfu = Number(program?.total_cfu ?? 0)

  return {
    student: {
      id:             student.id as string,
      matricola:      student.matricola as string | null,
      fullName:       [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
      status:         student.status as string,
      currentYear:    student.current_year as number,
      enrollmentYear: student.enrollment_year as number,
      degreeProgram:  program?.name ?? '',
      degreeType:     program?.type ?? '',
      totalCfu,
    },
    summary: {
      passedExams:       libretto.length,
      totalCfuEarned:    earned,
      totalCfu,
      cfuProgressPct:    cfuProgress(earned, totalCfu),
      arithmeticMean:    arithmeticMean(libretto),
      weightedMean:      weighted,
      laureaStartScore:  laureaStartScore(weighted),
    },
    libretto,
  }
}
