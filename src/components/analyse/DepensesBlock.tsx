import { createT } from '@/lib/i18n'
import type { DepenseItem, DepensesResult } from '@/types'

interface DepensesBlockProps {
  depenses: DepensesResult
  symbole: string
  locale?: string
}

function fmt(n: number, symbole: string): string {
  return `${n.toLocaleString()} ${symbole}`
}

function ItemTable({
  items,
  symbole,
  footer,
  t,
}: {
  items: DepenseItem[]
  symbole: string
  footer?: { label: string; min: number; max: number }
  t: (key: string) => string
}) {
  if (items.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('analyse.poste')}</th>
            <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">{t('analyse.detail')}</th>
            <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('analyse.fourchette')}</th>
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

export default function DepensesBlock({ depenses, symbole, locale = 'fr' }: DepensesBlockProps) {
  const t = createT(locale)
  const obligatoires = depenses.obligatoires ?? []
  const eventuelles = depenses.eventuelles ?? []
  const fraisAchat = depenses.fraisAchat ?? []
  const totalMin = depenses.totalObligatoiresMin ?? 0
  const totalMax = depenses.totalObligatoiresMax ?? 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <span className="text-base font-semibold text-slate-900">{t('analyse.depenses_prevoir')}</span>
        <p className="text-xs text-slate-400 mt-0.5">Estimations basées sur les prix du marché local</p>
      </div>

      <div className="p-5 space-y-7">

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('analyse.depenses_mecaniques')}</h3>

          <div className="mb-5">
            <SectionLabel>{t('analyse.a_faire_obligatoirement')}</SectionLabel>
            <ItemTable
              items={obligatoires}
              symbole={symbole}
              footer={{ label: t('analyse.total_certain'), min: totalMin, max: totalMax }}
              t={t}
            />
          </div>

          {eventuelles.length > 0 && (
            <div>
              <SectionLabel>{t('analyse.a_prevoir_selon_diagnostic')}</SectionLabel>
              <p className="text-xs text-slate-400 mb-3">{t('analyse.montants_non_inclus')}</p>
              <ItemTable items={eventuelles} symbole={symbole} t={t} />
            </div>
          )}
        </div>

        {fraisAchat.length > 0 && (
          <div className="pt-5 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('analyse.frais_achat')}</h3>
            <SectionLabel>{t('analyse.carte_grise_assurance')}</SectionLabel>
            <ItemTable items={fraisAchat} symbole={symbole} t={t} />
          </div>
        )}

      </div>
    </div>
  )
}
