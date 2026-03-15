# Vercel Deployment Guide (Frontend + Backend)

This repository is a monorepo. Deploy it as **two Vercel projects**:

1. Frontend project (Next.js)
2. Backend project (FastAPI Python serverless)

## Why two projects

- The frontend lives in `frontend/` and should build with Next.js tooling.
- The backend lives in `backend/` and runs as Python serverless functions.
- Deploying from repo root is not recommended because there are multiple app structures (`app/` at root and `frontend/app/`).

## 1) Deploy Backend (FastAPI)

### Vercel Project Settings

- Framework Preset: `Other`
- Root Directory: `backend`
- Build Command: leave empty (Vercel Python runtime handles build)
- Output Directory: leave empty
- Install Command: default

### Required files already added

- `backend/api/index.py` (serverless entrypoint)
- `backend/vercel.json` (routes all traffic to FastAPI app)
- `backend/.vercelignore`

### Backend environment variables

Set these in Vercel Project > Settings > Environment Variables:

- `CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN.vercel.app`
- `GROQ_API_KEY=...` (optional)
- `GROQ_MODEL=llama3-8b-8192` (optional)

Optional overrides:

- `UPLOAD_DIR=/tmp/credit-intelligence/uploads`
- `OUTPUT_DIR=/tmp/credit-intelligence/outputs`

### Important serverless behavior

- Storage is ephemeral. Uploaded/generated files are temporary.
- Current implementation now defaults to `/tmp/credit-intelligence/*` on Vercel.

## 2) Deploy Frontend (Next.js)

### Vercel Project Settings

- Framework Preset: `Next.js`
- Root Directory: `frontend`
- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Output Directory: leave empty

### Frontend environment variables

Set these in Vercel Project > Settings > Environment Variables:

- `NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN.vercel.app`
- `NEXT_PUBLIC_INGESTOR_URL=https://YOUR_BACKEND_DOMAIN.vercel.app`

Optional:

- `NEXT_PUBLIC_API_BASE=https://YOUR_BACKEND_DOMAIN.vercel.app/api`
  - If set, it overrides `NEXT_PUBLIC_API_URL` for legacy `/api/*` calls.

## 3) Verify after deploy

### Backend checks

- `GET https://YOUR_BACKEND_DOMAIN.vercel.app/api/health`
- `GET https://YOUR_BACKEND_DOMAIN.vercel.app/docs`

### Frontend checks

- Load onboarding flow
- Submit Stage 1 (`/entity-onboard`)
- Upload docs and run extraction
- Open research/risk/CAM pages

## 4) Known limits and recommendation

- Long-running extraction can hit serverless timeout limits.
- If workflows become heavy, move backend to a long-running host (Render/Fly/Railway/Azure App Service) and keep frontend on Vercel.
- For production reliability, use object storage (S3/R2/GCS) instead of local temp files.
