"""
Google AI generation API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
import logging

from app.models.google_ai import GoogleAIGenerateRequest, GoogleAIGenerateResponse
from app.services.google_ai_service import GoogleAIService
from app.services.storage_service import StorageService
from app.dependencies import validate_api_key
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/google-ai", tags=["google-ai"])

# Initialize services
storage_service = StorageService(
    workflows_path=settings.workflows_path,
    images_path=settings.images_path,
    metadata_path=settings.metadata_path
)

# Initialize Google AI service (use GOOGLE_API_KEY from settings)
try:
    google_ai_service = GoogleAIService(storage_service, api_key=settings.google_api_key)
    logger.info("Google AI service initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Google AI service: {e}")
    google_ai_service = None


@router.post("/generate", response_model=GoogleAIGenerateResponse)
async def generate_image(
    request: GoogleAIGenerateRequest,
    user_id: str = Depends(validate_api_key)
):
    """
    Generate image using Google AI

    Args:
        request: Generation request with prompt and parameters
        user_id: Current user ID (from API key)

    Returns:
        GoogleAIGenerateResponse with generated image info
    """
    if not google_ai_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google AI service is not available. Please check GOOGLE_API_KEY configuration."
        )

    logger.info(f"User {user_id} requested Google AI generation: {request.prompt[:50]}...")

    return await google_ai_service.generate_image(request, user_id)


@router.get("/models")
async def list_models(_: str = Depends(validate_api_key)):
    """
    List available Google AI models

    Returns:
        List of available models with their configurations
    """
    from app.models.google_ai import GoogleAIModel, AspectRatio, ResolutionTier

    return {
        "models": [
            {
                "id": GoogleAIModel.GEMINI_2_5_FLASH.value,
                "name": "Gemini 2.5 Flash Image",
                "supports_resolution_tiers": False,
                "aspect_ratios": [ar.value for ar in AspectRatio]
            },
            {
                "id": GoogleAIModel.GEMINI_3_PRO.value,
                "name": "Gemini 3 Pro Image Preview",
                "supports_resolution_tiers": True,
                "aspect_ratios": [ar.value for ar in AspectRatio],
                "resolution_tiers": [tier.value for tier in ResolutionTier]
            }
        ]
    }
