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
  'largus.fr': "L'Argus",
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
      console.log('[AutoCheck] Récupération du contenu de la page...')

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getPageContent',
      })

      console.log('[AutoCheck] Contenu reçu:', response ? 'OK' : 'VIDE')
      console.log('[AutoCheck] URL:', response?.url?.slice(0, 50))
      console.log('[AutoCheck] Texte length:', response?.text?.length)

      if (response && response.text) {
        console.log('[AutoCheck] Envoi vers bookmarklet-store...')

        const res = await fetch(`${AUTOCHECK_URL}/api/bookmarklet-store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: response.url, text: response.text }),
        })

        console.log('[AutoCheck] Store response status:', res.status)

        const data = await res.json()
        console.log('[AutoCheck] Token reçu:', data.token)

        if (data.token) {
          const analyseUrl = `${AUTOCHECK_URL}/analyse?token=${data.token}`
          console.log('[AutoCheck] Ouverture:', analyseUrl)
          chrome.tabs.create({ url: analyseUrl })
          window.close()
        } else {
          throw new Error('Pas de token reçu: ' + JSON.stringify(data))
        }
      } else {
        throw new Error('Pas de contenu reçu depuis la page')
      }
    } catch (error) {
      console.error('[AutoCheck] ERREUR:', error.message)

      btn.disabled = false
      btn.innerHTML = '🔍 Analyser cette annonce'

      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = 'background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px;margin-top:10px;font-size:11px;color:#991b1b;word-break:break-all;'
      errorDiv.textContent = error.message
      document.querySelector('.content').appendChild(errorDiv)
    }
  })
})
