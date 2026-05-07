'use client'

import { useState } from 'react'
import { ChevronRight, Check, Lock, Scale, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleStatus = 'done' | 'active' | 'upcoming' | 'locked'

interface ModuleProps {
  id: number
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  status: ModuleStatus
  expanded: boolean
  onToggle: (id: number) => void
  children?: React.ReactNode
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ModuleStatus, { label: string; badgeBg: string; badgeText: string }> = {
  done:     { label: 'Terminé',     badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
  active:   { label: 'En cours',    badgeBg: 'bg-blue-100',  badgeText: 'text-blue-700'  },
  upcoming: { label: 'À venir',     badgeBg: 'bg-slate-100', badgeText: 'text-slate-600' },
  locked:   { label: 'Verrouillé',  badgeBg: 'bg-slate-100', badgeText: 'text-slate-500' },
}

// ─── Module component ─────────────────────────────────────────────────────────

function Module({ id, icon, iconBg, title, subtitle, status, expanded, onToggle, children }: ModuleProps) {
  const cfg = STATUS_CFG[status]
  const isLocked = status === 'locked'

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden${isLocked ? ' opacity-50' : ''}`}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => { if (!isLocked) onToggle(id) }}
        disabled={isLocked}
        className={`w-full px-5 py-4 flex items-center gap-4 text-left transition-colors${isLocked ? ' cursor-not-allowed' : ' hover:bg-slate-50'}`}
      >
        {/* Circle icon */}
        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>

        {/* Title + badge + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-slate-900">{title}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Right icon */}
        {isLocked
          ? <Lock size={16} className="shrink-0 text-slate-400" />
          : <ChevronRight
              size={18}
              className={`shrink-0 text-slate-400 transition-transform duration-200${expanded ? ' rotate-90' : ''}`}
            />
        }
      </button>

      {/* Accordion content */}
      <div className={`transition-all duration-200 overflow-hidden${expanded ? ' max-h-[1200px]' : ' max-h-0'}`}>
        {children && (
          <div className="border-t border-slate-100 px-5 py-5">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [expandedModule, setExpandedModule] = useState<number | null>(2)

  function handleToggle(id: number) {
    // Only switch — never close the current module by clicking it again
    if (expandedModule !== id) setExpandedModule(id)
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/analyse" className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">AC</span>
          </a>
          <span className="font-bold text-slate-900">AutoCheck</span>

          <div className="ml-auto flex items-center gap-4">
            <a href="/historique" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
              Historique
            </a>
            <button type="button" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
              PDF
            </button>

            {/* Simplified step progress */}
            <div className="hidden sm:flex items-center gap-1.5">
              {[
                { n: 1, done: true },
                { n: 2, done: false, active: true },
                { n: 3, done: false },
                { n: 4, done: false },
              ].map(({ n, done, active }) => (
                <div
                  key={n}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${done ? 'bg-green-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                >
                  {done ? '✓' : n}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── INPUT ZONE ────────────────────────────────────────────────────── */}
        <div>
          <p className="text-slate-500 text-sm mb-3">Vérifie une annonce auto en 5 secondes.</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Colle une URL d&apos;annonce ou le texte de l&apos;annonce
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                defaultValue="https://www.leboncoin.fr/ad/voitures/3130305065"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                readOnly
              />
              <button
                type="button"
                className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Analyser
              </button>
            </div>
            <p className="text-xs text-blue-600 flex items-center gap-1.5">
              <span className="text-blue-500 font-bold">ℹ</span>
              URL détectée — LeBonCoin sera scrapé automatiquement
            </p>
          </div>

          <div className="text-center mt-3">
            <button
              type="button"
              className="text-sm text-slate-500 border border-slate-300 rounded-lg px-4 py-2 hover:bg-white transition-colors"
            >
              Pas d&apos;annonce ? Saisir manuellement →
            </button>
          </div>
        </div>

        {/* ── 3 KEY CARDS ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Véhicule</p>
            <p className="text-base font-bold text-slate-900">Toyota Verso</p>
            <p className="text-sm text-slate-500 mt-0.5">2017 · 207 000 km</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Score</p>
            <p className="text-4xl font-bold text-amber-600 leading-none">
              57<span className="text-base font-normal text-slate-400">/100</span>
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Prix</p>
            <p className="text-base font-bold text-slate-900">6 990 €</p>
            <p className="text-sm text-green-600 font-medium mt-0.5">Cible : 4 790 €</p>
          </div>
        </div>

        {/* ── ACCORDION MODULES ─────────────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Module 1 — Analyse de l'annonce */}
          <Module
            id={1}
            icon={<Check size={16} className="text-green-600" />}
            iconBg="bg-green-100"
            title="Analyse de l'annonce"
            subtitle="Score initial 57 · 5 risques détectés"
            status="done"
            expanded={expandedModule === 1}
            onToggle={handleToggle}
          >
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                Véhicule au kilométrage très élevé pour son âge, anomalie kilométrique signalée
                par Autoviza. Score de 57/100 avec plusieurs points d&apos;attention sur l&apos;état
                mécanique prévisible.
              </p>
              <div className="space-y-2">
                {[
                  "Anomalie kilométrique — seulement 4 relevés en 8 ans",
                  "Immatriculation non vérifiée — Autoviza n'a pas pu vérifier",
                  "FAP/EGR à risque — diesel à fort kilométrage",
                ].map((risk, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2.5 border border-orange-100">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-orange-500" />
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </Module>

          {/* Module 2 — Questions au vendeur */}
          <Module
            id={2}
            icon={<span className="text-sm font-bold text-blue-600">2</span>}
            iconBg="bg-blue-100"
            title="Questions au vendeur"
            subtitle="+15 pts de précision · ~ 2 min"
            status="active"
            expanded={expandedModule === 2}
            onToggle={handleToggle}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                5 questions à poser. Colle ensuite les réponses ci-dessous.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                {[
                  "Avez-vous le carnet d'entretien complet avec factures ?",
                  "Le FAP a-t-il déjà été remplacé ou nettoyé ?",
                  "Quand a été fait le dernier contrôle technique ?",
                ].map((q, i) => (
                  <p key={i} className="text-sm font-medium text-slate-800">
                    {i + 1}. {q}
                  </p>
                ))}
              </div>

              <textarea
                placeholder="Colle ici les réponses du vendeur..."
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Analyser les réponses
                </button>
                <button
                  type="button"
                  className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Passer cette étape
                </button>
              </div>
            </div>
          </Module>

          {/* Module 3 — Inspection sur place */}
          <Module
            id={3}
            icon={<span className="text-sm font-bold text-slate-500">3</span>}
            iconBg="bg-slate-200"
            title="Inspection sur place"
            subtitle="+20 pts de précision · ~ 15 min"
            status="upcoming"
            expanded={expandedModule === 3}
            onToggle={handleToggle}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Scénario d&apos;inspection sur-mesure : 12 étapes niveau 1, 8 étapes niveau 2.
              </p>
              <button
                type="button"
                className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Commencer l&apos;inspection
              </button>
            </div>
          </Module>

          {/* Module 4 — Décision finale (locked) */}
          <Module
            id={4}
            icon={<Scale size={16} className="text-slate-400" />}
            iconBg="bg-slate-100"
            title="Décision finale"
            subtitle="Disponible dès qu'une étape est complétée"
            status="locked"
            expanded={false}
            onToggle={handleToggle}
          />
        </div>

        {/* ── BOTTOM BUTTONS ────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-2 pb-8">
          <button
            type="button"
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          >
            Modifier
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          >
            Télécharger PDF
          </button>
        </div>

      </main>
    </div>
  )
}
