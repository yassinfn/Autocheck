import { jsPDF } from 'jspdf'
import type { AnalyseResult, ContactVerdict, VisiteData, DecisionFinale } from '@/types'

// Remove emojis and non-Latin-1 chars (jsPDF standard fonts are latin-1 only)
function clean(text: string): string {
  return text
    .replace(/[   ​]/g, ' ')
    .replace(/[^\x20-\xFF\n]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR').replace(/[   ]/g, ' ')
}

export function generatePDF({
  analyse,
  contactVerdict,
  visite,
  decision,
}: {
  analyse: AnalyseResult
  contactVerdict?: ContactVerdict
  visite?: VisiteData
  decision?: DecisionFinale
}) {
  const { vehicule, score, reputation, depenses, detection } = analyse
  const sym = clean(detection.symbole)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ML = 20
  const MR = 20
  const PW = 210
  const CW = PW - ML - MR
  let y = 20

  function newPageIfNeeded(needed = 12) {
    if (y + needed > 278) { doc.addPage(); y = 20 }
  }

  function sectionHeader(title: string) {
    newPageIfNeeded(14)
    doc.setFillColor(79, 70, 229)
    doc.rect(ML, y, CW, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(clean(title), ML + 3, y + 6)
    doc.setTextColor(0, 0, 0)
    y += 13
  }

  function subHeader(title: string) {
    newPageIfNeeded(10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text(clean(title), ML, y)
    y += 6
    doc.setTextColor(0, 0, 0)
  }

  function bodyText(text: string, indent = 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    const lines = doc.splitTextToSize(clean(text), CW - indent)
    newPageIfNeeded(lines.length * 4.5)
    doc.text(lines, ML + indent, y)
    y += lines.length * 4.5
    doc.setTextColor(0, 0, 0)
  }

  function bullet(text: string, r = 71, g = 85, b = 105) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(r, g, b)
    const lines = doc.splitTextToSize('- ' + clean(text), CW - 6)
    newPageIfNeeded(lines.length * 4.5)
    doc.text(lines, ML + 6, y)
    y += lines.length * 4.5
    doc.setTextColor(0, 0, 0)
  }

  function gap(n = 4) { y += n }

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('AutoCheck', ML, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Rapport d\'inspection vehicule d\'occasion', ML, 20)
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(today, PW - MR, 20, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  y = 36

  // ── VEHICULE ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42)
  doc.text(`${vehicule.marque} ${vehicule.modele} ${vehicule.annee}`, ML, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `${fmt(vehicule.kilometrage)} km  |  ${fmt(vehicule.prix)} ${sym}  |  ${vehicule.nombreProprietaires} proprietaire(s)  |  ${clean(vehicule.version || vehicule.motorisation)}`,
    ML, y
  )
  y += 4
  doc.setDrawColor(226, 232, 240)
  doc.line(ML, y, PW - MR, y)
  y += 8
  doc.setTextColor(0, 0, 0)

  // ── SCORE ───────────────────────────────────────────────────────────────────
  sectionHeader('Score / 100')

  const [sr, sg, sb] = score.total >= 75 ? [22, 163, 74]
    : score.total >= 60 ? [202, 138, 4]
    : score.total >= 45 ? [234, 88, 12]
    : [220, 38, 38]

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(32)
  doc.setTextColor(sr, sg, sb)
  doc.text(`${score.total}`, ML, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(100, 116, 139)
  doc.text('/100', ML + 18, y + 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(clean(score.verdict), ML + 35, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  const ressentLines = doc.splitTextToSize(clean(score.ressentGlobal), CW - 35)
  doc.text(ressentLines, ML + 35, y + 9)
  y += Math.max(16, ressentLines.length * 4.5 + 4)
  doc.setTextColor(0, 0, 0)

  if (score.pointsAttention.length > 0) {
    gap(2)
    subHeader('Points d\'attention')
    score.pointsAttention.forEach(p => bullet(p, 180, 83, 9))
  }
  gap()

  // ── REPUTATION ──────────────────────────────────────────────────────────────
  sectionHeader('Reputation du modele')

  if (reputation.pointsForts.length > 0) {
    subHeader('Points forts')
    reputation.pointsForts.forEach(p => bullet(p, 22, 163, 74))
    gap(3)
  }

  if (reputation.problemesConnus.length > 0) {
    subHeader('Problemes connus')
    reputation.problemesConnus.forEach(p =>
      bullet(`${clean(p.description)} (${p.gravite}, ${p.frequence})`, 180, 83, 9)
    )
    gap(3)
  }

  if (reputation.rappelsConstructeur.length > 0) {
    subHeader('Rappels constructeur')
    reputation.rappelsConstructeur.forEach(r =>
      bullet(`${r.reference} - ${clean(r.description)}`)
    )
    gap(3)
  }

  if (reputation.analyse_generation?.explication) {
    subHeader('Analyse de generation')
    bodyText(reputation.analyse_generation.explication)
    gap(3)
  }

  // ── DEPENSES ────────────────────────────────────────────────────────────────
  sectionHeader('Depenses a prevoir')

  depenses.items.forEach(item => {
    newPageIfNeeded(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text(clean(item.poste), ML, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`${fmt(item.montantMin)} - ${fmt(item.montantMax)} ${sym}`, PW - MR, y, { align: 'right' })
    y += 5
    if (item.detail) {
      doc.setFontSize(8)
      const dl = doc.splitTextToSize(clean(item.detail), CW - 6)
      doc.setTextColor(100, 116, 139)
      doc.text(dl, ML + 6, y)
      y += dl.length * 4
    }
    y += 2
    doc.setTextColor(0, 0, 0)
  })

  newPageIfNeeded(10)
  doc.setDrawColor(226, 232, 240)
  doc.line(ML, y, PW - MR, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('Total estime :', ML, y)
  doc.text(`${fmt(depenses.totalMin)} - ${fmt(depenses.totalMax)} ${sym}`, PW - MR, y, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  y += 8

  // ── CONTACT VENDEUR ─────────────────────────────────────────────────────────
  if (contactVerdict) {
    sectionHeader('Contact vendeur - Verdict')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    const delta = contactVerdict.scoreUpdate >= 0 ? `+${contactVerdict.scoreUpdate}` : `${contactVerdict.scoreUpdate}`
    doc.text(`Score apres contact : ${contactVerdict.scoreTotal}/100 (${delta} pts)`, ML, y)
    y += 7
    doc.setTextColor(0, 0, 0)

    if (contactVerdict.pointsPositifs.length > 0) {
      subHeader('Points positifs')
      contactVerdict.pointsPositifs.forEach(p => bullet(p, 22, 163, 74))
      gap(3)
    }
    if (contactVerdict.alertes.length > 0) {
      subHeader('Alertes')
      contactVerdict.alertes.forEach(a => bullet(a, 220, 38, 38))
      gap(3)
    }
    bodyText(contactVerdict.recommandation)
    gap()
  }

  // ── CHECKLIST VISITE ────────────────────────────────────────────────────────
  if (visite && visite.items.length > 0) {
    sectionHeader('Checklist de visite')

    const nokItems = visite.items.filter(i => i.statut === 'nok')
    const okItems  = visite.items.filter(i => i.statut === 'ok')
    const pending  = visite.items.filter(i => i.statut === 'pending')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(`${okItems.length} OK  |  ${nokItems.length} NOK  |  ${pending.length} non verifies`, ML, y)
    y += 7
    doc.setTextColor(0, 0, 0)

    if (nokItems.length > 0) {
      subHeader('Problemes detectes (NOK)')
      nokItems.forEach(item => {
        const label = item.note ? `${clean(item.point)} - ${clean(item.note)}` : clean(item.point)
        bullet(label, 220, 38, 38)
      })
      gap(3)
    }

    if (okItems.length > 0) {
      subHeader('Points verifies (OK)')
      okItems.forEach(item => bullet(clean(item.point), 22, 163, 74))
      gap(3)
    }

    if (visite.photoAnalyses.length > 0) {
      subHeader('Analyses photos')
      visite.photoAnalyses.forEach((a, i) => {
        bodyText(`Photo ${i + 1} : ${a}`, 4)
        gap(2)
      })
    }
    gap()
  }

  // ── DECISION FINALE ─────────────────────────────────────────────────────────
  if (decision) {
    sectionHeader('Recommandation finale')

    const [dr, dg, db] = decision.decision === 'acheter' ? [22, 163, 74]
      : decision.decision === 'negocier' ? [202, 138, 4]
      : [220, 38, 38]
    const decisionLabel = decision.decision === 'acheter' ? 'ACHAT RECOMMANDE'
      : decision.decision === 'negocier' ? 'NEGOCIATION RECOMMANDEE'
      : 'DECONSEILLE'

    newPageIfNeeded(16)
    doc.setFillColor(dr, dg, db)
    doc.rect(ML, y, CW, 11, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text(decisionLabel, ML + 5, y + 7.5)
    doc.setTextColor(0, 0, 0)
    y += 15

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(clean(decision.titre), ML, y)
    y += 6
    doc.setTextColor(0, 0, 0)
    bodyText(decision.resume)
    gap(3)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text(`Score global : ${decision.scoreGlobal}/100`, ML, y)
    y += 6
    doc.setTextColor(0, 0, 0)

    if (decision.pointsPositifs.length > 0) {
      subHeader('Points positifs')
      decision.pointsPositifs.forEach(p => bullet(p, 22, 163, 74))
      gap(3)
    }

    if (decision.risques.length > 0) {
      subHeader('Risques identifies')
      decision.risques.forEach(r => bullet(r, 220, 38, 38))
      gap(3)
    }

    if (decision.argumentsNegociation.length > 0) {
      subHeader('Arguments de negociation')
      decision.argumentsNegociation.forEach(a => {
        newPageIfNeeded(7)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(71, 85, 105)
        doc.text(`- ${clean(a.raison)}`, ML + 6, y)
        doc.setTextColor(220, 38, 38)
        doc.text(`-${fmt(a.reduction)} ${sym}`, PW - MR, y, { align: 'right' })
        doc.setTextColor(0, 0, 0)
        y += 5
      })

      if (decision.reductionTotale > 0) {
        gap(3)
        newPageIfNeeded(14)
        doc.setFillColor(238, 242, 255)
        doc.rect(ML, y, CW, 12, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(67, 56, 202)
        doc.text('Prix cible a proposer :', ML + 5, y + 8)
        doc.text(`${fmt(decision.prixCible)} ${sym}`, PW - MR - 5, y + 8, { align: 'right' })
        doc.setTextColor(0, 0, 0)
        y += 16
      }
    }

    gap(3)
    bodyText(decision.conclusion)
  }

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(`AutoCheck — Page ${i}/${total}`, PW / 2, 292, { align: 'center' })
  }

  const filename = `autocheck-${vehicule.marque}-${vehicule.modele}-${vehicule.annee}`
    .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.pdf'
  doc.save(filename)
}
