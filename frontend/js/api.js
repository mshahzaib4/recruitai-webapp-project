const API_BASE = 'http://localhost:8000';

/**
 * Rank dataset resumes against a job description.
 * @param {string} jobDescription
 * @param {number} topK
 * @returns {Promise<{results: Array, jd_skills: Array, total: number}>}
 */
async function matchResumes(jobDescription, topK = 10) {
  const res = await fetch(`${API_BASE}/api/resume/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription, top_k: topK }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

/**
 * Upload a single resume file and match against a job description.
 * @param {File} file
 * @param {string} jobDescription
 * @returns {Promise<{results: Array, jd_skills: Array, total: number}>}
 */
async function uploadAndMatch(file, jobDescription) {
  const form = new FormData();
  form.append('file', file);
  form.append('job_description', jobDescription);
  const res = await fetch(`${API_BASE}/api/resume/upload-and-match`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

/**
 * Upload multiple resume files and rank all against a job description.
 * @param {File[]} files
 * @param {string} jobDescription
 * @returns {Promise<{results: Array, jd_skills: Array, total: number}>}
 */
async function bulkUploadAndMatch(files, jobDescription) {
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }
  form.append('job_description', jobDescription);
  const res = await fetch(`${API_BASE}/api/resume/bulk-upload-and-match`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch unique resume categories from the dataset.
 * @returns {Promise<{categories: string[], total: number}>}
 */
async function getCategories() {
  const res = await fetch(`${API_BASE}/api/resume/categories`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json();
}

/**
 * Check backend health and model status.
 * @returns {Promise<{status: string, model_loaded: boolean, resume_count: number}>}
 */
async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
