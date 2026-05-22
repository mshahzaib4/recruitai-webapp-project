/**
 * Format a score (0–100) as a percentage string.
 * @param {number} score
 * @returns {string}
 */
function formatScore(score) {
  return `${score.toFixed(1)}%`;
}

/**
 * Return the score tier: 'high' (≥80), 'medium' (60–79), 'low' (<60).
 * @param {number} score
 * @returns {'high'|'medium'|'low'}
 */
function scoreTier(score) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/**
 * Truncate text to maxLen characters, appending '…' if cut.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(text, maxLen = 200) {
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(0, maxLen).trimEnd() + '…';
}

/**
 * Format bytes to human-readable size.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Derive initials from a category label (up to 2 chars).
 * @param {string} label
 * @returns {string}
 */
function categoryInitials(label) {
  return label
    .split(/[\s-_/]+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

/** Deterministic hue from a string for consistent avatar colours. */
function stringHue(str) {
  let hash = 0;
  for (const ch of str) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return Math.abs(hash) % 360;
}

/**
 * Build an avatar background/foreground style for a category.
 * @param {string} category
 * @returns {{ bg: string, fg: string }}
 */
function avatarStyle(category) {
  const hue = stringHue(category);
  return {
    bg: `hsl(${hue}, 55%, 18%)`,
    fg: `hsl(${hue}, 70%, 65%)`,
  };
}

/**
 * Show a transient toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = 3500) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert a results array to CSV and trigger download.
 * @param {Array} results
 * @param {string} filename
 */
function exportCSV(results, filename = 'recruitai_results.csv') {
  const headers = ['Rank', 'Score (%)', 'Category', 'Snippet'];
  const rows = results.map(r => [
    r.rank,
    r.score,
    `"${String(r.category).replace(/"/g, '""')}"`,
    `"${String(r.snippet).replace(/"/g, '""').replace(/\n/g, ' ')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Elapsed time in milliseconds as a readable string.
 * @param {number} ms
 * @returns {string}
 */
function formatElapsed(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
