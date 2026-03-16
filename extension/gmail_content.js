/**
 * PhishGuard — Gmail Email Analyzer Content Script
 * Monitors Gmail for new emails and sends them to the backend for analysis
 * when they're not marked as spam (i.e., marked as legitimate by Gmail)
 */

const ANALYSIS_TIMEOUT = 5000; // 5 seconds

// Keep track of recently analyzed emails to avoid duplicate checks
const recentlyAnalyzed = new Set();
const ANALYSIS_CACHE_TTL = 60000; // 1 minute

/**
 * Extract email content from Gmail's DOM structure
 * Returns { subject, sender, bodyText, links } or null if email pane not found
 */
function extractEmailContent() {
  try {
    // Gmail's email body container
    const bodyDiv = document.querySelector('div.a3s.aiL');
    if (!bodyDiv) return null;

    // Subject line - look for the heading in Gmail's header
    const subjectElement = document.querySelector('h2[data-thread-id], h2[data-legacy-thread-id]');
    const subject = subjectElement?.textContent?.trim() || 'No Subject';

    // Sender email - look in the header area
    const senderElement = document.querySelector('span[email]');
    const sender = senderElement?.getAttribute('email') ||
                   senderElement?.textContent?.trim() ||
                   'unknown@sender.com';

    // Body text
    const bodyText = bodyDiv.innerText || '';

    // Extract all links from the email body
    const links = [];
    const linkElements = bodyDiv.querySelectorAll('a[href]');
    linkElements.forEach(a => {
      const href = a.getAttribute('href');
      // Skip mailto, same-domain, and internal links
      if (href &&
          !href.startsWith('mailto:') &&
          !href.startsWith('javascript:') &&
          !href.startsWith('tel:') &&
          !href.includes('mail.google.com')) {
        links.push(href);
      }
    });

    // Generate a simple hash to avoid re-analyzing the same email
    const contentHash = `${subject}_${sender}_${bodyText.substring(0, 100)}`;

    return {
      subject,
      sender,
      bodyText,
      links: [...new Set(links)], // Remove duplicates
      contentHash,
      timestamp: Date.now()
    };
  } catch (err) {
    console.error('[PhishGuard] Error extracting email content:', err);
    return null;
  }
}

/**
 * Send email for analysis to the backend
 */
async function analyzeEmailContent(emailData) {
  try {
    // Avoid duplicate analyses within cache window
    if (recentlyAnalyzed.has(emailData.contentHash)) {
      console.log('[PhishGuard] Email already analyzed recently, skipping');
      return;
    }

    console.log('[PhishGuard] Analyzing email:', {
      subject: emailData.subject,
      from: emailData.sender,
      linkCount: emailData.links.length
    });

    // Send to background script for backend analysis
    chrome.runtime.sendMessage({
      type: 'CHECK_EMAIL',
      subject: emailData.subject,
      sender: emailData.sender,
      bodyText: emailData.bodyText,
      links: emailData.links,
      source: window.location.href
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[PhishGuard] Message error:', chrome.runtime.lastError);
        return;
      }

      if (response) {
        console.log('[PhishGuard] Analysis result:', {
          riskScore: response.riskScore,
          category: response.category
        });
      }
    });

    // Mark as analyzed
    recentlyAnalyzed.add(emailData.contentHash);

    // Clean up old cache entries after TTL
    setTimeout(() => {
      recentlyAnalyzed.delete(emailData.contentHash);
    }, ANALYSIS_CACHE_TTL);

  } catch (err) {
    console.error('[PhishGuard] Error analyzing email:', err);
  }
}

/**
 * Monitor Gmail for new emails using MutationObserver
 * Triggers when the email pane is rendered or updated
 */
function initializeEmailMonitor() {
  // Target Gmail's main content area
  const mailContent = document.querySelector('div[role="main"]') || document.body;

  const observer = new MutationObserver((mutations) => {
    // Debounce: only analyze after mutations settle
    clearTimeout(window.gmailAnalysisTimeout);
    window.gmailAnalysisTimeout = setTimeout(() => {
      const emailData = extractEmailContent();
      if (emailData && emailData.bodyText.length > 0) {
        analyzeEmailContent(emailData);
      }
    }, 500); // Wait 500ms for DOM to settle
  });

  // Listen for additions/changes to the email content area
  observer.observe(mailContent, {
    childList: true,
    subtree: true,
    characterData: false, // Ignore text changes to reduce noise
    attributes: false
  });

  console.log('[PhishGuard] Gmail email monitor initialized');
}

/**
 * Initial check when page loads (in case an email is already open)
 */
function checkExistingEmail() {
  const emailData = extractEmailContent();
  if (emailData && emailData.bodyText.length > 0) {
    console.log('[PhishGuard] Found existing open email, analyzing...');
    analyzeEmailContent(emailData);
  }
}

// Wait for Gmail's DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkExistingEmail();
    initializeEmailMonitor();
  });
} else {
  // DOM already loaded
  checkExistingEmail();
  initializeEmailMonitor();
}

// Also listen for navigation (Gmail is a SPA, so check on route changes)
// Gmail typically navigates via History API
const originalPushState = history.pushState;
history.pushState = function(...args) {
  originalPushState.apply(history, args);
  // Re-check for email on navigation
  setTimeout(checkExistingEmail, 500);
  return;
};

console.log('[PhishGuard] Gmail content script loaded');
