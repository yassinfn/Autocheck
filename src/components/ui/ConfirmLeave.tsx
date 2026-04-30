interface ConfirmLeaveProps {
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmLeave({ onConfirm, onCancel }: ConfirmLeaveProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <p className="text-base font-semibold text-slate-900">Modifications non sauvegardées</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Vous avez des modifications non sauvegardées. Voulez-vous les ignorer et changer d&apos;étape ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Rester sur cette étape
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Ignorer les modifications
          </button>
        </div>
      </div>
    </div>
  )
}
