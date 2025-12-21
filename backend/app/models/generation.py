"""
Generation request/response models
"""
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class GenerationRequest(BaseModel):
    """Request to generate an image"""

    workflow_id: str
    prompt: str
    override_params: Optional[dict[str, Any]] = None  # Advanced settings overrides
    save_to_disk: bool = True
    image_filename: Optional[str] = None  # Uploaded image filename for LoadImage nodes


class GenerationResponse(BaseModel):
    """Response from generation request"""

    prompt_id: str
    workflow_id: str
    status: str  # "queued", "processing", "completed", "failed"
    message: Optional[str] = None


class ProgressUpdate(BaseModel):
    """Progress update message"""

    prompt_id: str
    status: str  # "processing", "completed", "error"
    current_node: Optional[str] = None
    node_title: Optional[str] = None
    progress_percent: Optional[int] = None
    error: Optional[str] = None
    images: Optional[list[dict]] = None  # Only present when completed
