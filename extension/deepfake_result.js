/**
 * Deepfake Result Modal Controller
 * Displays analysis results with verdict, confidence, XAI explanation, and feedback
 */

const API_BASE = "https://sakshat193-wingineers-backend.hf.space"; // Local dev: "http://localhost:8000"

// State
let currentAnalysis = null;
let currentMediaUrl = null;

// DOM Elements
const loadingState = document.getElementById("loadingState");
const resultState = document.getElementById("resultState");
const errorState = document.getElementById("errorState");

const verdictText = document.getElementById("verdictText");
const verdictSubtitle = document.getElementById("verdictSubtitle");
const verdictValue = document.getElementById("verdictValue");
const confidencePercent = document.getElementById("confidencePercent");
const confidenceFill = document.getElementById("confidenceFill");
const detailsCard = document.getElementById("detailsCard");
const detailsList = document.getElementById("detailsList");

const closeBtn = document.getElementById("closeBtn");
const retryBtn = document.getElementById("retryBtn");
const closeErrorBtn = document.getElementById("closeErrorBtn");
const errorMessage = document.getElementById("errorMessage");

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  let resultReceived = false;

  function handleResult(result) {
    if (resultReceived) return; // Prevent double-display
    resultReceived = true;
    displayResult(result);
  }

  // Get analysis result from background script
  chrome.runtime.sendMessage(
    {
      type: "GET_DEEPFAKE_ANALYSIS_RESULT",
    },
    (response) => {
      if (response) {
        handleResult(response);
      }
    },
  );

  // Button handlers
  closeBtn.addEventListener("click", () => window.close());
  closeErrorBtn.addEventListener("click", () => window.close());
  retryBtn.addEventListener("click", retryAnalysis);

  // Feedback buttons
  document.getElementById("feedbackAuthentic").addEventListener("click", () => {
    submitDeepfakeFeedback("authentic");
  });
  document.getElementById("feedbackDeepfake").addEventListener("click", () => {
    submitDeepfakeFeedback("deepfake");
  });

  // Listen for analysis complete message (pushed from background via
  // chrome.runtime.sendMessage or chrome.tabs.sendMessage)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "DEEPFAKE_ANALYSIS_READY" && message.result) {
      handleResult(message.result);
    }
  });

  // Polling fallback: if the result hasn't arrived after 2s, poll every 3s
  // This handles the race where the analysis finishes between our initial
  // GET request and the onMessage listener being registered.
  setTimeout(() => {
    if (resultReceived) return;

    const pollInterval = setInterval(() => {
      if (resultReceived) {
        clearInterval(pollInterval);
        return;
      }
      chrome.runtime.sendMessage(
        { type: "GET_DEEPFAKE_ANALYSIS_RESULT" },
        (response) => {
          if (response && !resultReceived) {
            clearInterval(pollInterval);
            handleResult(response);
          }
        },
      );
    }, 3000);

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (!resultReceived) {
        showError("Analysis timed out. The backend may be slow or unreachable. Please retry.");
      }
    }, 120000);
  }, 2000);
});

/**
 * Display analysis result in the modal
 */
