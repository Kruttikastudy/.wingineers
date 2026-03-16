/**
 * PhishGuard — Warning Page Script
 * Reads URL params, populates warning UI, fetches XAI explanation,
 * and handles user feedback submission.
 */

(function () {
  const API_BASE = "http://localhost:8000";

  const params = new URLSearchParams(window.location.search);
  const url = params.get('url') || 'Unknown URL';
  const score = parseInt(params.get('score') || '0', 10);
  const confidence = parseFloat(params.get('confidence') || '0');
  const category = params.get('category') || 'unknown';
  let reasons = [];

  try {
    reasons = JSON.parse(params.get('reasons') || '[]');
  } catch {
    reasons = ['Unable to parse threat details'];
  }

  // ── Populate score ──
  const scoreValue = document.getElementById('scoreValue');
  const scoreBar = document.getElementById('scoreBar');
  const confidenceText = document.getElementById('confidenceText');

  scoreValue.textContent = score;

  let level = 'low';
  if (score >= 70) level = 'high';
  else if (score >= 40) level = 'medium';

  scoreValue.className = `score-value ${level}`;
  scoreBar.className = `score-bar-fill ${level}`;

  // Animate score bar
  setTimeout(() => {
    scoreBar.style.width = `${Math.min(score, 100)}%`;
  }, 100);

  confidenceText.textContent = `Confidence: ${(confidence * 100).toFixed(0)}%`;

  // ── Populate URL ──
  document.getElementById('urlDisplay').textContent = url;

  // ── Populate reasons ──
  const reasonsList = document.getElementById('reasonsList');
  if (reasons.length === 0) {
    reasons = ['Suspicious characteristics detected in this URL'];
  }

  reasons.forEach(reason => {
    const item = document.createElement('div');
    item.className = 'reason-item';
    item.innerHTML = `
      <div class="reason-icon">✕</div>
      <span>${escapeHtml(reason)}</span>
    `;
    reasonsList.appendChild(item);
  });

  // ── Go Back button ──
  document.getElementById('goBackBtn').addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });

  // ── Continue Anyway button ──
  document.getElementById('continueBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'ALLOW_URL',
      url: url
    }, () => {
      window.location.href = url;
    });
  });

  // ── XAI: Fetch SHAP explanation ──
  fetchXAIExplanation();

  async function fetchXAIExplanation() {
    const xaiLoading = document.getElementById('xaiLoading');
    const tokenMap = document.getElementById('tokenMap');
    const xaiCTA = document.getElementById('xaiCTA');
    const severityBadge = document.getElementById('xaiSeverityBadge');

    try {
      // Get user ID from storage
      const storage = await chrome.storage.local.get('phishguardUserId');
      const userId = storage.phishguardUserId || 'anonymous';

      const response = await fetch(`${API_BASE}/api/xai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: url,
          url: url,
          user_id: userId
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // Hide loading
      xaiLoading.style.display = 'none';

      // Show severity badge
      if (data.severity) {
        const sevClass = `severity-${data.severity.toLowerCase()}`;
        severityBadge.innerHTML = `
          <div class="severity-badge ${sevClass}">
            Fused Score: ${data.fused_score}/100 — ${data.severity}
          </div>
        `;
      }

      // Render token heatmap
      if (data.tokens && data.tokens.length > 0) {
        tokenMap.style.display = 'flex';

        data.tokens.forEach((token, i) => {
          const shapVal = data.shap_values[i] || 0;
          const color = getTokenColor(shapVal);

          const span = document.createElement('span');
          span.className = 'token';
          span.style.backgroundColor = color;
          span.style.color = '#fff';
          span.textContent = token;

          // Tooltip
          const tooltip = document.createElement('span');
          tooltip.className = 'token-tooltip';
          tooltip.textContent = `SHAP: ${shapVal >= 0 ? '+' : ''}${shapVal.toFixed(4)}`;
          span.appendChild(tooltip);

          tokenMap.appendChild(span);
        });
      } else {
        // Fallback: no tokens
        tokenMap.style.display = 'block';
        tokenMap.innerHTML = `<span style="color: rgba(255,255,255,0.4); font-size: 13px;">
          Token-level analysis not available for this URL.
          ${data.fallback ? '(Model confidence only)' : ''}
        </span>`;
      }

      // Show CTA
      if (data.cta) {
        xaiCTA.style.display = 'block';
        xaiCTA.innerHTML = `<strong>Recommendation:</strong> ${escapeHtml(data.cta)}`;
      }

    } catch (err) {
      console.error('[PhishGuard] XAI fetch failed:', err);
      xaiLoading.innerHTML = `<span style="color: rgba(255,255,255,0.3);">
        AI explanation unavailable — ${escapeHtml(err.message || 'backend unreachable')}
      </span>`;
    }
  }

  /**
   * Map SHAP value to RGB color.
   * Positive (phishing signal) → red
   * Negative (safe signal) → green
   * Near zero → transparent gray
   */
  function getTokenColor(shapVal) {
    const absVal = Math.abs(shapVal);
    const intensity = Math.min(absVal * 3, 1); // Scale up for visibility

    if (shapVal > 0.01) {
      // Red (phishing)
      return `rgba(239, 68, 68, ${0.15 + intensity * 0.6})`;
    } else if (shapVal < -0.01) {
      // Green (safe)
      return `rgba(34, 197, 94, ${0.15 + intensity * 0.6})`;
    } else {
      // Neutral
      return `rgba(255, 255, 255, 0.05)`;
    }
  }

  // ── Feedback buttons ──
  document.getElementById('feedbackSafe').addEventListener('click', () => {
    submitFeedback('safe');
  });

  document.getElementById('feedbackPhishing').addEventListener('click', () => {
    submitFeedback('phishing');
  });

  async function submitFeedback(userLabel) {
    const safeBtn = document.getElementById('feedbackSafe');
    const phishBtn = document.getElementById('feedbackPhishing');
    const thanks = document.getElementById('feedbackThanks');

    // Disable buttons
    safeBtn.classList.add('submitted');
    phishBtn.classList.add('submitted');

    try {
      // Get user ID
      const storage = await chrome.storage.local.get('phishguardUserId');
      const userId = storage.phishguardUserId || 'anonymous';

      // Send feedback via background script
      chrome.runtime.sendMessage({
        type: 'SUBMIT_FEEDBACK',
        url: url,
        originalVerdict: category,
        originalScore: score,
        userLabel: userLabel,
        userId: userId
      });

      // Show thanks
      thanks.style.display = 'block';
    } catch (err) {
      console.error('[PhishGuard] Feedback submission error:', err);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
