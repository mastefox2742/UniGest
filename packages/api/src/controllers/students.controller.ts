import type { Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.middleware'
import { getStudentCareer, getStudentDashboard, getStudentGrades } from '../services/students.service'
import PDFDocument from 'pdfkit'

export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  const data = await getStudentDashboard(req.user!.id)
  if (!data) return res.status(404).json({ error: 'Not Found', message: 'Profil étudiant introuvable' })
  return res.json({ data })
}

export async function getGrades(req: AuthenticatedRequest, res: Response) {
  const semester   = req.query.semester   ? Number(req.query.semester)   : undefined
  const courseYear = req.query.courseYear ? Number(req.query.courseYear) : undefined

  const filter: { semester?: number; courseYear?: number } = {}
  if (semester !== undefined)   filter.semester   = semester
  if (courseYear !== undefined) filter.courseYear = courseYear

  const grades = await getStudentGrades(req.user!.id, filter)
  return res.json({ data: grades })
}

export async function getCareer(req: AuthenticatedRequest, res: Response) {
  const semester   = req.query.semester   ? Number(req.query.semester)   : undefined
  const courseYear = req.query.courseYear ? Number(req.query.courseYear) : undefined

  const filter: { semester?: number; courseYear?: number } = {}
  if (semester !== undefined)   filter.semester   = semester
  if (courseYear !== undefined) filter.courseYear = courseYear

  const career = await getStudentCareer(req.user!.id, filter)
  if (!career) return res.status(404).json({ error: 'Not Found', message: 'Carriere etudiante introuvable' })
  return res.json({ data: career })
}

export async function exportLibrettoPdf(req: AuthenticatedRequest, res: Response) {
  const grades = await getStudentGrades(req.user!.id)

  const doc = new PDFDocument({ size: 'A4', margin: 50 })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="libretto.pdf"')
  doc.pipe(res)

  // En-tête
  doc.fontSize(20).font('Helvetica-Bold').text('UniGest', { align: 'center' })
  doc.fontSize(14).font('Helvetica').text('Libretto Universitario', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(10).fillColor('#666')
    .text(`Généré le ${new Intl.DateTimeFormat('fr-FR').format(new Date())}`, { align: 'center' })
  doc.fillColor('#000')
  doc.moveDown(1)

  // Ligne séparatrice
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
  doc.moveDown(0.5)

  if (grades.length === 0) {
    doc.fontSize(11).text('Aucune note enregistrée.', { align: 'center' })
  } else {
    // En-têtes tableau
    const col = { matiere: 50, code: 250, cfu: 330, note: 390, date: 450 }
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#444')
    doc.text('Matière',   col.matiere, doc.y, { continued: false })
    const headerY = doc.y - 13
    doc.text('Code',      col.code,    headerY, { continued: false })
    doc.text('CFU',       col.cfu,     headerY, { continued: false })
    doc.text('Note',      col.note,    headerY, { continued: false })
    doc.text('Date',      col.date,    headerY, { continued: false })
    doc.moveDown(0.3)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc')
    doc.moveDown(0.3)

    // Lignes
    doc.font('Helvetica').fillColor('#000').fontSize(9)
    let totalCfu = 0, weightedSum = 0

    for (const g of grades) {
      const y = doc.y
      const gradeVal = g.grade === '30L' ? 30 : Number(g.grade)
      totalCfu    += g.cfu
      weightedSum += (isNaN(gradeVal) ? 0 : gradeVal) * g.cfu

      // Couleur note
      const isHigh = g.grade === '30L' || gradeVal >= 27
      doc.fillColor(isHigh ? '#166534' : gradeVal >= 18 ? '#854d0e' : '#991b1b')
        .text(g.grade, col.note, y, { continued: false })

      doc.fillColor('#000')
        .text(g.courseName.slice(0, 22),  col.matiere, y, { continued: false })
        .text(g.courseCode,               col.code,    y, { continued: false })
        .text(String(g.cfu),              col.cfu,     y, { continued: false })
        .text(g.examDate
          ? new Intl.DateTimeFormat('fr-FR').format(new Date(g.examDate))
          : '—',
          col.date, y, { continued: false },
        )
      doc.moveDown(0.6)
    }

    // Résumé GPA
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.5)
    const gpa = totalCfu > 0 ? (weightedSum / totalCfu).toFixed(2) : '—'
    doc.font('Helvetica-Bold').fontSize(10)
      .text(`Total CFU : ${totalCfu}`, 50)
      .text(`Moyenne pondérée : ${gpa} / 30`, 50)
  }

  doc.end()
}
