import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import resume, health
from core.config import settings
from ml.embedder import ResumeEmbedder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        embedder = ResumeEmbedder(
            settings.MODEL_PATH,
            settings.EMBEDDINGS_PATH,
            settings.DATA_PATH,
        )
        app.state.embedder = embedder
        logger.info("BERT model and embeddings loaded successfully")
    except Exception as exc:
        logger.warning(
            "Could not load model artifacts: %s — run the Jupyter notebooks first.", exc
        )
        app.state.embedder = None
    yield


app = FastAPI(
    title="RecruitAI API",
    description="AI-powered resume screening using BERT semantic similarity",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/api/resume", tags=["resume"])
app.include_router(health.router, prefix="/api", tags=["health"])


@app.get("/", tags=["root"])
async def root():
    return {"status": "RecruitAI API running"}
