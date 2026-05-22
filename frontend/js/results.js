/* results.js — render and manage the candidate results page */

let _allResults = [];
let _jdSkills   = [];
let _jobDesc    = '';

document.addEventListener('DOMContentLoaded', () => {
  const stored = sessionStorage.getItem('recruitai_results');
  if (!stored) {
    showEmpty('No results found. Go back and run a search.');
    return;
  }

  const payload = JSON.parse(stored);
  _allResults = payload.results || [];
  _jdSkills   = payload.jd_skills || [];
  _jobDesc    = payload.job_description || '';
  const elapsed = payload.elapsed_ms || null;

  // Header counts
  document.getElementById('result-count').textContent = _allResults.length;
  if (elapsed) {
    document.getElementById('match-time').textContent = formatElapsed(elapsed);
  }

  // JD preview
  const jdText = document.getElementById('jd-preview-text');
  if (jdText && _jobDesc) jdText.textContent = _jobDesc;

  // Skills
  renderSkills(_jdSkills);

  // Populate category filter
  buildCategoryFilter(_allResults);

  // Initial render
  applyFilters();

  // Filter listeners
  document.getElementById('score-slider')?.addEventListener('input', onSliderChange);
  document.getElementById('category-filter')?.addEventListener('change', applyFilters);
  document.getElementById('export-btn')?.addEventListener('click', () => {
    exportCSV(getFilteredResults());
    showToast('CSV exported!', 'success');
  });

  // JD expand toggle
  document.getElementById('jd-toggle-btn')?.addEventListener('click', () => {
    const el    = document.getElementById('jd-preview-text');
    const label = document.querySelector('#jd-toggle-btn .jd-toggle-label');
    if (el) {
      el.classList.toggle('expanded');
      if (label) label.textContent = el.classList.contains('expanded') ? 'Show less ▲' : 'Show more ▼';
    }
  });

  // ── CV Modal close handlers ──
  document.getElementById('cv-modal-close')?.addEventListener('click', closeCVModal);
  document.getElementById('cv-modal-overlay')?.addEventListener('click', closeCVModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCVModal();
  });
});

function onSliderChange(e) {
  const val = e.target.value;
  const label = document.getElementById('score-value');
  if (label) label.textContent = `${val}%`;
  applyFilters();
}

function getFilteredResults() {
  const minScore = parseInt(document.getElementById('score-slider')?.value ?? 0, 10);
  const category = document.getElementById('category-filter')?.value ?? 'all';
  return filterResults(_allResults, minScore, category);
}

function applyFilters() {
  const filtered = getFilteredResults();
  const countEl = document.getElementById('filtered-count');
  if (countEl) countEl.textContent = filtered.length;
  renderCandidates(filtered);
}

function filterResults(results, minScore, category) {
  return results
    .filter(r => r.score >= minScore)
    .filter(r => {
      if (category === 'all') return true;
      if (category === 'uploaded_only') return r.category.startsWith('📄');
      return r.category === category;
    });
}

function buildCategoryFilter(results) {
  const sel = document.getElementById('category-filter');
  if (!sel) return;

  const hasUploaded = results.some(r => r.category.startsWith('📄'));

  if (hasUploaded) {
    const opt = document.createElement('option');
    opt.value = 'uploaded_only';
    opt.textContent = 'Uploaded Files Only';
    sel.appendChild(opt);
  }

  const cats = [...new Set(results.map(r => r.category))].sort();
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });

  if (hasUploaded) {
    sel.value = 'uploaded_only';
  }
}

function renderSkills(skills) {
  const container = document.getElementById('jd-skills');
  if (!container || !skills.length) return;
  container.innerHTML = skills
    .map(s => `<span class="skill-chip">${escapeHtml(s)}</span>`)
    .join('');
}

