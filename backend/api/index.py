"""
Vercel Python serverless entrypoint.

Exposes the FastAPI ASGI app from backend/main.py as `app`.
"""

from main import app
