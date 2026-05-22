from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health_check(request: Request):
    embedder = getattr(request.app.state, "embedder", None)
    resume_count = len(embedder.data) if embedder is not None else 0
    return {
        "status": "ok",
        "model_loaded": embedder is not None,
        "resume_count": resume_count,
        "service": "RecruitAI API",
    }