function renderCandidates(results) {
  const container = document.getElementById('candidates-list');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No candidates match your filters</h3>
        <p>Try lowering the minimum score or selecting a different category.</p>
      </div>`;
    return;
  }

  container.innerHTML = results.map(r => candidateCard(r)).join('');

  // Animate score bars after DOM paint
  requestAnimationFrame(() => {
    container.querySelectorAll('.score-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  });

  // Snippet toggles
  container.querySelectorAll('.snippet-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const text = document.getElementById(`snippet-${id}`);
      if (!text) return;
      const expanded = text.classList.toggle('expanded');
      btn.textContent = expanded ? 'Show less ▲' : 'Read more ▼';
    });
  });

  // Download CV buttons (pre-indexed candidates)
  container.querySelectorAll('.btn-download-cv').forEach(btn => {
    btn.addEventListener('click', () => {
      const rank = Number(btn.dataset.rank);
      const r    = _allResults.find(x => x.rank === rank);
      if (r) downloadCV(r, extractCandidateName(r.category, r.snippet, r.rank));
    });
  });

  // View CV buttons (uploaded candidates)
  container.querySelectorAll('.btn-view-cv').forEach(btn => {
    btn.addEventListener('click', () => {
      const rank = Number(btn.dataset.rank);
      const r    = _allResults.find(x => x.rank === rank);
      if (r) openCVModal(r);
    });
  });
}

/* ── Find which JD skills appear in a snippet (whole-word match) ── */
function matchedSkills(snippet, jdSkills) {
  if (!snippet || !jdSkills || !jdSkills.length) return [];
  const lower = snippet.toLowerCase();
  return jdSkills.filter(skill => {
    // Escape regex special chars, then require word boundaries so
    // "Java" does NOT match "JavaScript", "C" does NOT match "C++"
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\w+#])${escaped}(?![\\w+#])`).test(lower);
  });
}

// Common resume section headers that are NOT names
const _SECTION_HEADERS = new Set([
  'objective','summary','profile','experience','education','skills','references',
  'work history','work experience','professional experience','qualifications',
  'certifications','achievements','awards','projects','languages','contact',
  'personal information','career objective','professional summary',
]);

/* ── Extract a display name from category or first snippet line ── */
function extractCandidateName(category, snippet, rank) {
  // Uploaded file: category is "📄 filename.pdf"
  if (category.startsWith('📄')) {
    return category.replace(/^📄\s*/, '').replace(/\.(pdf|docx|txt)$/i, '');
  }
  // Try first non-empty line of snippet (often the candidate's name)
  const firstLine = (snippet || '').trim().split(/\r?\n/)[0].trim();
  if (
    firstLine.length > 1 &&
    firstLine.length <= 50 &&
    !/^\d/.test(firstLine) &&
    !_SECTION_HEADERS.has(firstLine.toLowerCase().replace(/:$/, ''))
  ) {
    return firstLine;
  }
  return `Candidate #${rank}`;
}