function displayResult(analysis) {
  currentAnalysis = analysis;
  currentMediaUrl = analysis.mediaUrl;

  if (!analysis.success) {
    showError(analysis.error || "Analysis failed");
    return;
  }

  const data = analysis.data;
  const verdict = data.verdict;
  const confidence = data.confidence;
  const reasoning = data.reasoning || null;
  const keyFactors = data.key_factors || null;

  // Hide loading, show result
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultState.classList.remove("hidden");

  // Determine verdict messaging
  let message, subtitle, color;

  if (verdict === "DEEPFAKE") {
    message = "Likely Deepfake";
    color = "deepfake";
    subtitle = reasoning ||
      "This media shows characteristics consistent with deepfake manipulation. Exercise caution with this content.";
  } else if (verdict === "AUTHENTIC") {
    message = "Likely Authentic";
    color = "authentic";
    subtitle = reasoning ||
      "This media appears to be genuine with no obvious signs of manipulation.";
  } else {
    message = "Inconclusive";
    color = "inconclusive";
    subtitle = reasoning ||
      "The analysis is inconclusive. The media may be authentic or manipulated. Human review recommended.";
  }

  // Set verdict text
  verdictText.textContent = message;
  verdictSubtitle.textContent = subtitle;

  // Set verdict value
  verdictValue.textContent = message;
  verdictValue.className = `verdict-text verdict-${color}`;

  // Set confidence
  const confPercent = Math.round(confidence * 100);
  confidencePercent.textContent = `${confPercent}%`;
  confidenceFill.style.width = `${Math.min(confPercent, 100)}%`;

  // Apply confidence color
  confidenceFill.className = `confidence-fill ${color === "deepfake" ? "high-deepfake" : "high-authentic"}`;

  // Populate key factors from LLM analysis if available
  if (keyFactors && keyFactors.length > 0) {
    detailsList.innerHTML = "";
    keyFactors.forEach((factor) => {
      const item = document.createElement("div");
      item.className = `detail-item`;
      item.innerHTML = `
        <span class="detail-label">${escapeHtml(factor.name)}</span>
        <span class="detail-value" style="color: ${factor.impact === 'high' ? '#ef4444' : factor.impact === 'medium' ? '#f59e0b' : '#6b7280'};">${escapeHtml(String(factor.value))}</span>
      `;
      detailsList.appendChild(item);
    });
    detailsCard.classList.remove("hidden");
  }
  // Also populate standard details if available
  else if (data.details && Object.keys(data.details).length > 0) {
    populateDetails(data.details);
    detailsCard.classList.remove("hidden");
  }

  // Add analysis time if available
  if (analysis.analysisTime) {
    const timeSeconds = (analysis.analysisTime / 1000).toFixed(1);
    addDetailItem("Analysis Time", `${timeSeconds}s`);
  }

  // Fetch XAI explanation
  fetchDeepfakeExplanation(verdict, confidence, data.details || {});

  // Show feedback section
  document.getElementById("feedbackSection").classList.remove("hidden");
}

/**
 * Fetch XAI explanation from the backend
 */
