"""
FastAPI application entry point.

Mounts the unified router with Phase 2 (data quality) and Phase 3
(evaluation engine) endpoints under /api.

Run:  uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import settings
from app.services.data_loader import DataLoadError

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "UK Wind Generation Forecast Analytics — "
        "unified data-quality validation and forecast evaluation API "
        "for January 2026 Elexon FUELHH actuals and WINDFOR forecasts."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for data-load failures
@app.exception_handler(DataLoadError)
async def data_load_error_handler(request, exc: DataLoadError):
    return JSONResponse(
        status_code=500,
        content={
            "error": "DatasetLoadError",
            "message": str(exc),
            "detail": (
                "Failed to load required Elexon dataset files. "
                "Verify data directory and filenames."
            ),
        },
    )

# Mount all routes
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
