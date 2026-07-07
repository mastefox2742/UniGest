import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'
import type { Response } from 'express'
import {
  assertCertificateType,
  generateVerificationToken,
  isCertificateExpired,
  type CertificateType,
} from './certificate-rules'
import { createScenarioNotificationForStudent } from './notifications.service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CERT_LABELS: Record<CertificateType, string> = {
  enrollment: 'Certificat de scolarite',
  transcript: 'Releve de notes officiel',
  degree: 'Diplome',
  attendance: 'Attestation de presence',
  other: 'Document officiel',
}

function generateSerial() {
  const year = new Date().getFullYear()
  const suffix = Math.floor(Math.random() * 900000 + 100000)
  return `CERT-${year}-${suffix}`
}

function verificationBaseUrl() {
  return process.env.PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://unigest.fr'
}

export async function getStudentCertificates(studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) return []

  const { data, error } = await supabase
    .from('certificates')
    .select(`
      id, type, issued_at, expires_at, serial_number, file_url,
      secretaries!issued_by(
        profiles!user_id(first_name, last_name)
      )
    `)
    .eq('student_id', student.id)
    .order('issued_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAllCertificates(filters: { type?: string } = {}) {
  let query = supabase
    .from('certificates')
    .select(`
      id, type, issued_at, expires_at, serial_number, file_url,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, email)
      ),
      secretaries!issued_by(
        profiles!user_id(first_name, last_name)
      )
    `)
    .order('issued_at', { ascending: false })

  if (filters.type) {
    assertCertificateType(filters.type)
    query = query.eq('type', filters.type)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export interface IssueCertificateInput {
  studentId: string
  type: string
  secretaryId: string
  expiresAt?: string
}

export async function issueCertificate(input: IssueCertificateInput) {
  assertCertificateType(input.type)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from('certificates')
      .insert({
        student_id: input.studentId,
        type: input.type,
        issued_by: input.secretaryId,
        serial_number: generateSerial(),
        verification_token: generateVerificationToken(),
        expires_at: input.expiresAt ?? null,
      })
      .select()
      .single()

    if (!error && data) {
      await createScenarioNotificationForStudent(input.studentId, {
        topic: 'certificate',
        event: 'issued',
        message: `${CERT_LABELS[input.type]} est disponible au telechargement.`,
        link: '/student/certificates',
      }).catch(err => console.error('[notifications] certificate issued:', err.message))
      return data
    }
    if (!error || !error.message.toLowerCase().includes('duplicate')) {
      throw new Error(error?.message ?? 'Impossible de creer le certificat')
    }
  }

  throw new Error('Impossible de generer un numero de certificat unique')
}

export async function requestStudentCertificate(studentUserId: string, type: string) {
  assertCertificateType(type)

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Etudiant introuvable')

  const secretaryId = await resolveFallbackSecretaryId()
  return issueCertificate({ studentId: student.id, type, secretaryId })
}

export async function canUserAccessCertificate(certId: string, user: { id: string; role: string }) {
  if (user.role === 'admin' || user.role === 'secretary') return true
  if (user.role !== 'student') return false

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!student) return false

  const { data: cert } = await supabase
    .from('certificates')
    .select('student_id')
    .eq('id', certId)
    .single()

  return cert?.student_id === student.id
}

export async function verifyCertificate(token: string) {
  const { data: cert } = await supabase
    .from('certificates')
    .select('type, serial_number, issued_at, expires_at')
    .eq('verification_token', token)
    .single()

  if (!cert) {
    return { valid: false, reason: 'not_found' as const }
  }

  const expired = isCertificateExpired(cert.expires_at)
  return {
    valid: !expired,
    reason: expired ? 'expired' as const : null,
    certificate: {
      type: cert.type,
      label: CERT_LABELS[cert.type as CertificateType] ?? CERT_LABELS.other,
      serialNumber: cert.serial_number,
      issuedAt: cert.issued_at,
      expiresAt: cert.expires_at,
    },
  }
}

