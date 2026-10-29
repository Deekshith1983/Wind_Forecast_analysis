"""
Vercel Serverless Function entry point.
Exposes the FastAPI application to Vercel's Python Serverless Runtime.
"""
import sys
from pathlib import Path

# Ensure repository root is on sys.path so 'app' package is found
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.main import app

# Vercel looks for the ASGI/WSGI 'app' object
__all__ = ["app"]
