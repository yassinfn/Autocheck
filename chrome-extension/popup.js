const AUTOCHECK_URL = 'https://autocheck-green.vercel.app'

const SUPPORTED_SITES = {
  'leboncoin.fr': 'LeBonCoin',
  'lacentrale.fr': 'La Centrale',
  'autoscout24.fr': 'AutoScout24',
  'autoscout24.com': 'AutoScout24',
  'autoscout24.de': 'AutoScout24',
  'autoscout24.es': 'AutoScout24',
  'autoscout24.it': 'AutoScout24',
  'autoscout24.be': 'AutoScout24',
  'mobile.de': 'Mobile.de',
  'autotrader.co.uk': 'AutoTrader UK',
  'autotrader.com': 'AutoTrader',
  'autotrader.ca': 'AutoTrader CA',
  'cargurus.com': 'CarGurus',
  'cargurus.ca': 'CarGurus CA',
  'cars.com': 'Cars.com',
  'coches.net': 'Coches.net',
  'milanuncios.com': 'Milanuncios',
  'subito.it': 'Subito.it',
  'standvirtual.com': 'StandVirtual',
  'kijiji.ca': 'Kijiji',
  'paruvendu.fr': 'ParuVendu',
  'largus.fr': 'L\'Argus',
  'facebook.com': 'Facebook Marketplace',
  'olx.com': 'OLX',
  'avito.ma': 'Avito',
  'dubizzle.com': 'Dubizzle',
}

function getSiteName(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    for (const [domain, name] of Object.entries(SUPPORTED_SITES)) {
      if (hostname.includes(domain)) return name
    }
  } catch {}
  return null
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getCurrentTab()
  const siteName = getSiteName(tab.url)
  const statusEl = document.getElementById('site-status')
  const btn = document.getElementById('btn-analyse')

  if (siteName) {
    statusEl.innerHTML = `
      <div class="site-detected">
        ✅ Annonce détectée sur <strong>${siteName}</strong>
      </div>
    `
  } else {
    statusEl.innerHTML = `
      <div class="site-not-detected">
        ⚠️ Ce site n'est pas un site d'annonces auto reconnu. L'analyse peut quand même fonctionner.
      </div>
    `
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Récupération...'

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getPageContent',
      })

      if (response && response.text) {
        const url = encodeURIComponent(response.url)
        const text = encodeURIComponent(response.text)
        const base = `${AUTOCHECK_URL}/analyse?`
        const full = `${base}url=${url}&text=${text}`
        const analyseUrl = full.length > 8000 ? `${base}text=${text}` : full
        chrome.tabs.create({ url: analyseUrl })
        window.close()
      } else {
        throw new Error('Impossible de récupérer le contenu')
      }
    } catch {
      // Fallback : ouvrir avec l'URL seule (content script non injecté ou page non supportée)
      const url = encodeURIComponent(tab.url)
      chrome.tabs.create({ url: `${AUTOCHECK_URL}/analyse?url=${url}` })
      window.close()
    }
  })
})
