from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.ingestor_router import router as ingestor_router
from routers.research_router import router as research_router
from routers.risk_router import router as risk_router
from routers.credit_router import router as credit_router

app = FastAPI(
    title="IntelliCredit Platform API",
    description="AI-driven credit intelligence platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestor_router)
app.include_router(research_router)
app.include_router(risk_router)
app.include_router(credit_router)

@app.get("/api/health", tags=["System"])
def health_endpoint():
    return {"status": "ok"}
