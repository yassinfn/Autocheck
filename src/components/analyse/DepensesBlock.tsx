import type { DepenseItem, DepensesResult } from '@/types'

interface DepensesBlockProps {
  depenses: DepensesResult
  symbole: string
}

function fmt(n: number, symbole: string): string {
  return `${n.toLocaleString('fr-FR')} ${symbole}`
}

function ItemTable({
  items,
  symbole,
  footer,
}: {
  items: DepenseItem[]
  symbole: string
  footer?: { label: string; min: number; max: number }
}) {
  if (items.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Poste</th>
            <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Détail</th>
            <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fourchette</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              <td className="py-3 pr-4 font-medium text-slate-800 align-top">{item.poste}</td>
              <td className="py-3 pr-4 text-slate-500 hidden sm:table-cell align-top">{item.detail}</td>
              <td className="py-3 text-right text-slate-700 whitespace-nowrap align-top">
                {fmt(item.montantMin, symbole)} – {fmt(item.montantMax, symbole)}
              </td>
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td colSpan={2} className="py-3 pr-4 font-bold text-slate-900">{footer.label}</td>
              <td className="py-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                {fmt(footer.min, symbole)} – {fmt(footer.max, symbole)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
      {children}
    </p>
  )
}

export default function DepensesBlock({ depenses, symbole }: DepensesBlockProps) {
  const obligatoires = depenses.obligatoires ?? []
  const eventuelles = depenses.eventuelles ?? []
  const fraisAchat = depenses.fraisAchat ?? []
  const totalMin = depenses.totalObligatoiresMin ?? 0
  const totalMax = depenses.totalObligatoiresMax ?? 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <span className="text-base font-semibold text-slate-900">Dépenses à prévoir</span>
        <p className="text-xs text-slate-400 mt-0.5">Estimations basées sur les prix du marché local</p>
      </div>

      <div className="p-5 space-y-7">

        {/* ── Bloc 1 : Mécaniques ── */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Dépenses mécaniques</h3>

          {/* 1a — Obligatoires */}
          <div className="mb-5">
            <SectionLabel>À faire obligatoirement à l&apos;achat</SectionLabel>
            <ItemTable
              items={obligatoires}
              symbole={symbole}
              footer={{ label: 'Total certain', min: totalMin, max: totalMax }}
            />
          </div>

          {/* 1b — Éventuelles */}
          {eventuelles.length > 0 && (
            <div>
              <SectionLabel>À prévoir selon résultats diagnostic</SectionLabel>
              <p className="text-xs text-slate-400 mb-3">
                Montants non inclus dans le total — dépend des résultats du diagnostic.
              </p>
              <ItemTable items={eventuelles} symbole={symbole} />
            </div>
          )}
        </div>

        {/* ── Bloc 2 : Frais d'achat ── */}
        {fraisAchat.length > 0 && (
          <div className="pt-5 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Frais d&apos;achat obligatoires</h3>
            <SectionLabel>Carte grise &amp; assurance</SectionLabel>
            <ItemTable items={fraisAchat} symbole={symbole} />
          </div>
        )}

      </div>
    </div>
  )
}
