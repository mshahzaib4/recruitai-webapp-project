"""
Vercel Python serverless function entry point.
Routes all traffic through FastAPI — API endpoints handle /api/* and
FastAPI's StaticFiles serves the frontend for everything else.
"""
import os
import sys

# Resolve absolute paths (Vercel runs from /var/task/)
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.abspath(os.path.join(_here, ".."))
_backend = os.path.join(_root, "backend")
_frontend = os.path.join(_root, "frontend")
_models = os.path.join(_backend, "models", "saved")

sys.path.insert(0, _backend)

# Set pkl paths before settings module is imported
os.environ.setdefault("EMBEDDINGS_PATH", os.path.join(_models, "resume_embeddings.pkl"))
os.environ.setdefault("DATA_PATH", os.path.join(_models, "resume_data.pkl"))

from main import app  # noqa: E402

# Serve the frontend as a catch-all AFTER all API routes are registered
from fastapi.staticfiles import StaticFiles  # noqa: E402

if os.path.isdir(_frontend):
    app.mount("/", StaticFiles(directory=_frontend, html=True), name="static")

__all__ = ["app"]