async function fetchDeepfakeExplanation(verdict, confidence, details) {
  const xaiSection = document.getElementById("xaiSection");
  const xaiLoading = document.getElementById("xaiLoading");
  const featureList = document.getElementById("featureList");
  const xaiCTA = document.getElementById("xaiCTA");
  const severityBadge = document.getElementById("xaiSeverityBadge");

  // Show XAI section with loading
  xaiSection.classList.remove("hidden");

  try {
    const response = await fetch(`${API_BASE}/api/xai/explain-deepfake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verdict,
        confidence,
        details,
        media_url: currentMediaUrl || "",
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // Hide loading
    xaiLoading.classList.add("hidden");

    // Show severity badge
    if (data.severity) {
      const sevClass = `severity-${escapeHtml(data.severity.toLowerCase())}`;
      severityBadge.textContent = '';
      const badge = document.createElement('div');
      badge.className = `severity-badge ${sevClass}`;
      badge.textContent = `Risk Score: ${data.risk_score}/100 — ${data.severity}`;
      severityBadge.appendChild(badge);
    }

    // Show features
    if (data.features && data.features.length > 0) {
      featureList.classList.remove("hidden");
      featureList.innerHTML = "";

      data.features.forEach((feature) => {
        const item = document.createElement("div");
        item.className = `feature-item impact-${feature.impact}`;
        item.innerHTML = `
          <span class="feature-name">${escapeHtml(feature.name)}</span>
          <span class="feature-value">${escapeHtml(feature.value)}</span>
        `;
        featureList.appendChild(item);
      });
    }

    // Show CTA
    if (data.cta) {
      xaiCTA.classList.remove("hidden");
      xaiCTA.innerHTML = `<strong>Recommendation:</strong> ${escapeHtml(data.cta)}`;
    }
  } catch (err) {
    const errMsg = (err && err.message) ? err.message : "backend unreachable";
    xaiLoading.innerHTML = `<span style="color: rgba(255,255,255,0.3);">
      AI explanation unavailable &mdash; ${escapeHtml(errMsg)}
    </span>`;
  }
}

/**
 * Submit feedback on the deepfake detection
 */
async function submitDeepfakeFeedback(userLabel) {
  const authBtn = document.getElementById("feedbackAuthentic");
  const dfBtn = document.getElementById("feedbackDeepfake");
  const thanks = document.getElementById("feedbackThanks");

  // Disable buttons
  authBtn.classList.add("submitted");
  dfBtn.classList.add("submitted");

  try {
    const storage = await chrome.storage.local.get("phishguardUserId");
    const userId = storage.phishguardUserId || "anonymous";

    chrome.runtime.sendMessage({
      type: "SUBMIT_DEEPFAKE_FEEDBACK",
      mediaUrl: currentMediaUrl || "",
      originalVerdict: currentAnalysis?.data?.verdict || "UNKNOWN",
      originalConfidence: currentAnalysis?.data?.confidence || 0,
      userLabel,
      userId,
    });

    thanks.style.display = "block";
  } catch (err) {
    console.error("[PhishGuard] Deepfake feedback error:", err);
  }
}

/**
 * Populate details card with analysis information
 */
function populateDetails(details) {
  detailsList.innerHTML = "";

  // Video-specific details
  if (details.frames_analyzed !== undefined) {
    addDetailItem(
      "Frames Analyzed",
      `${details.frames_analyzed}/${details.total_frames || "?"}`,
    );
  }

  if (details.average_score !== undefined) {
    const avgPercent = Math.round(details.average_score * 100);
    const label =
      details.frames_analyzed === undefined ?
        "Detection Score"
      : "Average Score";
    addDetailItem(label, `${avgPercent}%`);
  }

  if (details.faces_detected !== undefined) {
    addDetailItem("Faces Detected", details.faces_detected.toString());
  }

  if (details.score !== undefined) {
    const scorePercent = Math.round(details.score * 100);
    addDetailItem("Detection Score", `${scorePercent}%`);
  }

  if (details.max_score !== undefined) {
    const maxPercent = Math.round(details.max_score * 100);
    addDetailItem("Max Score", `${maxPercent}%`);
  }

  if (details.duration_seconds !== undefined) {
    const minutes = Math.floor(details.duration_seconds / 60);
    const seconds = Math.round(details.duration_seconds % 60);
    addDetailItem("Duration", `${minutes}m ${seconds}s`);
  }

  if (details.model) {
    const modelName = details.model.split("/").pop();
    addDetailItem("Detection Model", truncateText(modelName, 35));
  }

  if (details.method) {
    addDetailItem("Method", details.method);
  }
}

/**
 * Add a detail item to the details list
 */
function addDetailItem(label, value) {
  const item = document.createElement("div");
  item.className = "detail-item";
  item.innerHTML = `
    <span class="detail-label">${escapeHtml(label)}</span>
    <span class="detail-value">${escapeHtml(value)}</span>
  `;
  detailsList.appendChild(item);
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text, length) {
  return text.length > length ? text.substring(0, length) + "..." : text;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show error state
 */
function showError(error) {
  loadingState.classList.add("hidden");
  resultState.classList.add("hidden");
  errorState.classList.remove("hidden");

  let errorText = error;

  // Provide helpful messages for common errors
  if (error.includes("405") || error.includes("404")) {
    errorText =
      "The deepfake detection API is not available. Make sure the backend server is running on port 8000.";
  } else if (error.includes("DRM")) {
    errorText =
      "This media is protected by DRM and cannot be analyzed. Try downloading it first if permitted.";
  } else if (error.includes("too large")) {
    errorText = "The file is too large. Maximum file size is 500MB.";
  } else if (error.includes("CORS")) {
    errorText =
      "Unable to download this media due to website restrictions. Try uploading it directly.";
  }

  errorMessage.textContent = errorText;
}

/**
 * Retry analysis with the same media URL
 */
function retryAnalysis() {
  if (!currentMediaUrl) {
    showError("No media URL available for retry.");
    return;
  }

  loadingState.classList.remove("hidden");
  errorState.classList.add("hidden");
  resultState.classList.add("hidden");

  // Request background script to retry
  chrome.runtime.sendMessage(
    {
      type: "RETRY_DEEPFAKE_ANALYSIS",
      mediaUrl: currentMediaUrl,
    },
    (response) => {
      if (response) {
        displayResult(response);
      } else {
        showError("Retry failed. Please try again.");
      }
    },
  );
}
