import type { ContactVerdict, DetectionResult } from '@/types'

// Claude occasionally returns {titre, detail} objects instead of plain strings.
// This helper normalises both formats so stored rows never crash the renderer.
function normalize(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>
    if (typeof o.titre === 'string') return o.detail ? `${o.titre} — ${o.detail}` : o.titre
    if (typeof o.title === 'string') return o.title
  }
  return String(item ?? '')
}

interface VerdictBlockProps {
  verdict: ContactVerdict
  detection: DetectionResult
  onVisiter: () => void
  onDecisionNow: () => void
}

export default function VerdictBlock({ verdict, detection, onVisiter, onDecisionNow }: VerdictBlockProps) {
  const deltaPositif = verdict.scoreUpdate > 0
  const deltaNeutre = verdict.scoreUpdate === 0
  const deltaColor = deltaPositif ? 'text-green-600' : deltaNeutre ? 'text-slate-500' : 'text-red-600'
  const deltaIcon = deltaPositif ? '▲' : deltaNeutre ? '=' : '▼'
  const deltaSign = deltaPositif ? '+' : ''

  const scoreColor =
    verdict.scoreTotal >= 80
      ? 'text-green-600'
      : verdict.scoreTotal >= 60
      ? 'text-yellow-600'
      : verdict.scoreTotal >= 40
      ? 'text-orange-600'
      : 'text-red-600'

  return (
    <div className="space-y-4">
      {/* Score mis à jour */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Score après contact vendeur</h3>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className={`text-5xl font-bold ${scoreColor}`}>{verdict.scoreTotal}</div>
            <div className="text-xs text-slate-400 mt-0.5">/100</div>
          </div>
          <div className={`flex items-center gap-1.5 text-base font-semibold ${deltaColor}`}>
            <span>{deltaIcon}</span>
            <span>{deltaSign}{verdict.scoreUpdate} pts</span>
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-4 leading-relaxed">{verdict.recommandation}</p>
      </div>

      {/* Positifs / Alertes */}
      {(verdict.pointsPositifs.length > 0 || verdict.alertes.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {verdict.pointsPositifs.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">Points positifs</p>
              <ul className="space-y-1.5">
                {verdict.pointsPositifs.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="shrink-0 mt-0.5">✓</span>
                    <span>{normalize(p)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {verdict.alertes.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-orange-800 mb-2">Signaux d&apos;alerte</p>
              <ul className="space-y-1.5">
                {verdict.alertes.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-700">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{normalize(a)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Bilan financier */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <span className="text-base font-semibold text-slate-900">Bilan financier mis à jour</span>
        </div>
        <div className="divide-y divide-slate-100">
          {verdict.bilanFinancier.items.map((item, i) => (
            <div key={i} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{item.poste}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-medium text-slate-900">
                  {item.montantMin === item.montantMax
                    ? `${item.montantMin.toLocaleString('fr-FR')} ${detection.symbole}`
                    : `${item.montantMin.toLocaleString('fr-FR')} – ${item.montantMax.toLocaleString('fr-FR')} ${detection.symbole}`}
                </span>
              </div>
            </div>
          ))}
          <div className="px-5 py-3 flex items-center justify-between bg-slate-50">
            <span className="text-sm font-bold text-slate-900">Total estimé</span>
            <span className="text-sm font-bold text-slate-900">
              {verdict.bilanFinancier.totalMin.toLocaleString('fr-FR')} – {verdict.bilanFinancier.totalMax.toLocaleString('fr-FR')} {detection.symbole}
            </span>
          </div>
        </div>
      </div>

      {/* Arguments de négociation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <span className="text-base font-semibold text-slate-900">Arguments de négociation</span>
        </div>
        <div className="p-5 space-y-1">
          {verdict.argumentNegociation.elements.map((el, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-700">{el.raison}</span>
              <span className="text-sm font-medium text-red-600 shrink-0 ml-3">
                -{el.reduction.toLocaleString('fr-FR')} {detection.symbole}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 font-semibold">
            <span className="text-sm text-slate-900">Réduction totale recommandée</span>
            <span className="text-sm text-red-600 shrink-0 ml-3">
              -{verdict.argumentNegociation.reductionTotale.toLocaleString('fr-FR')} {detection.symbole}
            </span>
          </div>
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 mt-2">
            <span className="text-sm font-bold text-indigo-900">Prix cible à proposer</span>
            <span className="text-xl font-bold text-indigo-700 shrink-0 ml-3">
              {verdict.argumentNegociation.prixCible.toLocaleString('fr-FR')} {detection.symbole}
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Voulez-vous aller visiter le véhicule ?</h3>
        <p className="text-slate-500 text-sm mt-1 mb-5">Score {verdict.scoreTotal}/100</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onVisiter}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            ✓ Oui, je vais visiter
          </button>
          <button
            onClick={onDecisionNow}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
          >
            Décision maintenant
          </button>
        </div>
      </div>
    </div>
  )
}
