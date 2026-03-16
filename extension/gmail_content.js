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
    // Gmail's email body container - expanded to handle different Gmail layouts
    const bodyDiv = document.querySelector("div.a3s.aiL, div.a3s, .adn .gs");
    if (!bodyDiv) {
      console.log(
        "[PhishGuard] Email body container not found (tried div.a3s.aiL, div.a3s, .adn .gs)",
      );
      return null;
    }

    // Subject line - look for the heading in Gmail's header
    const subjectElement = document.querySelector(
      "h2[data-thread-id], h2[data-legacy-thread-id]",
    );
    const subject = subjectElement?.textContent?.trim() || "No Subject";

    // Sender email - look in the header area
    const senderElement = document.querySelector("span[email]");
    const sender =
      senderElement?.getAttribute("email") ||
      senderElement?.textContent?.trim() ||
      "unknown@sender.com";

    // Body text
    const bodyText = bodyDiv.innerText || "";

    // Extract all links from the email body
    const links = [];
    const linkElements = bodyDiv.querySelectorAll("a[href]");
    linkElements.forEach((a) => {
      const href = a.getAttribute("href");
      // Skip mailto, same-domain, and internal links
      if (
        href &&
        !href.startsWith("mailto:") &&
        !href.startsWith("javascript:") &&
        !href.startsWith("tel:") &&
        !href.includes("mail.google.com")
      ) {
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
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error("[PhishGuard] Error extracting email content:", err);
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
      console.log("[PhishGuard] Email already analyzed recently, skipping");
      return;
    }

    console.log("[PhishGuard] Analyzing email — linkCount:", emailData.links.length);

    // Send to background script for backend analysis
    chrome.runtime.sendMessage(
      {
        type: "CHECK_EMAIL",
        subject: emailData.subject,
        sender: emailData.sender,
        bodyText: emailData.bodyText,
        links: emailData.links,
        source: window.location.href,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[PhishGuard] Message error:", chrome.runtime.lastError);
          return;
        }

        if (response && response.riskScore >= 70) {
          showSecurityBanner(response);
        }
      },
    );

    // Mark as analyzed
    recentlyAnalyzed.add(emailData.contentHash);

    // Clean up old cache entries after TTL
    setTimeout(() => {
      recentlyAnalyzed.delete(emailData.contentHash);
    }, ANALYSIS_CACHE_TTL);
  } catch (err) {
    console.error("[PhishGuard] Error analyzing email:", err);
  }
}

/**
 * Injects a high-visibility warning banner into the Gmail UI
 */
function showSecurityBanner(result) {
  // Remove existing banner if any
  const existing = document.getElementById("phishguard-warning-banner");
  if (existing) existing.remove();

  const bodyDiv = document.querySelector("div.a3s.aiL, div.a3s, .adn .gs");
  if (!bodyDiv) return;

  const banner = document.createElement("div");
  banner.id = "phishguard-warning-banner";

  // Style the banner
  Object.assign(banner.style, {
    background: "linear-gradient(90deg, #991b1b, #ef4444)",
    color: "white",
    padding: "16px 20px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    border: "2px solid #fca5a5",
    animation: "phishguard-pulse 2s infinite ease-in-out",
  });

  // Add CSS for pulse
  if (!document.getElementById("phishguard-styles")) {
    const style = document.createElement("style");
    style.id = "phishguard-styles";
    style.textContent = `
      @keyframes phishguard-pulse {
        0% { transform: scale(1); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
        50% { transform: scale(1.01); box-shadow: 0 15px 35px -5px rgba(239, 68, 68, 0.4); }
        100% { transform: scale(1); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
      }
    `;
    document.head.appendChild(style);
  }

  const title = document.createElement("div");
  title.style.fontWeight = "800";
  title.style.fontSize = "18px";
  title.style.display = "flex";
  title.style.alignItems = "center";
  title.style.gap = "8px";
  title.textContent = `🛡️ PHISHGUARD ALERT: POTENTIAL THREAT DETECTED (${result.riskScore}/100)`;

  const body = document.createElement("div");
  body.style.fontSize = "14px";
  body.style.opacity = "0.95";
  body.textContent =
    "This email contains elements typical of phishing attacks. Use extreme caution before clicking links or downloading attachments.";

  const reasonsList = document.createElement("div");
  reasonsList.style.fontSize = "12px";
  reasonsList.style.marginTop = "4px";
  reasonsList.style.paddingLeft = "8px";
  reasonsList.style.borderLeft = "2px solid rgba(255,255,255,0.4)";

  result.reasons.slice(0, 3).forEach((reason) => {
    const r = document.createElement("div");
    r.textContent = `• ${reason}`;
    reasonsList.appendChild(r);
  });

  banner.appendChild(title);
  banner.appendChild(body);
  banner.appendChild(reasonsList);

  // Inject at the top of the body
  bodyDiv.prepend(banner);
  console.log("[PhishGuard] Security banner injected into Gmail");
}

/**
 * Monitor Gmail for new emails using MutationObserver
 * Triggers when the email pane is rendered or updated
 */
function initializeEmailMonitor() {
  // Target Gmail's main content area
  const mailContent =
    document.querySelector('div[role="main"]') || document.body;

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
    attributes: false,
  });

  console.log("[PhishGuard] Gmail email monitor initialized");
}

/**
 * Initial check when page loads (in case an email is already open)
 */
function checkExistingEmail() {
  const emailData = extractEmailContent();
  if (emailData && emailData.bodyText.length > 0) {
    console.log("[PhishGuard] Found existing open email, analyzing...");
    analyzeEmailContent(emailData);
  }
}

// Wait for Gmail's DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
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
history.pushState = function (...args) {
  originalPushState.apply(history, args);
  // Re-check for email on navigation
  setTimeout(checkExistingEmail, 500);
  return;
};

console.log("[PhishGuard] Gmail content script loaded");
