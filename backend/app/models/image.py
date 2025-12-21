"""
Image metadata models
"""
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, timezone
import uuid


class ImageMetadata(BaseModel):
    """Metadata for a generated image"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    workflow_id: str
    workflow_name: str
    owner_id: str  # User ID who owns this image
    prompt: str
    prompt_id: str
    file_path: str
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)  # Additional ComfyUI metadata

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ImageListResponse(BaseModel):
    """Response containing list of images"""

    images: list[ImageMetadata]
    total: int
    page: int
    page_size: int


class ImageDownloadResponse(BaseModel):
    """Response for image download request"""

    image_id: str
    filename: str
    url: str  # Download URL
