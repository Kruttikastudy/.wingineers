/**
 * PhishGuard — Content Script
 * Injected into all web pages to intercept link clicks.
 */

(function () {
  'use strict';

  // Skip if already injected
  if (window.__phishGuardInjected) return;
  window.__phishGuardInjected = true;

  /**
   * Find the closest anchor tag from an event target
   */
  function findAnchor(el) {
    while (el && el.tagName !== 'A') {
      el = el.parentElement;
    }
    return el;
  }

  /**
   * Handle link clicks — intercept and check URL
   */
  document.addEventListener('click', async (e) => {
    const anchor = findAnchor(e.target);
    if (!anchor || !anchor.href) return;

    const url = anchor.href;

    // Skip same-page anchors and non-http links
    // Note: anchor.href (DOM property) returns fully resolved URLs,
    // so we use getAttribute to check the original href value
    const rawHref = anchor.getAttribute('href') || '';
    if (rawHref.startsWith('#') || rawHref.startsWith('javascript:') ||
        rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      return;
    }

    // Skip same-domain links (likely internal navigation)
    try {
      const linkDomain = new URL(url).hostname;
      const pageDomain = window.location.hostname;
      if (linkDomain === pageDomain) return;
    } catch {
      // If URL parse fails, let background handle it
    }

    // Don't block — just notify background script for tracking
    // The background script's webNavigation listener will handle blocking
    try {
      chrome.runtime.sendMessage({
        type: 'CHECK_URL',
        url: url,
        source: window.location.href
      });
    } catch {
      // Extension context may be invalidated — ignore
    }
  }, true);

  /**
   * Monitor dynamically added links and add visual indicators
   */
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        const links = node.tagName === 'A' ? [node] : (node.querySelectorAll ? node.querySelectorAll('a[href]') : []);
        // Future: could add visual indicators to suspicious links
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
