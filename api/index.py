"""
Vercel Python serverless function entry point.
Adds the backend directory to sys.path and sets absolute paths for the pkl
files, then re-exports the FastAPI `app` so Vercel's Python runtime can serve it.
"""
import os
import sys

# Resolve paths relative to this file so they work in Vercel's /var/task/ root.
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.join(_here, "..", "backend")
_models = os.path.join(_backend, "models", "saved")

sys.path.insert(0, os.path.abspath(_backend))

# Override model paths with absolute paths before settings are imported.
os.environ.setdefault("EMBEDDINGS_PATH", os.path.join(_models, "resume_embeddings.pkl"))
os.environ.setdefault("DATA_PATH", os.path.join(_models, "resume_data.pkl"))

from main import app  # noqa: E402  must come after sys.path / env setup

__all__ = ["app"]