export async function streamCertificatePdf(certId: string, res: Response) {
  const { data: cert } = await supabase
    .from('certificates')
    .select(`
      id, type, serial_number, verification_token, issued_at, expires_at,
      students!student_id(
        id, matricola, enrollment_year,
        profiles!user_id(first_name, last_name, email),
        degree_programs!degree_program_id(name, type, total_cfu, duration_years)
      ),
      secretaries!issued_by(
        profiles!user_id(first_name, last_name)
      )
    `)
    .eq('id', certId)
    .single()

  if (!cert) throw new Error('Certificat introuvable')

  const student = cert.students as any
  const profile = student?.profiles
  const program = student?.degree_programs
  const secretary = (cert.secretaries as any)?.profiles
  const certType = cert.type as CertificateType
  const label = CERT_LABELS[certType] ?? CERT_LABELS.other
  const issuedDate = new Date(cert.issued_at).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Etudiant'
  const verifyUrl = `${verificationBaseUrl()}/verify/certificates/${cert.verification_token}`

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="UniGest_${cert.type}_${cert.serial_number}.pdf"`)

  const doc = new PDFDocument({ size: 'A4', margin: 60 })
  doc.pipe(res)

  doc.rect(0, 0, doc.page.width, 120).fill('#1a365d')
  doc
    .fillColor('white')
    .fontSize(26)
    .font('Helvetica-Bold')
    .text('UniGest', 60, 30)
    .fontSize(11)
    .font('Helvetica')
    .text('Universita degli Studi UniGest', 60, 65)
    .text('Systeme de Gestion Universitaire', 60, 82)

  doc
    .fillColor('#1a365d')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(label.toUpperCase(), 60, 150, { align: 'center' })

  doc.moveTo(60, 185).lineTo(doc.page.width - 60, 185).strokeColor('#1a365d').lineWidth(2).stroke()

  const bodyY = 210
  doc.fillColor('#333').fontSize(13).font('Helvetica')

  if (certType === 'enrollment') {
    doc.text("L'Universite UniGest certifie que :", 60, bodyY)
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text(fullName, 60, bodyY + 30, { align: 'center' })
      .fontSize(13)
      .font('Helvetica')
      .fillColor('#333')
      .text(
        `est regulierement inscrit(e) a l'Universite UniGest pour l'annee universitaire ${student?.enrollment_year ?? '-'}${student?.enrollment_year ? `/${student.enrollment_year + 1}` : ''}.`,
        60,
        bodyY + 65,
        { align: 'center', width: doc.page.width - 120 },
      )

    if (program) {
      doc.text(`Filiere : ${program.name} (${String(program.type).toUpperCase()}) - ${program.total_cfu} CFU`, 60, bodyY + 110, {
        align: 'center',
      })
    }
  } else if (certType === 'transcript') {
    doc
      .text('Ce releve officiel atteste de la carriere academique de :', 60, bodyY)
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text(fullName, 60, bodyY + 30, { align: 'center' })
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#333')
      .text('Le detail des notes publiees est consultable dans le libretto numerique UniGest.', 60, bodyY + 70, {
        align: 'center',
        width: doc.page.width - 120,
      })
  } else {
    doc
      .text('Ce document officiel est delivre a :', 60, bodyY)
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a365d')
      .text(fullName, 60, bodyY + 30, { align: 'center' })
  }

  if (student?.matricola) {
    doc.fillColor('#333').fontSize(12).font('Helvetica').text(`Matricule : ${student.matricola}`, 60, bodyY + 140, {
      align: 'center',
    })
  }

  const infoY = bodyY + 205
  doc.rect(60, infoY, doc.page.width - 120, 96).fillAndStroke('#f8fafc', '#cbd5e0')
  doc
    .fillColor('#333')
    .fontSize(10)
    .font('Helvetica')
    .text(`Delivre le : ${issuedDate}`, 75, infoY + 12)
    .text(`Numero de serie : ${cert.serial_number}`, 75, infoY + 28)
    .text(`Delivre par : ${secretary ? `${secretary.first_name} ${secretary.last_name}` : 'Administration UniGest'}`, 75, infoY + 44)
    .text(`Verification : ${verifyUrl}`, 75, infoY + 60, { width: doc.page.width - 150 })

  if (cert.expires_at) {
    const expiresDate = new Date(cert.expires_at).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.text(`Valide jusqu'au : ${expiresDate}`, 75, infoY + 78)
  }

  const sigY = infoY + 135
  doc.moveTo(doc.page.width - 240, sigY).lineTo(doc.page.width - 60, sigY).strokeColor('#999').lineWidth(1).stroke()
  doc
    .fillColor('#666')
    .fontSize(9)
    .text("Signature et cachet de l'administration", doc.page.width - 240, sigY + 8, {
      width: 180,
      align: 'center',
    })

  doc.rect(0, doc.page.height - 44, doc.page.width, 44).fill('#1a365d')
  doc
    .fillColor('white')
    .fontSize(8)
    .font('Helvetica')
    .text(`UniGest - Document officiel - ${cert.serial_number}`, 0, doc.page.height - 30, { align: 'center' })
    .text(`Verifier: ${verifyUrl}`, 0, doc.page.height - 18, { align: 'center' })

  doc.end()
}

async function resolveFallbackSecretaryId() {
  const { data: anySecretary } = await supabase
    .from('secretaries')
    .select('id')
    .limit(1)
    .single()

  if (!anySecretary?.id) {
    throw new Error('Aucun secretaire trouve pour emettre le certificat')
  }

  return anySecretary.id as string
}
