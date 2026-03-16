/**
 * PhishGuard — Background Service Worker
 * Intercepts navigations and checks URLs against the backend API.
 */

const API_BASE = "http://localhost:8000";
const RISK_THRESHOLD = 40; // Score at which we block

// Cache of recently scanned safe URLs (to avoid re-checking)
const safeUrlCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// URLs currently being processed (avoid double-checks)
const pendingChecks = new Set();

// Deepfake detection constants
const DEEPFAKE_API_ENDPOINT = `${API_BASE}/detect`;
const DEEPFAKE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const deepfakeCache = new Map(); // {mediaUrl: {timestamp, result}}
const pendingDeepfakeChecks = new Map(); // {mediaUrl: Promise}
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

// Store for result modal window
let deepfakeResultWindow = null;
let pendingDeepfakeResult = null;

// Extension-internal URLs we should never check
const SKIP_PATTERNS = [
  "chrome://",
  "chrome-extension://",
  "about:",
  "edge://",
  "moz-extension://",
  "data:",
  "blob:",
  "javascript:",
];

/**
 * Check if a URL should be skipped
 */
function shouldSkip(url) {
  if (!url) return true;
  return SKIP_PATTERNS.some((pattern) => url.startsWith(pattern));
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.error("API error:", response.status);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("Failed to reach PhishGuard API:", err.message);
    return null;
  }
}

/**
 * Analyze email content via backend API
 */
