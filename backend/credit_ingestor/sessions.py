"""
sessions.py - Thread-safe in-memory session store for the IntelliCredit workflow.

Each call to POST /entity-onboard creates a Session keyed by a UUID.  The session
travels through the multi-stage pipeline and accumulates state at each stage:

  Stage 1 – onboarded  : entity_profile and loan_details populated
  Stage 2 – files_uploaded : uploaded_files dict populated
  Stage 3 – classified  : classification dict populated
  Stage 4 – extracted   : financial_analysis dict populated

Sessions are held in memory for the lifetime of the process.  For a production
deployment, swap SessionStore._sessions for a Redis / database backend without
changing the public interface.
"""

import threading
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Session status enum
# ---------------------------------------------------------------------------

class SessionStatus(str, Enum):
    ONBOARDED = "onboarded"
    FILES_UPLOADED = "files_uploaded"
    CLASSIFIED = "classified"
    EXTRACTED = "extracted"


# ---------------------------------------------------------------------------
# Session data container
# ---------------------------------------------------------------------------

@dataclass
class Session:
    """Mutable container that accumulates state across the four pipeline stages."""

    session_id: str

    # Populated by POST /entity-onboard
    entity_profile: Dict[str, Any] = field(default_factory=dict)
    loan_details: Dict[str, Any] = field(default_factory=dict)

    # Populated by POST /upload-documents/{session_id}
    # Maps original_filename -> {path: str, size: int, content_type: str}
    uploaded_files: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    # Populated by POST /classify-documents/{session_id}
    # Maps original_filename -> document_type label
    classification: Dict[str, str] = field(default_factory=dict)

    # Populated by POST /extract-data/{session_id}
    financial_analysis: Optional[Dict[str, Any]] = None

    # Workflow stage tracker
    status: SessionStatus = SessionStatus.ONBOARDED

    def to_dict(self) -> Dict[str, Any]:
        """Serialise the session to a JSON-safe dict (for API responses)."""
        return {
            "session_id": self.session_id,
            "status": self.status.value,
            "entity_profile": self.entity_profile,
            "loan_details": self.loan_details,
            "uploaded_files": {
                fname: {k: v for k, v in meta.items() if k != "path"}
                for fname, meta in self.uploaded_files.items()
            },
            "classification": self.classification,
            "has_financial_analysis": self.financial_analysis is not None,
        }


# ---------------------------------------------------------------------------
# Thread-safe session store
# ---------------------------------------------------------------------------

class SessionStore:
    """
    Thread-safe in-memory store backed by a plain dict + threading.Lock.

    Public methods mirror a CRUD interface so a future persistent backend
    (Redis, SQLite, etc.) can be dropped in without changing callers.
    """

    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    def create(
        self,
        entity_profile: Dict[str, Any],
        loan_details: Dict[str, Any],
    ) -> Session:
        """Create a new session and return it."""
        session_id = uuid.uuid4().hex
        session = Session(
            session_id=session_id,
            entity_profile=entity_profile,
            loan_details=loan_details,
        )
        with self._lock:
            self._sessions[session_id] = session
        return session

    def save(self, session: Session) -> None:
        """Persist an updated session object (overwrites previous state)."""
        with self._lock:
            self._sessions[session.session_id] = session

    def delete(self, session_id: str) -> bool:
        """Remove a session. Returns True if it existed."""
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    def get(self, session_id: str) -> Optional[Session]:
        """Return the Session or None if not found."""
        with self._lock:
            return self._sessions.get(session_id)

    def list_sessions(self) -> List[Dict[str, Any]]:
        """Return a summary list of all active sessions (admin / debug use)."""
        with self._lock:
            return [s.to_dict() for s in self._sessions.values()]

    def count(self) -> int:
        """Number of active sessions."""
        with self._lock:
            return len(self._sessions)


# ---------------------------------------------------------------------------
# Module-level singleton – imported by app.py
# ---------------------------------------------------------------------------

store = SessionStore()
