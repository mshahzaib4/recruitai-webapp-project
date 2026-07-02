"""
Vercel Python serverless function entry point.
Adds the backend directory to sys.path and sets absolute paths for the pkl
files, then re-exports the FastAPI `app` so Vercel's Python runtime can serve it.
"""
import os
import sys

_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.abspath(os.path.join(_here, "..", "backend"))
_models = os.path.join(_backend, "models", "saved")

sys.path.insert(0, _backend)

os.environ.setdefault("EMBEDDINGS_PATH", os.path.join(_models, "resume_embeddings.pkl"))
os.environ.setdefault("DATA_PATH", os.path.join(_models, "resume_data.pkl"))

from main import app  # noqa: E402

__all__ = ["app"]