async function analyzeEmail(subject, sender, bodyText, links) {
  try {
    const response = await fetch(`${API_BASE}/api/analyze-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        sender,
        body_text: bodyText,
        links,
      }),
    });

    if (!response.ok) {
      console.error("Email analysis API error:", response.status);
      return null;
    }

    const result = await response.json();
    console.log("[PhishGuard] Email analysis result from API:", result);
    return result;
  } catch (err) {
    console.error("Failed to reach email analysis API:", err.message);
    return null;
  }
}

/**
 * Analyze media for deepfakes
 */
async function analyzeMediaForDeepfake(mediaUrl, mediaType) {
  try {
    // Detect streaming platform - show graceful error
    const platform = detectStreamingPlatform(mediaUrl);
    if (platform) {
      return {
        success: false,
        error: `${platform.toUpperCase()} videos are protected by DRM and cannot be directly analyzed. Try downloading the video first if permitted.`,
        mediaUrl,
        timestamp: Date.now(),
      };
    }

    // Check cache first
    const cached = deepfakeCache.get(mediaUrl);
    if (cached && Date.now() - cached.timestamp < DEEPFAKE_CACHE_TTL) {
      return cached.result;
    }

    // Check if already processing
    if (pendingDeepfakeChecks.has(mediaUrl)) {
      return await pendingDeepfakeChecks.get(mediaUrl);
    }

    // Start download and analysis
    const promise = downloadAndAnalyzeMedia(mediaUrl, mediaType);
    pendingDeepfakeChecks.set(mediaUrl, promise);

    const result = await promise;
    pendingDeepfakeChecks.delete(mediaUrl);

    // Cache result
    deepfakeCache.set(mediaUrl, {
      timestamp: Date.now(),
      result,
    });

    // Save to history
    saveDeepfakeAnalysis(result);

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      mediaUrl,
      timestamp: Date.now(),
    };
  }
}

/**
 * Download and analyze media file
 */
async function downloadAndAnalyzeMedia(mediaUrl, mediaType) {
  try {
    console.log(
      "[PhishGuard] Downloading media for deepfake analysis:",
      mediaUrl,
    );

    // Enforce HTTPS for media downloads to prevent MITM
    if (!mediaUrl.startsWith('https://')) {
      throw new Error('Only HTTPS media URLs are supported for security');
    }

    // Download file
    const response = await fetch(mediaUrl, {
      method: "GET",
      headers: { Accept: "*/*" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to download media`);
    }

    // Check file size
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      const sizeMB = Math.round(parseInt(contentLength) / 1024 / 1024);
      throw new Error(`File too large (${sizeMB}MB). Maximum file size: 500MB`);
    }

    const blob = await response.blob();

    // Prepare FormData for multipart upload
    const formData = new FormData();
    const fileName = getFileNameFromUrl(mediaUrl, mediaType);
    formData.append("file", blob, fileName);

    console.log("[PhishGuard] Uploading to deepfake detection API...");

    // Send to backend
    const startTime = Date.now();
    const analysisResponse = await fetch(DEEPFAKE_API_ENDPOINT, {
      method: "POST",
      body: formData,
      // Do NOT set Content-Type header - browser will set it with boundary
    });

    if (!analysisResponse.ok) {
      throw new Error(`Backend error: HTTP ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysisTime = Date.now() - startTime;

    // Normalize verdict
    const verdict =
      analysisData.is_deepfake === true ? "DEEPFAKE"
      : analysisData.is_deepfake === false ? "AUTHENTIC"
      : "INCONCLUSIVE";

    console.log("[PhishGuard] Deepfake analysis complete:", {
      verdict,
      confidence: analysisData.confidence,
      analysisTime,
    });

    return {
      success: true,
      mediaUrl,
      timestamp: Date.now(),
      analysisTime,
      data: {
        is_deepfake: analysisData.is_deepfake,
        confidence: analysisData.confidence,
        verdict,
        details: analysisData.details || {},
      },
    };
  } catch (error) {
    console.error("[PhishGuard] Deepfake analysis error:", error);
    throw error;
  }
}

/**
 * Get file name from URL
 */
function getFileNameFromUrl(url, mediaType = "video") {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let fileName = pathname.substring(pathname.lastIndexOf("/") + 1) || "media";

    // Ensure extension if missing
    if (!fileName.includes(".")) {
      if (mediaType === "audio") {
        fileName += ".mp3";
      } else if (mediaType === "image") {
        fileName += ".jpg";
      } else {
        fileName += ".mp4"; // Default to mp4 for video or auto
      }
    }

    return fileName;
  } catch {
    if (mediaType === "audio") return "media.mp3";
    if (mediaType === "image") return "media.jpg";
    return "media.mp4";
  }
}

/**
 * Detect streaming platform from URL
 */
function detectStreamingPlatform(url) {
  if (!url) return null;
  const urlLower = url.toLowerCase();

  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be"))
    return "youtube";
  if (urlLower.includes("twitter.com") || urlLower.includes("x.com"))
    return "twitter";
  if (urlLower.includes("tiktok.com")) return "tiktok";
  if (urlLower.includes("instagram.com")) return "instagram";
  if (urlLower.includes("facebook.com")) return "facebook";

  return null;
}

/**
 * Save deepfake analysis to history
 */
async function saveDeepfakeAnalysis(result) {
  try {
    const storage = await chrome.storage.local.get("deepfakeHistory");
    const history = storage.deepfakeHistory || [];

    // Add new result
    history.unshift({
      timestamp: result.timestamp,
      mediaUrl: result.mediaUrl,
      success: result.success,
      verdict: result.data?.verdict || "ERROR",
      confidence: result.data?.confidence || 0,
    });

    // Keep only last 100 analyses
    if (history.length > 100) history.splice(100);

    await chrome.storage.local.set({ deepfakeHistory: history });
  } catch (err) {
    console.error("[PhishGuard] Failed to save deepfake analysis:", err);
  }
}

/**
 * Create context menus for deepfake detection
 */
function createDeepfakeContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Video elements context menu
    chrome.contextMenus.create({
      id: "deepfake-check-video",
      title: "🎬 Check for Deepfakes",
      contexts: ["video"],
    });

    // Audio elements context menu
    chrome.contextMenus.create({
      id: "deepfake-check-audio",
      title: "🎵 Check for Deepfakes",
      contexts: ["audio"],
    });

    // Image elements context menu
    chrome.contextMenus.create({
      id: "deepfake-check-image",
      title: "🖼️ Check for Deepfakes",
      contexts: ["image"],
    });

    // Links to media files
    chrome.contextMenus.create({
      id: "deepfake-check-link",
      title: "🔍 Check Media for Deepfakes",
      contexts: ["link"],
      targetUrlPatterns: [
        "*://*/*.mp4",
        "*://*/*.webm",
        "*://*/*.mov",
        "*://*/*.avi",
        "*://*/*.mkv",
        "*://*/*.mp3",
        "*://*/*.wav",
        "*://*/*.ogg",
        "*://*/*.m4a",
        "*://*/*.flac",
        "*://*/*.jpg",
        "*://*/*.jpeg",
        "*://*/*.png",
        "*://*/*.webp",
        "*://*/*.avif",
      ],
    });

    console.log("[PhishGuard] Context menus created for deepfake detection");
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menuItemId = info.menuItemId;

  if (!menuItemId.startsWith("deepfake-check")) return;

  let mediaUrl = null;
  let mediaType = "auto";

  // Get media source based on context
  switch (menuItemId) {
    case "deepfake-check-video":
      mediaUrl = info.srcUrl;
      mediaType = "video";
      break;
    case "deepfake-check-audio":
      mediaUrl = info.srcUrl;
      mediaType = "audio";
      break;
    case "deepfake-check-image":
      mediaUrl = info.srcUrl;
      mediaType = "image";
      break;
    case "deepfake-check-link":
      mediaUrl = info.linkUrl;
      mediaType = inferMediaType(mediaUrl);
      break;
  }

  if (!mediaUrl) {
    console.error("[PhishGuard] No media URL found");
    return;
  }

  // Open result window and start analysis
  openDeepfakeResultModal(mediaUrl, mediaType);
});

/**
 * Infer media type from URL extension
 */
function inferMediaType(url) {
  const videoExts = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
  const audioExts = [".mp3", ".wav", ".ogg", ".m4a", ".flac"];

  for (const ext of videoExts) {
    if (url.includes(ext)) return "video";
  }
  for (const ext of audioExts) {
    if (url.includes(ext)) return "audio";
  }
  const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
  for (const ext of imageExts) {
    if (url.includes(ext)) return "image";
  }
  return "auto";
}

/**
 * Open deepfake result modal window
 */
function openDeepfakeResultModal(mediaUrl, mediaType) {
  // Close previous window if exists
  if (deepfakeResultWindow) {
    chrome.windows.remove(deepfakeResultWindow.id).catch(() => {
      // Previous result window was already closed
    });
    deepfakeResultWindow = null;
  }

  // Create window
  chrome.windows.create(
    {
      url: chrome.runtime.getURL("deepfake_result.html"),
      type: "popup",
      width: 700,
      height: 800,
      focused: true,
    },
    (window) => {
      deepfakeResultWindow = window;

      // Start analysis
      analyzeMediaForDeepfake(mediaUrl, mediaType).then((result) => {
        pendingDeepfakeResult = result;

        // Notify all extension pages (including our result window)
        chrome.runtime
          .sendMessage({
            type: "DEEPFAKE_ANALYSIS_READY",
            result,
          })
          .catch(() => {
            // No receivers active yet, result will be fetched on demand
          });
      });
    },
  );
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
  const storage = await chrome.storage.local.get("protectionEnabled");
  if (storage.protectionEnabled === false) return;

  // Check if this URL was allowed by the user (with expiry)
  const allowed = await chrome.storage.local.get("allowedUrls");
  let allowedUrls = allowed.allowedUrls || [];
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  // Filter expired entries
  allowedUrls = allowedUrls.filter(entry => (now - (entry.addedAt || 0)) < TWENTY_FOUR_HOURS);
  if (allowedUrls.some(entry => entry.url === url)) return;

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
      const warningUrl =
        chrome.runtime.getURL("warning.html") +
        `?url=${encodeURIComponent(url)}` +
        `&score=${result.riskScore}` +
        `&confidence=${result.confidence}` +
        `&reasons=${encodeURIComponent(JSON.stringify(result.reasons))}` +
        `&category=${encodeURIComponent(result.category || 'unknown')}`;

      chrome.tabs.update(details.tabId, { url: warningUrl });
    }
  } catch (err) {
    console.error("Check failed:", err);
  } finally {
    pendingChecks.delete(url);
  }
});

/**
 * Listen for messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_URL") {
    analyzeUrl(message.url)
      .then((result) => {
        sendResponse(result);
      })
      .catch(() => {
        sendResponse(null);
      });
    return true; // async response
  }

  if (message.type === "CHECK_EMAIL") {
    // Analyze email from Gmail
    analyzeEmail(
      message.subject,
      message.sender,
      message.bodyText,
      message.links,
    )
      .then((result) => {
        if (result && result.riskScore >= RISK_THRESHOLD) {
          console.log(
            "[PhishGuard] !!! THREAT DETECTED !!! Score:",
            result.riskScore,
          );
          chrome.action.setBadgeText({ text: result.riskScore.toString() });
          chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });

          const reasons = result.reasons.slice(0, 2);
          chrome.notifications.create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/shield-128.png"),
            title: `SECURITY ALERT (${result.riskScore}/100)`,
            message: reasons.join("\n") || "Phishing attempt detected!",
            priority: 2,
          });
        } else {
          console.log("[PhishGuard] Email safe. Score:", result?.riskScore);
          chrome.action.setBadgeText({ text: "" });
        }
        sendResponse(result);
      })
      .catch((err) => {
        console.error("Email analysis failed:", err);
        sendResponse(null);
      });
    return true; // async response
  }

  if (message.type === "ALLOW_URL") {
    // Validate: only extension pages can add to allowlist
    if (!sender.id || sender.id !== chrome.runtime.id) {
      console.warn('[PhishGuard] ALLOW_URL rejected — invalid sender:', sender.id);
      sendResponse({ ok: false, error: 'unauthorized' });
      return true;
    }

    chrome.storage.local.get("allowedUrls", (data) => {
      let urls = data.allowedUrls || [];

      // Expire entries older than 24 hours
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      urls = urls.filter(entry => (now - (entry.addedAt || 0)) < TWENTY_FOUR_HOURS);

      // Add new entry with timestamp
      urls.push({ url: message.url, addedAt: now });

      // Cap at 50 entries
      if (urls.length > 50) urls.shift();

      chrome.storage.local.set({ allowedUrls: urls });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "GET_STATS") {
    fetch(`${API_BASE}/api/threats?limit=1`)
      .then((r) => r.json())
      .then((data) => sendResponse(data.stats))
      .catch(() => sendResponse(null));
    return true;
  }

  if (message.type === "GET_DEEPFAKE_ANALYSIS_RESULT") {
    // Return pending result from context menu analysis
    if (pendingDeepfakeResult) {
      const result = pendingDeepfakeResult;
      pendingDeepfakeResult = null; // Clear after sending
      sendResponse(result);
    } else {
      sendResponse(null);
    }
    return true;
  }

  if (message.type === "RETRY_DEEPFAKE_ANALYSIS") {
    // Retry analysis for the same media URL
    analyzeMediaForDeepfake(message.mediaUrl, "auto")
      .then((result) => {
        sendResponse(result);
      })
      .catch(() => {
        sendResponse(null);
      });
    return true;
  }

  if (message.type === "SUBMIT_FEEDBACK") {
    // Submit user feedback on a detection result
    fetch(`${API_BASE}/api/xai/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: message.url,
        original_verdict: message.originalVerdict,
        original_score: message.originalScore,
        user_label: message.userLabel,
        user_id: message.userId || null,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("[PhishGuard] Feedback submitted:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("[PhishGuard] Feedback submission failed:", err);
        sendResponse(null);
      });
    return true;
  }

  if (message.type === "SUBMIT_DEEPFAKE_FEEDBACK") {
    // Submit user feedback on a deepfake detection result
    fetch(`${API_BASE}/api/xai/deepfake-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_url: message.mediaUrl,
        original_verdict: message.originalVerdict,
        original_confidence: message.originalConfidence,
        user_label: message.userLabel,
        user_id: message.userId || null,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("[PhishGuard] Deepfake feedback submitted:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("[PhishGuard] Deepfake feedback submission failed:", err);
        sendResponse(null);
      });
    return true;
  }
});

// Initialize protection as enabled on install
chrome.runtime.onInstalled.addListener(() => {
  // Generate anonymous user ID
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  const userId = 'pg_' + Date.now().toString(36) + '_' + Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
  chrome.storage.local.set({
    protectionEnabled: true,
    allowedUrls: [],
    deepfakeHistory: [],
    phishguardUserId: userId,
  });
  createDeepfakeContextMenus();
  console.log('\u{1F6E1}\uFE0F PhishGuard installed with user ID:', userId);
});

// Also create context menus on startup
chrome.runtime.onStartup.addListener(() => {
  createDeepfakeContextMenus();
});
