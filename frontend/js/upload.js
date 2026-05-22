/* upload.js — multi-file upload with drag-and-drop */

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_EXTS     = ['.pdf', '.docx', '.txt'];
const MAX_FILES        = 20;

let selectedFiles = [];

document.addEventListener('DOMContentLoaded', () => {

  // ── DOM refs ──
  const dropzone     = document.getElementById('dropzone');
  const browseBtn    = document.getElementById('browse-btn');
  const addMoreBtn   = document.getElementById('add-more-btn');
  const addMoreWrap  = document.getElementById('add-more-wrap');
  const fileInput    = document.getElementById('file-input');
  const fileInputEx  = document.getElementById('file-input-extra');
  const fileList     = document.getElementById('file-list');
  const fileCount    = document.getElementById('file-count');
  const submitBtn    = document.getElementById('submit-btn');
  const statusEl     = document.getElementById('upload-status');
  const errorEl      = document.getElementById('error-banner');
  const jdTextarea   = document.getElementById('upload-jd-textarea');

  // ── Browse button opens file picker ──
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      addFiles(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  // ── Add More button ──
  addMoreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInputEx.click();
  });

  fileInputEx.addEventListener('change', () => {
    if (fileInputEx.files.length > 0) {
      addFiles(Array.from(fileInputEx.files));
      fileInputEx.value = '';
    }
  });

  // ── Drag and Drop ──
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.stopPropagation();
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('drag-over');
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) addFiles(dropped);
  });

  // ── Submit ──
  submitBtn.addEventListener('click', handleSubmit);

  // ── Ctrl+Enter (or Cmd+Enter) inside the JD textarea submits ──
  jdTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  });

  // ── Enter key submits — but NOT when a button/input/select is focused
  //    (avoids hijacking Browse Files, Remove, or Add More button activation) ──
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || submitBtn.disabled) return;
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea') return;
    e.preventDefault();
    handleSubmit();
  });

  // ────────────────────────────────────────────
  // Core functions
  // ────────────────────────────────────────────

  function addFiles(incoming) {
    hideError();
    let added = 0;

    for (const file of incoming) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();

      if (!ALLOWED_EXTS.includes(ext)) {
        showError(`"${file.name}" — unsupported type. Use PDF, DOCX or TXT.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showError(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB limit.`);
        continue;
      }
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        continue; // skip duplicate
      }
      if (selectedFiles.length >= MAX_FILES) {
        showError(`Maximum ${MAX_FILES} files allowed at once.`);
        break;
      }

      selectedFiles.push(file);
      added++;
    }

    if (added > 0) renderFileList();
  }

  function removeFile(idx) {
    selectedFiles.splice(idx, 1);
    renderFileList();
    hideError();
  }

  function renderFileList() {
    // Update badge
    if (fileCount) {
      fileCount.textContent = selectedFiles.length
        ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected`
        : '';
    }

    // Toggle Add More button
    if (addMoreWrap) {
      addMoreWrap.style.display = selectedFiles.length > 0 ? 'block' : 'none';
    }

    // Update submit button label
    const n = selectedFiles.length;
    submitBtn.textContent = n > 1
      ? `🔍 Analyze ${n} Resumes`
      : '🔍 Analyze Resume';

    if (n === 0) {
      fileList.innerHTML = '';
      setStatus('');
      return;
    }

    fileList.innerHTML = selectedFiles.map((file, i) => {
      const ext = file.name.split('.').pop().toUpperCase();
      return `
        <div class="file-item">
          <div class="file-item-icon">${escapeHtml(ext)}</div>
          <div class="file-item-info">
            <div class="file-item-name">${escapeHtml(file.name)}</div>
            <div class="file-item-size">${formatFileSize(file.size)}</div>
          </div>
          <button class="file-remove-btn" data-idx="${i}" title="Remove">✕</button>
        </div>`;
    }).join('');

    fileList.querySelectorAll('.file-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeFile(Number(btn.dataset.idx)));
    });

    setStatus(`${n} resume${n !== 1 ? 's' : ''} ready to analyze`);
  }

  async function handleSubmit() {
    const jd = jdTextarea.value.trim();
    hideError();

    if (selectedFiles.length === 0) {
      showError('Please select at least one resume file.');
      return;
    }
    if (jd.length < 10) {
      showError('Please enter a job description (at least 10 characters).');
      return;
    }

    setLoading(true);
    const t0 = Date.now();

    // Store files as Data URLs so results page can preview them
    await storeFilesForPreview(selectedFiles);

    try {
      let data;

      if (selectedFiles.length === 1) {
        data = await uploadAndMatch(selectedFiles[0], jd);
      } else {
        data = await bulkUploadAndMatch(selectedFiles, jd);
      }

      sessionStorage.setItem('recruitai_results', JSON.stringify({
        ...data,
        job_description: jd,
        elapsed_ms: Date.now() - t0,
        uploaded_count: selectedFiles.length,
      }));

      window.location.href = 'results.html';

    } catch (err) {
      showError(err.message || 'Something went wrong — is the backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    const n = selectedFiles.length;
    if (on) {
      submitBtn.innerHTML = `<span class="spinner spinner-sm"></span>&nbsp;Analyzing ${n} resume${n !== 1 ? 's' : ''}…`;
    } else {
      submitBtn.textContent = n > 1 ? `🔍 Analyze ${n} Resumes` : '🔍 Analyze Resume';
    }
    setStatus(on ? `Uploading and analyzing ${n} file${n !== 1 ? 's' : ''}…` : '');
  }

  function setStatus(msg)  { if (statusEl) statusEl.textContent = msg; }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.innerHTML = `<span class="err-icon">⚠</span><span>${escapeHtml(msg)}</span>`;
    errorEl.style.display = 'flex';
  }

  function hideError() {
    if (errorEl) errorEl.style.display = 'none';
  }

  // ── Store each file as a Data URL so the results page can show a preview ──
  // Reads all files in parallel instead of sequentially for speed.
  async function storeFilesForPreview(files) {
    const settled = await Promise.allSettled(
      files.map(async file => {
        const url = await readFileAsDataURL(file);
        return [file.name, { url, type: file.type }];
      })
    );
    const cvData = Object.fromEntries(
      settled.filter(r => r.status === 'fulfilled').map(r => r.value)
    );
    try {
      sessionStorage.setItem('recruitai_cvs', JSON.stringify(cvData));
    } catch (_) {
      // Storage quota exceeded (very large PDFs) — clear gracefully
      sessionStorage.removeItem('recruitai_cvs');
    }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
});