/* ── Download the resume snippet as a .txt file ── */
function downloadCV(r, name) {
  const cleanCat = r.category.replace(/^📄\s*/, '');
  const lines = [
    '========================================',
    '   RecruitAI — Resume Export',
    '========================================',
    '',
    `Candidate : ${name}`,
    `Category  : ${cleanCat}`,
    `Score     : ${formatScore(r.score)}`,
    `Rank      : #${r.rank}`,
    '',
    '--- Summary ---',
    '',
    r.snippet || '(no content available)',
    '',
    '========================================',
    'Generated by RecruitAI · BERT-powered screening',
    '========================================',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cv.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Downloading ${name}'s CV…`, 'success');
}

function candidateCard(r) {
  const tier       = scoreTier(r.score);
  const { bg, fg } = avatarStyle(r.category);
  const initials   = categoryInitials(r.category);
  const id         = `c${r.rank}`;
  const name       = extractCandidateName(r.category, r.snippet, r.rank);
  const isUploaded = r.category.startsWith('📄');
  const displayCat = r.category.replace(/^📄\s*/, '');
  const tierLabel  = { high: 'Strong Match', medium: 'Moderate Match', low: 'Weak Match' }[tier];
  const fillClass  = { high: 'fill-high', medium: 'fill-medium', low: 'fill-low' }[tier];
  const badgeTier  = tier === 'high' ? 'success' : tier === 'medium' ? 'warning' : 'danger';

  // Skills from the JD that appear in this resume's snippet
  const matched = matchedSkills(r.snippet, _jdSkills);
  const skillsHtml = matched.length
    ? `<div class="card-skills">
        <div class="snippet-label">Matching Skills</div>
        <div class="card-skills-row">
          ${matched.map(s => `<span class="skill-chip">${escapeHtml(s)}</span>`).join('')}
        </div>
       </div>`
    : '';

  return `
  <div class="candidate-card" data-rank="${r.rank}">

    <!-- Header: avatar + name + score -->
    <div class="candidate-header">
      <div class="avatar" style="background:${bg};color:${fg}">${escapeHtml(initials)}</div>
      <div class="candidate-info">
        <h3 class="candidate-name">${escapeHtml(name)}</h3>
        <div class="candidate-meta">
          ${isUploaded ? '<span class="badge badge-accent upload-badge">Uploaded</span>' : ''}
          <span class="candidate-category">${escapeHtml(displayCat)}</span>
        </div>
      </div>
      <div class="candidate-score-area">
        <span class="score-badge score-${tier}">${formatScore(r.score)}</span>
        <span class="badge badge-${badgeTier}">${tierLabel}</span>
      </div>
    </div>

    <!-- Match bar -->
    <div class="candidate-bar-row">
      <span class="bar-label">Match</span>
      <div class="score-bar-track">
        <div class="score-bar-fill ${fillClass}" data-width="${r.score}%" style="width:0"></div>
      </div>
      <span class="bar-pct">${formatScore(r.score)}</span>
    </div>

    <!-- Matched skills -->
    ${skillsHtml}

    <!-- Summary section -->
    <div class="snippet-container">
      <div class="snippet-label">Summary</div>
      <div class="snippet-text" id="snippet-${id}">${escapeHtml(r.snippet)}</div>
      <button class="snippet-toggle" data-id="${id}">Read more ▼</button>
    </div>

    <!-- Footer: rank + category + action buttons -->
    <div class="candidate-footer">
      <span class="candidate-rank-label">Rank #${r.rank}</span>
      <div class="candidate-footer-right">
        <span class="badge badge-muted">${escapeHtml(displayCat)}</span>
        ${isUploaded
          ? `<button class="btn-view-cv"     data-rank="${r.rank}">📄 View CV</button>
             <button class="btn-download-cv" data-rank="${r.rank}">⬇ Download</button>`
          : `<button class="btn-download-cv" data-rank="${r.rank}">⬇ Download CV</button>`
        }
      </div>
    </div>

  </div>`;
}

/* ══════════════════════
   CV PREVIEW MODAL
══════════════════════ */
function openCVModal(r) {
  const name     = extractCandidateName(r.category, r.snippet, r.rank);
  const filename = r.category.replace(/^📄\s*/, '');
  const modal    = document.getElementById('cv-modal');
  const titleEl  = document.getElementById('cv-modal-title');
  const bodyEl   = document.getElementById('cv-modal-body');

  if (!modal) return;

  titleEl.textContent = name;

  // Try to retrieve the stored file Data URL
  let cvData = {};
  try { cvData = JSON.parse(sessionStorage.getItem('recruitai_cvs') || '{}'); } catch (_) {}

  const cv = cvData[filename];

  if (cv && cv.url) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      // PDF: render inline using the browser's native PDF viewer
      bodyEl.innerHTML = `<iframe class="cv-iframe" src="${cv.url}" title="${escapeHtml(name)}"></iframe>`;
    } else if (ext === 'txt') {
      // TXT: decode base64 via TextDecoder to handle UTF-8 (em-dash, accents, etc.)
      try {
        const base64 = cv.url.split(',')[1];
        const bytes   = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const text    = new TextDecoder('utf-8').decode(bytes);
        bodyEl.innerHTML = `<pre class="cv-text">${escapeHtml(text)}</pre>`;
      } catch (_) {
        bodyEl.innerHTML = `<pre class="cv-text">${escapeHtml(r.snippet)}</pre>`;
      }
    } else {
      // DOCX or other: show extracted snippet (browser cannot render DOCX natively)
      bodyEl.innerHTML = `
        <div class="cv-docx-note">
          <span style="font-size:1.5rem;">📝</span>
          <p>DOCX files cannot be rendered directly in the browser.</p>
          <p>Showing the extracted text below:</p>
        </div>
        <pre class="cv-text">${escapeHtml(r.snippet)}</pre>`;
    }
  } else {
    // No stored file (e.g., storage quota exceeded) — show snippet
    bodyEl.innerHTML = `
      <div class="cv-docx-note">
        <span style="font-size:1.5rem;">📋</span>
        <p>Full file preview not available. Showing extracted text:</p>
      </div>
      <pre class="cv-text">${escapeHtml(r.snippet)}</pre>`;
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCVModal() {
  const modal  = document.getElementById('cv-modal');
  const bodyEl = document.getElementById('cv-modal-body');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
  // Clear iframe src to stop PDF rendering in background
  bodyEl.innerHTML = '';
}

function showEmpty(msg) {
  const container = document.getElementById('candidates-list');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No results</h3>
        <p>${escapeHtml(msg)}</p>
        <a href="index.html" class="btn-primary" style="display:inline-flex;margin-top:16px;">Go to Dashboard</a>
      </div>`;
  }
}
