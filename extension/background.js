/**
 * PhishGuard — Background Service Worker
 * Intercepts navigations and checks URLs against the backend API.
 */

const API_BASE = 'http://127.0.0.1:8000';
const RISK_THRESHOLD = 40; // Score at which we block

// Cache of recently scanned safe URLs (to avoid re-checking)
const safeUrlCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// URLs currently being processed (avoid double-checks)
const pendingChecks = new Set();

// Extension-internal URLs we should never check
const SKIP_PATTERNS = [
  'chrome://', 'chrome-extension://', 'about:', 'edge://',
  'moz-extension://', 'data:',  'blob:', 'javascript:'
];

/**
 * Check if a URL should be skipped
 */
function shouldSkip(url) {
  if (!url) return true;
  return SKIP_PATTERNS.some(pattern => url.startsWith(pattern));
}

/**
 * Check if URL is in safe cache
 */
function isCachedSafe(url) {
  const cached = safeUrlCache.get(url);
  if (!cached) return false;
  if (Date.now() - cached.time > CACHE_TTL) {
    safeUrlCache.delete(url);
    return false;
  }
  return true;
}

/**
 * Analyze URL via backend API
 */
async function analyzeUrl(url) {
  try {
    const response = await fetch(`${API_BASE}/api/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      console.error('API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to reach PhishGuard API:', err.message);
    return null;
  }
}

/**
 * Analyze email content via backend API
 */
async function analyzeEmail(subject, sender, bodyText, links) {
  try {
    const response = await fetch(`${API_BASE}/api/analyze-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        sender,
        body_text: bodyText,
        links
      })
    });

    if (!response.ok) {
      console.error('Email analysis API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to reach email analysis API:', err.message);
    return null;
  }
}

/**
 * Listen for navigation events
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only check main frame navigations
  if (details.frameId !== 0) return;

  const url = details.url;

  // Skip internal URLs
  if (shouldSkip(url)) return;

  // Skip if already cached as safe
  if (isCachedSafe(url)) return;

  // Skip if already being checked
  if (pendingChecks.has(url)) return;

  // Check if protection is enabled
  const storage = await chrome.storage.local.get('protectionEnabled');
  if (storage.protectionEnabled === false) return;

  // Check if this URL was allowed by the user
  const allowed = await chrome.storage.local.get('allowedUrls');
  const allowedUrls = allowed.allowedUrls || [];
  if (allowedUrls.includes(url)) return;

  pendingChecks.add(url);

  try {
    const result = await analyzeUrl(url);

    if (!result) {
      // API unreachable — allow navigation
      pendingChecks.delete(url);
      return;
    }

    if (result.safe) {
      // Cache as safe
      safeUrlCache.set(url, { time: Date.now(), result });
      pendingChecks.delete(url);
      return;
    }

    if (result.riskScore >= RISK_THRESHOLD) {
      // Redirect to warning page
      const warningUrl = chrome.runtime.getURL('warning.html') +
        `?url=${encodeURIComponent(url)}` +
        `&score=${result.riskScore}` +
        `&confidence=${result.confidence}` +
        `&reasons=${encodeURIComponent(JSON.stringify(result.reasons))}` +
        `&category=${result.category}`;

      chrome.tabs.update(details.tabId, { url: warningUrl });
    }
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    pendingChecks.delete(url);
  }
});

/**
 * Listen for messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_URL') {
    analyzeUrl(message.url).then(result => {
      sendResponse(result);
    }).catch(() => {
      sendResponse(null);
    });
    return true; // async response
  }

  if (message.type === 'CHECK_EMAIL') {
    // Analyze email from Gmail
    analyzeEmail(message.subject, message.sender, message.bodyText, message.links)
      .then(result => {
        if (result && result.riskScore >= RISK_THRESHOLD) {
          // Show notification for suspicious email
          const reasons = result.reasons.slice(0, 2); // First 2 reasons
          const notificationMessage = reasons.length > 0
            ? reasons.join('\n')
            : 'Suspicious content detected';

          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/shield-128.svg'),
            title: `PhishGuard Alert (${result.riskScore}/100)`,
            message: notificationMessage,
            priority: 2,
            requireInteraction: false // Auto-dismiss after 5 seconds
          });

          console.log('[PhishGuard] Email flagged:', {
            riskScore: result.riskScore,
            category: result.category,
            sender: message.sender
          });
        }
        sendResponse(result);
      })
      .catch(err => {
        console.error('Email analysis failed:', err);
        sendResponse(null);
      });
    return true; // async response
  }

  if (message.type === 'ALLOW_URL') {
    // User chose to continue anyway
    chrome.storage.local.get('allowedUrls', (data) => {
      const urls = data.allowedUrls || [];
      urls.push(message.url);
      // Keep only last 100 allowed URLs
      if (urls.length > 100) urls.shift();
      chrome.storage.local.set({ allowedUrls: urls });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'GET_STATS') {
    fetch(`${API_BASE}/api/threats?limit=1`)
      .then(r => r.json())
      .then(data => sendResponse(data.stats))
      .catch(() => sendResponse(null));
    return true;
  }
});

// Initialize protection as enabled on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    protectionEnabled: true,
    allowedUrls: []
  });
  console.log('🛡️ PhishGuard installed and active');
});
