/**
 * PhishGuard — Warning Page Script
 * Reads URL params and populates the warning UI.
 */

(function () {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('url') || 'Unknown URL';
  const score = parseInt(params.get('score') || '0', 10);
  const confidence = parseFloat(params.get('confidence') || '0');
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
    // Tell background to whitelist this URL temporarily
    chrome.runtime.sendMessage({
      type: 'ALLOW_URL',
      url: url
    }, () => {
      // Navigate to the actual URL
      window.location.href = url;
    });
  });

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
