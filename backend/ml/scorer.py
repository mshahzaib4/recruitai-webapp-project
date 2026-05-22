import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity


def _build_results(
    scores: np.ndarray,
    data: pd.DataFrame,
    indices: list[int],
) -> list[dict]:
    """Shared result-builder used by all ranking functions."""
    results = []
    for rank, idx in enumerate(indices, start=1):
        row = data.iloc[idx]
        resume_text = str(row.get("Resume_str", row.get("Resume", "")))
        results.append(
            {
                "rank": rank,
                # Clamp to [0, 100] — cosine can technically be negative
                "score": max(0.0, round(float(scores[idx]) * 100, 1)),
                "category": str(row["Category"]),
                "snippet": resume_text[:600],
            }
        )
    return results


def rank_resumes(
    jd_embedding: np.ndarray,
    resume_embeddings: np.ndarray,
    resume_data: pd.DataFrame,
    top_k: int = 10,
) -> list[dict]:
    scores = cosine_similarity([jd_embedding], resume_embeddings)[0]
    top_indices = list(np.argsort(scores)[::-1][:top_k])
    return _build_results(scores, resume_data, top_indices)


def rank_with_uploaded(
    jd_embedding: np.ndarray,
    resume_embeddings: np.ndarray,
    resume_data: pd.DataFrame,
    uploaded_embedding: np.ndarray,
    uploaded_text: str,
    filename: str = "resume",
    top_k: int = 10,
) -> list[dict]:
    n = len(resume_data)
    combined_embeddings = np.vstack(
        [resume_embeddings, uploaded_embedding.reshape(1, -1)]
    )
    uploaded_row = pd.DataFrame(
        [{"Category": f"📄 {filename}", "Resume_str": uploaded_text}]
    )
    combined_data = pd.concat([resume_data, uploaded_row], ignore_index=True)

    scores = cosine_similarity([jd_embedding], combined_embeddings)[0]

    # Top top_k from the indexed pool
    top_indexed = list(np.argsort(scores[:n])[::-1][:top_k])

    # Always include the uploaded file regardless of its score
    uploaded_idx = n
    if uploaded_idx not in top_indexed:
        top_indexed.append(uploaded_idx)

    top_indexed.sort(key=lambda i: scores[i], reverse=True)
    return _build_results(scores, combined_data, top_indexed)


def rank_with_bulk_uploaded(
    jd_embedding: np.ndarray,
    resume_embeddings: np.ndarray,
    resume_data: pd.DataFrame,
    uploaded_embeddings: list[np.ndarray],
    uploaded_files: list[dict],
    top_k: int = 10,
) -> list[dict]:
    n = len(resume_data)
    n_uploaded = len(uploaded_files)

    stacked = np.vstack(
        [resume_embeddings] + [e.reshape(1, -1) for e in uploaded_embeddings]
    )
    extra_rows = pd.DataFrame([
        {"Category": f"📄 {f['filename']}", "Resume_str": f["text"]}
        for f in uploaded_files
    ])
    combined_data = pd.concat([resume_data, extra_rows], ignore_index=True)

    scores = cosine_similarity([jd_embedding], stacked)[0]

    # Top top_k from the indexed pool only
    top_indexed = list(np.argsort(scores[:n])[::-1][:top_k])

    # Always include every uploaded file regardless of its score
    for ui in range(n, n + n_uploaded):
        if ui not in top_indexed:
            top_indexed.append(ui)

    top_indexed.sort(key=lambda i: scores[i], reverse=True)
    return _build_results(scores, combined_data, top_indexed)
