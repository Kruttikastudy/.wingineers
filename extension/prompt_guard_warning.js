/**
 * PhishGuard — Prompt Guard Warning Page Script
 * 
 * Reads result data from URL params or background message,
 * populates the warning page with risk score, classification,
 * matched patterns, and explanations.
 */

const CATEGORY_ICONS = {
  role_manipulation: '🎭',
  information_extraction: '🔓',
  jailbreaking: '⛓️',
  encoding_tricks: '🔐',
  command_injection: '💉',
};

function getScoreColor(score) {
  if (score >= 80) return '#ef4444';
  if (score >= 55) return '#f97316';
  if (score >= 25) return '#f59e0b';
  return '#22c55e';
}

function getScoreClass(classification) {
  return classification || 'suspicious';
}

function getBadgeClass(classification) {
  const map = {
    critical: 'cls-critical',
    dangerous: 'cls-dangerous',
    suspicious: 'cls-suspicious',
    safe: 'cls-safe',
  };
  return map[classification] || 'cls-suspicious';
}

function formatPatternName(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function populatePage(result) {
  // Score
  const scoreValue = document.getElementById('scoreValue');
  scoreValue.textContent = result.risk_score;
  scoreValue.className = 'score-value ' + getScoreClass(result.classification);

  // Score bar
  const scoreBar = document.getElementById('scoreBar');
  scoreBar.style.width = result.risk_score + '%';
  scoreBar.style.background = `linear-gradient(90deg, ${getScoreColor(result.risk_score)}, ${getScoreColor(result.risk_score)}dd)`;

  // Classification badge
  const badge = document.getElementById('classificationBadge');
  badge.textContent = (result.classification || 'unknown').toUpperCase();
  badge.className = 'classification-badge ' + getBadgeClass(result.classification);

  // Summary
  document.getElementById('summary').textContent = result.summary || 'A potential prompt injection attack was detected.';

  // Prompt display
  const promptDisplay = document.getElementById('promptDisplay');
  const promptText = result.prompt || '';
  promptDisplay.textContent = promptText.length > 500 ? promptText.substring(0, 500) + '…' : promptText;

  // Patterns
  const patternsList = document.getElementById('patternsList');
  patternsList.innerHTML = '';

  const patterns = result.matched_patterns || [];
  if (patterns.length === 0) {
    patternsList.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:13px;padding:12px 0;">No specific patterns matched.</div>';
    return;
  }

  patterns.forEach(p => {
    const item = document.createElement('div');
    item.className = 'pattern-item';

    const severityClass = p.severity >= 8 ? 'high' : p.severity >= 5 ? 'medium' : 'low';
    const severityColor = p.severity >= 8 ? '#ef4444' : p.severity >= 5 ? '#f59e0b' : '#facc15';

    let severityBars = '';
    for (let i = 0; i < 10; i++) {
      severityBars += `<div class="severity-bar ${i < p.severity ? 'filled ' + severityClass : ''}"></div>`;
    }

    item.innerHTML = `
      <div class="pattern-icon ${p.category}">
        ${CATEGORY_ICONS[p.category] || '⚠️'}
      </div>
      <div class="pattern-content">
        <div class="pattern-header">
          <span class="pattern-name">${formatPatternName(p.name)}</span>
          <span class="pattern-category">${(p.category_label || p.category || '').replace(/_/g, ' ')}</span>
        </div>
        <div class="pattern-severity">
          <span class="severity-label">Severity</span>
          <div class="severity-bars">${severityBars}</div>
          <span class="severity-number" style="color:${severityColor}">${p.severity}/10</span>
        </div>
        <div class="pattern-explanation">${p.explanation}</div>
      </div>
    `;

    patternsList.appendChild(item);
  });
}

// ── Load result data ──

document.addEventListener('DOMContentLoaded', () => {
  // Dismiss
  document.getElementById('dismissBtn').addEventListener('click', () => {
    window.close();
  });

  // Try reading from URL params first
  const params = new URLSearchParams(window.location.search);
  const resultParam = params.get('result');

  if (resultParam) {
    try {
      const result = JSON.parse(decodeURIComponent(resultParam));
      populatePage(result);
      return;
    } catch (e) {
      console.error('[PromptGuard] Failed to parse URL params:', e);
    }
  }

  // Fallback: ask background for pending result
  chrome.runtime.sendMessage({ type: 'GET_PROMPT_GUARD_RESULT' }, (result) => {
    if (result) {
      populatePage(result);
    } else {
      document.getElementById('summary').textContent = 'No analysis data available. The window may have been opened in error.';
    }
  });
});
