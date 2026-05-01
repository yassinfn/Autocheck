'use client'

import { useState } from 'react'

const BOOKMARKLET_CODE = `javascript:(async function(){var url=window.location.href;var text=document.body.innerText.slice(0,15000);var base='https://autocheck-green.vercel.app';try{var r=await fetch(base+'/api/bookmarklet-store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url,text:text})});var d=await r.json();if(d.token){window.location.href=base+'/analyse?token='+d.token;return;}}catch(e){}window.location.href=base+'/analyse?url='+encodeURIComponent(url);})();`

const STEPS = [
  {
    num: '1',
    title: 'Installez le bouton (une seule fois)',
    desc: 'Faites glisser le bouton ci-dessous dans votre barre de favoris du navigateur.',
  },
  {
    num: '2',
    title: "Naviguez sur n'importe quel site d'annonce",
    desc: 'LeBonCoin, CarGurus, AutoScout24, La Centrale, Facebook Marketplace…',
  },
  {
    num: '3',
    title: 'Cliquez sur le bouton dans votre barre',
    desc: 'Quand vous êtes sur une annonce qui vous intéresse, cliquez sur "📋 Analyser sur AutoCheck" dans votre barre de favoris.',
  },
  {
    num: '4',
    title: 'Obtenez votre analyse',
    desc: "AutoCheck s'ouvre avec l'annonce pré-remplie. L'analyse démarre automatiquement !",
  },
]

const COMPATIBLE_SITES = [
  { flag: '🇫🇷', sites: 'LeBonCoin · La Centrale · ParuVendu · AutoScout24' },
  { flag: '🇨🇦', sites: 'CarGurus · AutoTrader · Kijiji' },
  { flag: '🇬🇧', sites: 'AutoTrader UK · Gumtree' },
  { flag: '🇩🇪', sites: 'Mobile.de · AutoScout24' },
  { flag: '🇪🇸', sites: 'Coches.net · Milanuncios' },
  { flag: '🇮🇹', sites: 'Subito.it · AutoScout24' },
  { flag: '🇵🇹', sites: 'StandVirtual · CustoJusto' },
]

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET_CODE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the text
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/analyse" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">AC</span>
            </div>
            <span className="font-bold text-slate-900">AutoCheck</span>
          </a>
          <div className="ml-auto flex items-center gap-4">
            <a href="/analyse" className="text-xs text-slate-500 hover:text-slate-700">Analyser</a>
            <a href="/historique" className="text-xs text-slate-500 hover:text-slate-700">Historique</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">
            Analysez n&apos;importe quelle annonce en 1 clic
          </h1>
          <p className="text-slate-500 text-lg">
            Installez notre bouton dans votre navigateur — gratuit, sans extension
          </p>
        </div>

        {/* Bookmarklet drag zone */}
        <div className="bg-white rounded-xl border-2 border-dashed border-indigo-200 shadow-sm p-8 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-base font-semibold text-slate-800">
              Étape 1 — Faites glisser ce bouton dans votre barre de favoris :
            </p>
            <p className="text-sm text-slate-400">
              (cliquez-glissez vers le haut, dans la barre de favoris de votre navigateur)
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <span>↑</span>
              <span>Glissez ici vers votre barre de favoris</span>
              <span>↑</span>
            </div>
            {/* eslint-disable-next-line no-script-url */}
            <a
              href={BOOKMARKLET_CODE}
              draggable
              onClick={(e) => {
                e.preventDefault()
                alert('Pour installer le bouton, faites-le glisser avec la souris vers votre barre de favoris en haut du navigateur.')
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm shadow-md hover:bg-indigo-700 transition-colors cursor-move select-none ring-2 ring-indigo-300 ring-offset-2"
            >
              📋 Analyser sur AutoCheck
            </a>
            <p className="text-xs text-slate-400">
              Ce bouton s&apos;installe en le faisant glisser — pas en cliquant
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />
            <span>Sur mobile ou ça ne fonctionne pas ?</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Mobile fallback */}
          <div className="space-y-2 text-sm text-slate-500">
            <p>Copiez ce code et créez un favori manuellement avec cette URL :</p>
            <div className="flex items-start gap-2">
              <code className="flex-1 text-xs bg-slate-100 px-3 py-2.5 rounded-lg text-left break-all text-slate-600 font-mono leading-relaxed">
                {BOOKMARKLET_CODE}
              </code>
              <button
                onClick={handleCopy}
                className={`shrink-0 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Comment ça marche</h2>
          <div className="grid gap-4">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compatible sites */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Sites compatibles</h2>
          <div className="space-y-2.5">
            {COMPATIBLE_SITES.map(({ flag, sites }) => (
              <div key={flag} className="flex items-center gap-3 text-sm">
                <span className="text-xl shrink-0">{flag}</span>
                <span className="text-slate-600">{sites}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm pt-1 border-t border-slate-100 mt-3">
              <span className="text-xl shrink-0">🌍</span>
              <span className="text-slate-500 italic">
                + Tous les autres sites d&apos;annonces auto dans le monde
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pb-6">
          <a
            href="/analyse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            Ou analysez directement sur AutoCheck →
          </a>
        </div>
      </main>
    </div>
  )
}
