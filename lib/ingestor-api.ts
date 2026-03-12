/**
 * lib/ingestor-api.ts
 *
 * Standalone API client for the FastAPI IntelliCredit backend.
 * Completely independent from the existing lib/api.ts which targets /api routes.
 *
 * Base URL: NEXT_PUBLIC_INGESTOR_URL env var (defaults to http://localhost:8000)
 *
 * Exported functions (one per backend endpoint):
 *   createEntitySession  → POST /entity-onboard
 *   uploadDocuments      → POST /upload-documents/{sessionId}
 *   classifyDocuments    → POST /classify-documents/{sessionId}
 *   extractData          → POST /extract-data/{sessionId}
 *   getFinancialAnalysis → GET  /financial-analysis/{sessionId}
 */

import {
  ClassifyDocumentsResponse,
  EntityOnboardPayload,
  FullAnalysisResponse,
  OnboardSessionResponse,
  UploadDocumentsResponse,
} from '@/types/analysis';

const INGESTOR_BASE_URL =
  process.env.NEXT_PUBLIC_INGESTOR_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Internal error handler
// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status} – ${res.statusText}`;
    try {
      const body = await res.json();
      // FastAPI puts error detail in body.detail (string or object)
      if (body?.detail) {
        detail =
          typeof body.detail === 'string'
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // response body was not JSON
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Stage 1 – Entity Onboarding
// ---------------------------------------------------------------------------

/**
 * Register a company and open a pipeline session.
 * Returns session_id that must be passed to all subsequent calls.
 */
export async function createEntitySession(
  data: EntityOnboardPayload
): Promise<OnboardSessionResponse> {
  const res = await fetch(`${INGESTOR_BASE_URL}/entity-onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<OnboardSessionResponse>(res);
}

// ---------------------------------------------------------------------------
// Stage 2 – Document Upload
// ---------------------------------------------------------------------------

/**
 * Upload one or more files for an existing session.
 * `files` is a plain File[] from an <input type="file" multiple />.
 */
export async function uploadDocuments(
  sessionId: string,
  files: File[]
): Promise<UploadDocumentsResponse> {
  const formData = new FormData();
  // FastAPI expects the field name to be "files" (the List[UploadFile] param)
  files.forEach((file) => formData.append('files', file));

  const res = await fetch(
    `${INGESTOR_BASE_URL}/upload-documents/${sessionId}`,
    { method: 'POST', body: formData }
  );
  return handleResponse<UploadDocumentsResponse>(res);
}

// ---------------------------------------------------------------------------
// Stage 3 – Document Classification
// ---------------------------------------------------------------------------

/**
 * Auto-classify all uploaded documents.
 * Optional overrides: { "filename.pdf": "Annual Report" }
 */
export async function classifyDocuments(
  sessionId: string,
  overrides: Record<string, string> = {}
): Promise<ClassifyDocumentsResponse> {
  const res = await fetch(
    `${INGESTOR_BASE_URL}/classify-documents/${sessionId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides }),
    }
  );
  return handleResponse<ClassifyDocumentsResponse>(res);
}

// ---------------------------------------------------------------------------
// Stage 4 – Extraction Pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full extraction + fraud detection + risk scoring pipeline.
 * Returns the complete FullAnalysisResponse.
 */
export async function extractData(
  sessionId: string
): Promise<FullAnalysisResponse & { session_id: string; status: string }> {
  const res = await fetch(`${INGESTOR_BASE_URL}/extract-data/${sessionId}`, {
    method: 'POST',
  });
  return handleResponse<FullAnalysisResponse & { session_id: string; status: string }>(res);
}

// ---------------------------------------------------------------------------
// Export (GET) – for Research Agent / Recommendation Engine
// ---------------------------------------------------------------------------

/**
 * Fetch a previously extracted analysis result.
 * Returns 400 if extraction has not been run yet for this session.
 */
export async function getFinancialAnalysis(
  sessionId: string
): Promise<FullAnalysisResponse> {
  const res = await fetch(
    `${INGESTOR_BASE_URL}/financial-analysis/${sessionId}`
  );
  return handleResponse<FullAnalysisResponse>(res);
}
