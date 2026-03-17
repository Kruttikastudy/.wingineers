/**
 * PhishGuard — Prompt Injection Guard Content Script
 * 
 * Monitors ALL text inputs (textarea, input, contenteditable) on every page
 * in real-time. When the user types or pastes text that matches prompt injection
 * patterns, it immediately flags the input with:
 *   1. A floating overlay warning on the page
 *   2. A red glow + shake animation on the offending field
 *   3. Sends to background.js which opens a detailed pop-up window
 */

(function () {
  'use strict';

  // Prevent double injection
  if (window.__promptGuardInjected) return;
  window.__promptGuardInjected = true;

  const DEBOUNCE_MS = 800;
  const MIN_LENGTH = 15; // Don't analyze very short text
  const RISK_THRESHOLD = 25; // Score at which we flag

  // Track active debounce timers per element
  const debounceTimers = new WeakMap();

  // Track recently checked text to avoid re-checking identical input
  const recentlyChecked = new Map();
  const CHECK_CACHE_TTL = 30000; // 30 seconds

  // Track if overlay is currently showing
  let overlayVisible = false;
  let currentOverlay = null;

  // ── Inject CSS for animations ──
  function injectStyles() {
    if (document.getElementById('__pg-prompt-guard-styles')) return;

    const style = document.createElement('style');
    style.id = '__pg-prompt-guard-styles';
    style.textContent = `
      @keyframes __pg-shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
        20%, 40%, 60%, 80% { transform: translateX(3px); }
      }

      @keyframes __pg-slideDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes __pg-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      }

      .__pg-flagged-input {
        outline: 2px solid #ef4444 !important;
        box-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
        animation: __pg-shake 0.5s ease-in-out, __pg-pulse 2s infinite !important;
      }

      .__pg-overlay-container {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        max-width: 420px;
        width: 100%;
        animation: __pg-slideDown 0.35s ease-out;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      }

      .__pg-overlay {
        background: linear-gradient(135deg, #1a0000 0%, #2d0a0a 50%, #1a0a1a 100%);
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6),
                    0 0 40px rgba(239, 68, 68, 0.15);
        color: #fff;
        backdrop-filter: blur(20px);
      }

      .__pg-overlay-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .__pg-overlay-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 800;
        color: #fca5a5;
        letter-spacing: 0.5px;
      }

      .__pg-overlay-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .__pg-badge-critical { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
      .__pg-badge-dangerous { background: rgba(249,115,22,0.2); color: #fdba74; border: 1px solid rgba(249,115,22,0.3); }
      .__pg-badge-suspicious { background: rgba(245,158,11,0.2); color: #fde68a; border: 1px solid rgba(245,158,11,0.3); }

      .__pg-overlay-close {
        background: rgba(255,255,255,0.1);
        border: none;
        color: rgba(255,255,255,0.5);
        width: 28px;
        height: 28px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.15s;
      }

      .__pg-overlay-close:hover {
        background: rgba(239, 68, 68, 0.3);
        color: #fff;
      }

      .__pg-overlay-score {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
        padding: 12px;
        background: rgba(0,0,0,0.3);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.06);
      }

      .__pg-score-number {
        font-size: 36px;
        font-weight: 900;
        line-height: 1;
      }

      .__pg-score-meta {
        flex: 1;
      }

      .__pg-score-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: rgba(255,255,255,0.4);
        margin-bottom: 4px;
      }

      .__pg-score-bar {
        width: 100%;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        overflow: hidden;
      }

      .__pg-score-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.6s ease;
      }

      .__pg-patterns-list {
        margin-bottom: 14px;
      }

      .__pg-pattern-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        font-size: 12px;
        color: rgba(255,255,255,0.7);
        line-height: 1.4;
      }

      .__pg-pattern-item:last-child { border-bottom: none; }

      .__pg-pattern-icon {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        margin-top: 1px;
      }

      .__pg-pattern-name {
        font-weight: 700;
        color: #fff;
      }

      .__pg-overlay-actions {
        display: flex;
        gap: 8px;
      }

      .__pg-btn {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
        text-align: center;
      }

      .__pg-btn-dismiss {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.7);
      }

      .__pg-btn-dismiss:hover {
        background: rgba(255,255,255,0.15);
        color: #fff;
      }

      .__pg-btn-details {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: #fff;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
      }

      .__pg-btn-details:hover {
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
  }

  // ── Score color helpers ──
  function getScoreColor(score) {
    if (score >= 80) return '#ef4444';
    if (score >= 55) return '#f97316';
    if (score >= 25) return '#f59e0b';
    return '#22c55e';
  }

  function getClassification(classification) {
    const map = {
      critical: { label: 'CRITICAL', badge: '__pg-badge-critical' },
      dangerous: { label: 'DANGEROUS', badge: '__pg-badge-dangerous' },
      suspicious: { label: 'SUSPICIOUS', badge: '__pg-badge-suspicious' },
    };
    return map[classification] || map.suspicious;
  }

  const CATEGORY_ICONS = {
    role_manipulation: '🎭',
    information_extraction: '🔓',
    jailbreaking: '⛓️',
    encoding_tricks: '🔐',
    command_injection: '💉',
  };

  // ── Show floating overlay ──
  function showOverlay(result) {
    removeOverlay();
    injectStyles();

    const cls = getClassification(result.classification);
    const scoreColor = getScoreColor(result.risk_score);
    const patterns = result.matched_patterns || [];

    const container = document.createElement('div');
    container.className = '__pg-overlay-container';
    container.id = '__pg-prompt-guard-overlay';

    container.innerHTML = `
      <div class="__pg-overlay">
        <div class="__pg-overlay-header">
          <div class="__pg-overlay-title">
            🛡️ Prompt Injection Detected
          </div>
          <button class="__pg-overlay-close" id="__pg-close-overlay">✕</button>
        </div>

        <div class="__pg-overlay-score">
          <div class="__pg-score-number" style="color: ${scoreColor}">${result.risk_score}</div>
          <div class="__pg-score-meta">
            <div class="__pg-score-label">Risk Score</div>
            <div class="__pg-score-bar">
              <div class="__pg-score-bar-fill" style="width: ${result.risk_score}%; background: ${scoreColor};"></div>
            </div>
          </div>
          <div class="__pg-overlay-badge ${cls.badge}">${cls.label}</div>
        </div>

        <div class="__pg-patterns-list">
          ${patterns.slice(0, 3).map(p => `
            <div class="__pg-pattern-item">
              <div class="__pg-pattern-icon" style="background: rgba(239,68,68,0.15);">
                ${CATEGORY_ICONS[p.category] || '⚠️'}
              </div>
              <div>
                <span class="__pg-pattern-name">${p.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                — ${p.explanation.substring(0, 90)}${p.explanation.length > 90 ? '…' : ''}
              </div>
            </div>
          `).join('')}
          ${patterns.length > 3 ? `<div style="font-size:11px;color:rgba(255,255,255,0.3);padding:4px 0;">+${patterns.length - 3} more patterns detected</div>` : ''}
        </div>

        <div class="__pg-overlay-actions">
          <button class="__pg-btn __pg-btn-dismiss" id="__pg-dismiss-overlay">Dismiss</button>
          <button class="__pg-btn __pg-btn-details" id="__pg-view-details">⚡ View Full Report</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    overlayVisible = true;
    currentOverlay = container;

    // Close button
    container.querySelector('#__pg-close-overlay').addEventListener('click', removeOverlay);
    container.querySelector('#__pg-dismiss-overlay').addEventListener('click', removeOverlay);

    // View details opens full pop-up
    container.querySelector('#__pg-view-details').addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'OPEN_PROMPT_GUARD_WARNING',
        result: result,
      });
    });

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      if (overlayVisible) removeOverlay();
    }, 15000);
  }

  // ── Remove overlay ──
  function removeOverlay() {
    const el = document.getElementById('__pg-prompt-guard-overlay');
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-20px)';
      el.style.transition = 'all 0.2s ease';
      setTimeout(() => el.remove(), 200);
    }
    overlayVisible = false;
    currentOverlay = null;
  }

  // ── Flag the input element ──
  function flagInput(el) {
    el.classList.add('__pg-flagged-input');
    setTimeout(() => {
      el.classList.remove('__pg-flagged-input');
    }, 4000);
  }

  // ── Get text from element ──
  function getTextFromElement(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value || '';
    }
    // contenteditable
    return el.innerText || el.textContent || '';
  }

  // ── Check prompt via background ──
  async function checkPrompt(text, element) {
    // Skip if too short
    if (!text || text.trim().length < MIN_LENGTH) return;

    // Skip if recently checked with same text
    const textHash = text.trim().substring(0, 200);
    if (recentlyChecked.has(textHash)) {
      const cached = recentlyChecked.get(textHash);
      if (Date.now() - cached.time < CHECK_CACHE_TTL) {
        // If it was an injection, still show the overlay
        if (cached.result && cached.result.is_injection) {
          flagInput(element);
          showOverlay(cached.result);
        }
        return;
      }
      recentlyChecked.delete(textHash);
    }

    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'CHECK_PROMPT', prompt: text },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve(response);
          }
        );
      });

      if (!result) return;

      // Cache the result
      recentlyChecked.set(textHash, { time: Date.now(), result });

      if (result.is_injection && result.risk_score >= RISK_THRESHOLD) {
        console.log('[PromptGuard] 🚨 INJECTION DETECTED!', {
          score: result.risk_score,
          classification: result.classification,
          patterns: result.matched_patterns?.length,
        });

        flagInput(element);
        showOverlay(result);

        // Tell background to open full warning + notification
        chrome.runtime.sendMessage({
          type: 'PROMPT_INJECTION_DETECTED',
          result: result,
          sourceUrl: window.location.href,
        });
      }
    } catch (err) {
      // Extension context may be invalidated — silently ignore
      console.debug('[PromptGuard] Check failed:', err.message);
    }
  }

  // ── Attach monitor to an element ──
  function attachMonitor(el) {
    if (el.__pgMonitorAttached) return;
    el.__pgMonitorAttached = true;

    const handler = () => {
      // Clear existing debounce
      const existingTimer = debounceTimers.get(el);
      if (existingTimer) clearTimeout(existingTimer);

      // Set new debounce
      const timer = setTimeout(() => {
        const text = getTextFromElement(el);
        checkPrompt(text, el);
      }, DEBOUNCE_MS);

      debounceTimers.set(el, timer);
    };

    el.addEventListener('input', handler);
    el.addEventListener('paste', () => {
      // On paste, check immediately with a short delay for the value to populate
      setTimeout(() => {
        const text = getTextFromElement(el);
        checkPrompt(text, el);
      }, 100);
    });
  }

  // ── Find and attach to all input elements ──
  function scanAndAttach(root) {
    const selectors = 'textarea, input[type="text"], input:not([type]), [contenteditable="true"], [contenteditable=""]';
    const elements = root.querySelectorAll ? root.querySelectorAll(selectors) : [];
    elements.forEach(attachMonitor);

    // Also check if root itself is an input
    if (root.matches && root.matches(selectors)) {
      attachMonitor(root);
    }
  }

  // ── MutationObserver for dynamically added inputs ──
  function initObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          scanAndAttach(node);
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // ── Initialize ──
  function init() {
    injectStyles();
    scanAndAttach(document);
    initObserver();
    console.log('[PromptGuard] 🛡️ Real-time prompt injection monitor active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
