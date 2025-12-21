"""
FastAPI main application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.api import workflows, generation, images, auth, google_ai
from app.dependencies import api_key_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ComfyUI Web Application API",
    description="API for managing ComfyUI workflows and generating images",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize application
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("Starting ComfyUI Web Application...")

    # Initialize directories
    settings.initialize_directories()
    logger.info("Initialized data directories")

    # Ensure default API key exists
    default_key = api_key_manager.ensure_default_key_exists()
    if default_key:
        logger.info("=" * 60)
        logger.info("IMPORTANT: Default API Key Created")
        logger.info(f"API Key: {default_key}")
        logger.info("Please save this key - you'll need it to access the API")
        logger.info("=" * 60)
    else:
        logger.info("Using existing API keys")

    logger.info(f"ComfyUI Base URL: {settings.comfyui_base_url}")
    logger.info(f"Data path: {settings.data_path}")
    logger.info("Application started successfully!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down ComfyUI Web Application...")


# Include API routers
app.include_router(workflows.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(google_ai.router, prefix="/api")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ComfyUI Web Application API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "comfyui_url": settings.comfyui_base_url
    }


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred"
            }
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info"
    )
