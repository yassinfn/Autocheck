interface LevelTransitionProps {
  niveau1Total: number
  ok: number
  nok: number
  passe: number
  niveau2Count: number
  onContinue: () => void
  onEnd: () => void
}

export default function LevelTransition({
  niveau1Total, ok, nok, passe, niveau2Count, onContinue, onEnd,
}: LevelTransitionProps) {
  return (
    <div className="space-y-5">
      {/* Success header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">✅</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Contrôle rapide terminé</h2>
        <p className="text-sm text-slate-500 mt-1">{niveau1Total} points vérifiés</p>
      </div>

      {/* Score counts */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{ok}</p>
          <p className="text-xs text-green-700 font-medium mt-0.5">OK</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{nok}</p>
          <p className="text-xs text-red-700 font-medium mt-0.5">NOK</p>
        </div>
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-500">{passe}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Passés</p>
        </div>
      </div>

      {/* Choice card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div>
          <p className="text-base font-bold text-slate-900">Vous avez fait l&apos;essentiel !</p>
          <p className="text-sm text-slate-500 mt-1">
            Voulez-vous aller plus loin avec une inspection technique complète ?
          </p>
        </div>

        {/* Level 2 preview */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-indigo-700 mb-1">
            Inspection complète — {niveau2Count} points supplémentaires
          </p>
          <p className="text-xs text-indigo-600 leading-relaxed">
            Compartiment moteur en détail, dessous du véhicule, essai routier et points spécifiques à ce modèle.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={onContinue}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors"
          >
            Oui, inspecter en détail →
          </button>
          <button
            onClick={onEnd}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
          >
            Non, terminer la visite
          </button>
        </div>
      </div>
    </div>
  )
}
