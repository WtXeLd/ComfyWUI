"""
Image management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from fastapi.responses import FileResponse
from typing import Optional
from pathlib import Path

from app.models.image import ImageMetadata, ImageListResponse
from app.services.storage_service import StorageService
from app.dependencies import validate_api_key, api_key_manager
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["images"])

# Initialize storage service
storage_service = StorageService(
    workflows_path=settings.workflows_path,
    images_path=settings.images_path,
    metadata_path=settings.metadata_path
)


async def validate_api_key_flexible(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    api_key: Optional[str] = Query(None)
) -> str:
    """
    Validate API key from either header or query parameter and return user_id.
    This is needed for image downloads in <img> tags which cannot send custom headers.

    Args:
        x_api_key: API key from X-API-Key header
        api_key: API key from query parameter

    Returns:
        str: The user_id associated with the API key

    Raises:
        HTTPException: If API key is invalid or missing
    """
    key_to_validate = x_api_key or api_key

    if not key_to_validate:
        logger.warning("No API key provided in header or query parameter")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required (provide via X-API-Key header or api_key query parameter)",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if not api_key_manager.validate_key(key_to_validate):
        logger.warning(f"Invalid API key attempted: {key_to_validate[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    user_id = api_key_manager.get_user_id(key_to_validate)
    if not user_id:
        logger.error(f"Valid API key but no user_id found: {key_to_validate[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key configuration error",
        )

    return user_id


@router.get("", response_model=ImageListResponse)
async def list_images(
    user_id: str = Depends(validate_api_key),
    workflow_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
):
    """
    List generated images with pagination and filtering (user's images only)

    Args:
        user_id: Current user ID (from API key)
        workflow_id: Optional filter by workflow ID
        page: Page number (1-indexed)
        page_size: Number of items per page

    Returns:
        ImageListResponse with paginated images
    """
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    offset = (page - 1) * page_size

    # Filter by owner_id to enforce strict permission isolation
    images = await storage_service.list_image_metadata(
        owner_id=user_id,
        workflow_id=workflow_id,
        limit=page_size,
        offset=offset
    )

    # Get total count (only for this user)
    all_images = await storage_service.list_image_metadata(
        owner_id=user_id,
        workflow_id=workflow_id
    )
    total = len(all_images)

    return ImageListResponse(
        images=images,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{image_id}", response_model=ImageMetadata)
async def get_image_metadata(image_id: str, user_id: str = Depends(validate_api_key)):
    """
    Get metadata for a specific image (with permission check)

    Args:
        image_id: Image ID
        user_id: Current user ID (from API key)

    Returns:
        ImageMetadata
    """
    metadata = await storage_service.load_image_metadata(image_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {image_id}"
        )

    # Check permission: only owner can access
    if metadata.owner_id != user_id:
        logger.warning(f"User {user_id} attempted to access image {image_id} owned by {metadata.owner_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {image_id}"
        )

    return metadata


@router.get("/{image_id}/download")
async def download_image(image_id: str, user_id: str = Depends(validate_api_key_flexible)):
    """
    Download an image file (with permission check)

    Supports API key authentication via both header (X-API-Key) and query parameter (api_key).
    This allows the endpoint to work with both API calls and <img> tags.

    Args:
        image_id: Image ID
        user_id: Current user ID (from API key)

    Returns:
        FileResponse with image file
    """
    metadata = await storage_service.load_image_metadata(image_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {image_id}"
        )

    # Check permission: only owner can download
    if metadata.owner_id != user_id:
        logger.warning(f"User {user_id} attempted to download image {image_id} owned by {metadata.owner_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {image_id}"
        )

    file_path = Path(metadata.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image file not found: {metadata.file_path}"
        )

    return FileResponse(
        path=file_path,
        media_type="image/png",
        filename=metadata.filename
    )


@router.delete("/{image_id}")
async def delete_image(image_id: str, user_id: str = Depends(validate_api_key)):
    """
    Delete an image and its metadata (owner only)

    Args:
        image_id: Image ID
        user_id: Current user ID (from API key)

    Returns:
        Success message
    """
    # Check permission first
    metadata = await storage_service.load_image_metadata(image_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {image_id}"
        )

    # Only owner can delete
    if metadata.owner_id != user_id:
        logger.warning(f"User {user_id} attempted to delete image {image_id} owned by {metadata.owner_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {image_id}"
        )

    success = await storage_service.delete_image(image_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image not found: {image_id}"
        )
    return {"message": f"Image {image_id} deleted successfully"}


@router.get("/by-workflow/{workflow_id}", response_model=ImageListResponse)
async def list_images_by_workflow(
    workflow_id: str,
    user_id: str = Depends(validate_api_key),
    page: int = 1,
    page_size: int = 20
):
    """
    List images filtered by workflow ID (user's images only)

    Args:
        workflow_id: Workflow ID to filter by
        user_id: Current user ID (from API key)
        page: Page number
        page_size: Items per page

    Returns:
        ImageListResponse with filtered images
    """
    return await list_images(user_id=user_id, workflow_id=workflow_id, page=page, page_size=page_size)
