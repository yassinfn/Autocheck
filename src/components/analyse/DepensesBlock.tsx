import type { DepensesResult } from '@/types'

interface DepensesBlockProps {
  depenses: DepensesResult
  symbole: string
}

function fmt(n: number, symbole: string): string {
  return `${n.toLocaleString('fr-FR')} ${symbole}`
}

export default function DepensesBlock({ depenses, symbole }: DepensesBlockProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <span className="text-base font-semibold text-slate-900">Dépenses à prévoir</span>
        <p className="text-xs text-slate-400 mt-0.5">Estimations basées sur les prix du marché local</p>
      </div>

      <div className="p-5">
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
              {depenses.items.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-800 align-top">{item.poste}</td>
                  <td className="py-3 pr-4 text-slate-500 hidden sm:table-cell align-top">{item.detail}</td>
                  <td className="py-3 text-right text-slate-700 whitespace-nowrap align-top">
                    {fmt(item.montantMin, symbole)} – {fmt(item.montantMax, symbole)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td colSpan={2} className="py-3 pr-4 font-bold text-slate-900">Total estimé</td>
                <td className="py-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                  {fmt(depenses.totalMin, symbole)} – {fmt(depenses.totalMax, symbole)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
