interface ScenarioIntroProps {
  marque: string
  modele: string
  annee: number
  motorisation: string
  km: number
  niveau1Count: number
  niveau2Count: number
  onStart: () => void
}

export default function ScenarioIntro({
  marque, modele, annee, motorisation, km, niveau1Count, niveau2Count, onStart
}: ScenarioIntroProps) {
  return (
    <div className="space-y-5">
      {/* Vehicle recap */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Véhicule à inspecter</p>
        <h2 className="text-xl font-bold text-slate-900">{marque} {modele} {annee}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{motorisation} — {km.toLocaleString('fr-FR')} km</p>
      </div>

      {/* Scenario card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-600 px-5 py-4">
          <h1 className="text-lg font-bold text-white">Votre scénario est prêt</h1>
          <p className="text-indigo-200 text-sm mt-0.5">
            {niveau1Count + niveau2Count} étapes personnalisées par l&apos;IA — en 2 niveaux
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Level 1 */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Contrôle rapide</p>
                <p className="text-xs text-slate-500">{niveau1Count} points — aucune connaissance requise</p>
              </div>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {[
                '👁️ Carrosserie et état visible',
                '🔑 Démarrage et voyants',
                '💧 Fuites au sol et niveaux',
                '🛞 Pneus et jantes',
                '🪑 Habitacle et équipements',
              ].map(item => (
                <p key={item} className="text-xs text-slate-600 flex items-center gap-2">{item}</p>
              ))}
            </div>
          </div>

          {/* Level 2 */}
          <div className="rounded-xl border border-slate-200 overflow-hidden opacity-75">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="w-6 h-6 rounded-full bg-slate-400 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Inspection complète</p>
                <p className="text-xs text-slate-500">{niveau2Count} points supplémentaires — optionnel</p>
              </div>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {[
                '🔧 Moteur en détail',
                '🔩 Dessous du véhicule',
                '🚗 Essai routier',
                '⚠️ Points spécifiques à ce modèle',
              ].map(item => (
                <p key={item} className="text-xs text-slate-600 flex items-center gap-2">{item}</p>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 leading-relaxed">
            <strong>Comment ça marche :</strong> commencez par le contrôle rapide. À la fin, vous déciderez si vous voulez continuer avec l&apos;inspection complète.
          </div>

          <button
            onClick={onStart}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors"
          >
            Commencer le contrôle rapide →
          </button>
        </div>
      </div>
    </div>
  )
}
