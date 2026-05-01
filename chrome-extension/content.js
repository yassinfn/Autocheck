// Runs on supported listing pages — relays page content to the popup on request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    sendResponse({
      url: window.location.href,
      text: document.body.innerText.slice(0, 15000),
      title: document.title,
    })
  }
  return true
})
