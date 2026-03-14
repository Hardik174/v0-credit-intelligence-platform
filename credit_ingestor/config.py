"""
config.py - Centralised configuration and API key management for IntelliCredit.

All environment variables are loaded here. Every other module imports from
this file instead of calling os.environ directly, giving one place to audit
what secrets the application needs.

Loading order (highest priority first):
  1. Real environment variables (set in shell / CI / deployment platform)
  2. .env file in the project root (via python-dotenv, for local dev only)
  3. Defaults defined in this module

NEVER commit a real .env file to version control. Use .env.example as a
template and add .env to your .gitignore.
"""

import logging
import os
from pathlib import Path

# Load .env BEFORE any other imports read os.environ
# dotenv is an optional dependency – fail gracefully if not installed so the
# app still works in environments where it is injected via real env vars.
try:
    from dotenv import load_dotenv  # type: ignore

    _env_path = Path(__file__).parent.parent / ".env"
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path, override=False)
        logging.getLogger(__name__).info(".env loaded from %s", _env_path)
    else:
        # Also try current working directory
        load_dotenv(override=False)
except ImportError:
    logging.getLogger(__name__).warning(
        "python-dotenv not installed. Only shell environment variables will be used. "
        "Install with: pip install python-dotenv"
    )

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Groq LLM
# ---------------------------------------------------------------------------

GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
"""
Groq API key for Llama3-based PDF extraction.

How to obtain:
  1. Sign up at https://console.groq.com
  2. Create a new API key under API Keys section
  3. Set it using one of the methods below

Setting the key:
  Windows CMD:      set GROQ_API_KEY=gsk_xxxxxxxxxxxx
  Windows PowerShell: $env:GROQ_API_KEY="gsk_xxxxxxxxxxxx"
  Linux / Mac:      export GROQ_API_KEY=gsk_xxxxxxxxxxxx
  VS Code terminal: Add to .env file in project root (see .env.example)
  Production:       Inject via deployment platform (AWS Secrets, GCP Secret Manager, etc.)

If not set, the system falls back to regex-based heuristic extraction.
The pipeline works end-to-end without this key (degraded accuracy only).
"""

GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama3-8b-8192")
"""Groq model to use. llama3-8b-8192 is fast and free-tier friendly."""

GROQ_MAX_TOKENS: int = int(os.environ.get("GROQ_MAX_TOKENS", "1024"))
"""Maximum tokens in the LLM response. 1024 is sufficient for structured JSON."""

GROQ_TEMPERATURE: float = float(os.environ.get("GROQ_TEMPERATURE", "0.1"))
"""
LLM sampling temperature. Keep low (0.0–0.2) for deterministic extraction.
Higher values introduce variability in JSON field names.
"""

# PDF text budget sent to LLM (characters, not tokens – conservative estimate)
PDF_TEXT_CHAR_LIMIT: int = int(os.environ.get("PDF_TEXT_CHAR_LIMIT", "8000"))


# ---------------------------------------------------------------------------
# Upload / output paths
# ---------------------------------------------------------------------------

UPLOAD_DIR: Path = Path(os.environ.get("UPLOAD_DIR", "uploads"))
OUTPUT_DIR: Path = Path(os.environ.get("OUTPUT_DIR", "outputs"))


# ---------------------------------------------------------------------------
# Fraud detection thresholds (overridable via env for A/B testing)
# ---------------------------------------------------------------------------

REVENUE_INFLATION_RATIO: float = float(
    os.environ.get("REVENUE_INFLATION_RATIO", "1.5")
)
"""Alert if GST revenue / bank inflow exceeds this multiplier."""

MAX_CYCLE_LENGTH: int = int(os.environ.get("MAX_CYCLE_LENGTH", "4"))
"""Circular trading: flag cycles up to this many nodes."""

DENSE_SUBGRAPH_THRESHOLD: float = float(
    os.environ.get("DENSE_SUBGRAPH_THRESHOLD", "0.8")
)
"""Minimum graph density to flag a GSTIN cluster as a shell-entity network."""


# ---------------------------------------------------------------------------
# Startup validation (called from app.py lifespan)
# ---------------------------------------------------------------------------

def validate_config() -> dict:
    """
    Check all configuration values at startup and return a status summary.

    Does NOT raise – the system is designed to work in degraded mode without
    optional keys. Logs warnings for any missing optional components.

    Returns:
        dict with keys: llm_enabled (bool), warnings (list of str)
    """
    warnings = []
    llm_enabled = False

    if GROQ_API_KEY:
        llm_enabled = True
        logger.info("Groq LLM enabled (model=%s)", GROQ_MODEL)
    else:
        warnings.append(
            "GROQ_API_KEY not set – PDF extraction will use heuristic regex mode. "
            "Set the key in .env or as an environment variable to enable LLM extraction."
        )
        logger.warning(warnings[-1])

    for warning in warnings:
        logger.warning(warning)

    return {"llm_enabled": llm_enabled, "warnings": warnings}
