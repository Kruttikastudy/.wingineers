/**
 * PhishGuard — Popup Script
 * Controls the extension popup UI.
 */

const API_BASE = 'http://127.0.0.1:8000';

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusText = document.getElementById('statusText');
  const apiStatus = document.getElementById('apiStatus');

  // ── Load protection state ──
  const storage = await chrome.storage.local.get('protectionEnabled');
  let enabled = storage.protectionEnabled !== false;
  updateToggleUI(enabled);

  // ── Toggle protection ──
  toggleBtn.addEventListener('click', async () => {
    enabled = !enabled;
    await chrome.storage.local.set({ protectionEnabled: enabled });
    updateToggleUI(enabled);
  });

  function updateToggleUI(isEnabled) {
    if (isEnabled) {
      toggleBtn.textContent = '🛡️ Protection Active';
      toggleBtn.className = 'toggle-btn active';
      statusText.textContent = 'Active';
      statusText.className = 'status-value status-active';
    } else {
      toggleBtn.textContent = '⚠️ Protection Disabled';
      toggleBtn.className = 'toggle-btn inactive';
      statusText.textContent = 'Disabled';
      statusText.className = 'status-value status-inactive';
    }
  }

  // ── Check API health ──
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      apiStatus.textContent = 'Connected';
      apiStatus.className = 'status-value status-active';
    } else {
      apiStatus.textContent = 'Error';
      apiStatus.className = 'status-value status-inactive';
    }
  } catch {
    apiStatus.textContent = 'Offline';
    apiStatus.className = 'status-value status-inactive';
  }

  // ── Load stats ──
  try {
    const response = await fetch(`${API_BASE}/api/threats?limit=1`, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const data = await response.json();
      const s = data.stats;
      document.getElementById('totalThreats').textContent = s.total || 0;
      document.getElementById('todayThreats').textContent = s.today || 0;
      document.getElementById('highRisk').textContent = s.highRisk || 0;
      document.getElementById('mediumRisk').textContent = s.mediumRisk || 0;
    }
  } catch {
    // Stats unavailable
  }
});
