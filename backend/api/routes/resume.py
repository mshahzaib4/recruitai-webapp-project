import logging
from typing import List

from fastapi import APIRouter, File, Form, Request, UploadFile

from core.config import settings
from core.exceptions import (
    FileTooLargeError,
    ModelNotLoadedError,
    UnsupportedFileTypeError,
)
from ml.extractor import extract_text
from ml.scorer import rank_resumes, rank_with_uploaded, rank_with_bulk_uploaded
from ml.skill_parser import extract_skills
from schemas.resume import CandidateResult, MatchRequest, MatchResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_embedder(request: Request):
    embedder = getattr(request.app.state, "embedder", None)
    if embedder is None:
        raise ModelNotLoadedError()
    return embedder


@router.post("/match", response_model=MatchResponse)
async def match_resumes(body: MatchRequest, request: Request):
    """Rank dataset resumes against a job description."""
    embedder = _get_embedder(request)

    jd_embedding = embedder.embed(body.job_description)
    raw = rank_resumes(
        jd_embedding,
        embedder.embeddings,
        embedder.data,
        top_k=body.top_k,
    )
    jd_skills = extract_skills(body.job_description)
    results = [CandidateResult(**r) for r in raw]
    return MatchResponse(results=results, jd_skills=jd_skills, total=len(results))


@router.post("/upload-and-match", response_model=MatchResponse)
async def upload_and_match(
    request: Request,
    file: UploadFile = File(...),
    job_description: str = Form(...),
):
    """Extract text from an uploaded resume, inject it into the ranking pool."""
    embedder = _get_embedder(request)

    file_bytes = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise FileTooLargeError(settings.MAX_FILE_SIZE_MB)

    try:
        resume_text = extract_text(file_bytes, file.filename or "upload.txt")
    except ValueError:
        raise UnsupportedFileTypeError(file.filename or "unknown")

    jd_embedding = embedder.embed(job_description)
    uploaded_embedding = embedder.embed(resume_text)

    raw = rank_with_uploaded(
        jd_embedding,
        embedder.embeddings,
        embedder.data,
        uploaded_embedding,
        resume_text,
        filename=file.filename or "resume",
        top_k=settings.TOP_K_RESULTS,
    )
    jd_skills = extract_skills(job_description)
    results = [CandidateResult(**r) for r in raw]
    return MatchResponse(results=results, jd_skills=jd_skills, total=len(results))


@router.post("/bulk-upload-and-match", response_model=MatchResponse)
async def bulk_upload_and_match(
    request: Request,
    files: List[UploadFile] = File(...),
    job_description: str = Form(...),
):
    """Upload multiple resumes at once and rank all of them against the job description."""
    embedder = _get_embedder(request)

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    uploaded_embeddings = []
    uploaded_files = []

    for file in files:
        file_bytes = await file.read()

        if len(file_bytes) > max_bytes:
            raise FileTooLargeError(settings.MAX_FILE_SIZE_MB)

        try:
            resume_text = extract_text(file_bytes, file.filename or "upload.txt")
        except ValueError:
            raise UnsupportedFileTypeError(file.filename or "unknown")

        embedding = embedder.embed(resume_text)
        uploaded_embeddings.append(embedding)
        uploaded_files.append({"filename": file.filename or "resume", "text": resume_text})

    jd_embedding = embedder.embed(job_description)

    raw = rank_with_bulk_uploaded(
        jd_embedding,
        embedder.embeddings,
        embedder.data,
        uploaded_embeddings,
        uploaded_files,
        top_k=settings.TOP_K_RESULTS,
    )

    jd_skills = extract_skills(job_description)
    results = [CandidateResult(**r) for r in raw]
    return MatchResponse(results=results, jd_skills=jd_skills, total=len(results))


@router.get("/categories")
async def get_categories(request: Request):
    """Return unique resume categories present in the dataset."""
    embedder = _get_embedder(request)
    categories = sorted(embedder.data["Category"].unique().tolist())
    return {"categories": categories, "total": len(categories)}
