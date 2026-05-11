"""
Cloud provider generation API endpoints
Unified endpoint for all cloud providers (Google AI, Runware, etc.)
"""
from fastapi import APIRouter, Depends, HTTPException, status
import logging

from app.models.cloud_provider import (
    CloudGenerateRequest,
    CloudGenerateResponse,
    CloudModelConfig,
    CloudProvider
)
from app.services.google_ai_service import GoogleAIService
from app.services.runware_service import RunwareService
from app.services.cloud_config_service import CloudConfigService
from app.services.storage_service import StorageService
from app.dependencies import validate_api_key
from app.config import settings
from app.models.google_ai import GoogleAIGenerateRequest, GoogleAIModel, AspectRatio, ResolutionTier

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cloud", tags=["cloud"])

# Initialize services
storage_service = StorageService(
    workflows_path=settings.workflows_path,
    images_path=settings.images_path,
    metadata_path=settings.metadata_path
)

# Initialize cloud config service
cloud_config_service = CloudConfigService(settings.cloud_models_file)

# Initialize Google AI service
try:
    google_ai_service = GoogleAIService(storage_service, api_key=settings.google_api_key)
    logger.info("Google AI service initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Google AI service: {e}")
    google_ai_service = None

# Initialize Runware service
try:
    runware_service = RunwareService(storage_service, api_key=settings.runware_api_key)
    logger.info("Runware service initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Runware service: {e}")
    runware_service = None


@router.get("/models")
async def list_models(_: str = Depends(validate_api_key)):
    """
    List all available cloud models from all providers

    Returns:
        List of available models with their configurations
    """
    models = cloud_config_service.get_all_models()
    return {
        "models": [model.model_dump() for model in models]
    }


@router.post("/generate", response_model=CloudGenerateResponse)
async def generate_image(
    request: CloudGenerateRequest,
    user_id: str = Depends(validate_api_key)
):
    """
    Generate image using specified cloud provider model

    Args:
        request: Generation request with model_id and parameters
        user_id: Current user ID (from API key)

    Returns:
        CloudGenerateResponse with generated image info
    """
    # Get model configuration
    model_config = cloud_config_service.get_model(request.model_id)
    if not model_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {request.model_id} not found"
        )

    logger.info(f"User {user_id} requested cloud generation: model={request.model_id}, prompt={request.prompt[:50]}...")

    # Route to appropriate provider
    if model_config.provider == CloudProvider.GOOGLE_AI:
        if not google_ai_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google AI service is not available. Please check GOOGLE_API_KEY configuration."
            )

        # Convert to Google AI request
        google_request = GoogleAIGenerateRequest(
            prompt=request.prompt,
            model=GoogleAIModel(model_config.model_id),
            aspect_ratio=AspectRatio(request.aspect_ratio.value),
            resolution_tier=ResolutionTier(request.resolution_tier.value) if request.resolution_tier else None,
            reference_image=request.reference_image
        )

        return await google_ai_service.generate_image(google_request, user_id)

    elif model_config.provider == CloudProvider.RUNWARE:
        if not runware_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Runware service is not available. Please check RUNWARE_API_KEY configuration."
            )

        return await runware_service.generate_image(
            request,
            model_config.name,
            model_config.model_id,
            user_id
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {model_config.provider}"
        )


@router.post("/models", response_model=CloudModelConfig)
async def add_model(
    model: CloudModelConfig,
    _: str = Depends(validate_api_key)
):
    """
    Add a new cloud model configuration

    Args:
        model: Model configuration to add

    Returns:
        Added model configuration
    """
    if not cloud_config_service.add_model(model):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model {model.id} already exists"
        )
    return model


@router.put("/models/{model_id}", response_model=CloudModelConfig)
async def update_model(
    model_id: str,
    model: CloudModelConfig,
    _: str = Depends(validate_api_key)
):
    """
    Update an existing cloud model configuration

    Args:
        model_id: Model ID to update
        model: New model configuration

    Returns:
        Updated model configuration
    """
    if not cloud_config_service.update_model(model_id, model):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found"
        )
    return model


@router.delete("/models/{model_id}")
async def delete_model(
    model_id: str,
    _: str = Depends(validate_api_key)
):
    """
    Delete a cloud model configuration

    Args:
        model_id: Model ID to delete

    Returns:
        Success message
    """
    if not cloud_config_service.delete_model(model_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found"
        )
    return {"message": f"Model {model_id} deleted successfully"}


@router.post("/models/reload")
async def reload_models(_: str = Depends(validate_api_key)):
    """
    Reload cloud models configuration from file

    Returns:
        Success message with model count
    """
    cloud_config_service.reload_config()
    models = cloud_config_service.get_all_models()
    return {
        "message": "Cloud models reloaded successfully",
        "count": len(models)
    }
