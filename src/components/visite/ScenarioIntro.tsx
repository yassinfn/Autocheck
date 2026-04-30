interface ScenarioIntroProps {
  marque: string
  modele: string
  annee: number
  motorisation: string
  km: number
  stepCount: number
  onStart: () => void
}

const CATEGORIES = [
  { icon: '🚗', label: 'Extérieur' },
  { icon: '🔧', label: 'Compartiment moteur' },
  { icon: '🪑', label: 'Habitacle' },
  { icon: '🔩', label: 'Dessous du véhicule' },
  { icon: '🔑', label: 'Démarrage à froid' },
  { icon: '⚠️', label: 'Points spécifiques au véhicule' },
]

export default function ScenarioIntro({
  marque, modele, annee, motorisation, km, stepCount, onStart
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
            {stepCount} étapes personnalisées générées par l&apos;IA
          </p>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Le scénario a été adapté à ce véhicule — kilométrage, motorisation et points d&apos;attention détectés à l&apos;étape 1. Suivez chaque étape dans l&apos;ordre pour ne rien oublier.
          </p>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <div key={cat.label} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-base">{cat.icon}</span>
                <span className="text-xs text-slate-600 font-medium">{cat.label}</span>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 leading-relaxed">
            <strong>Comment ça marche :</strong> chaque étape s&apos;affiche une par une. Appuyez ✅ OK, ❌ NOK ou ⏭ Passer. En cas de NOK, vous verrez immédiatement quoi faire.
          </div>

          <button
            onClick={onStart}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors"
          >
            Commencer la visite →
          </button>
        </div>
      </div>
    </div>
  )
}
