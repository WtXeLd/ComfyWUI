"""
Cloud provider models for unified cloud generation
"""
from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum


class CloudProvider(str, Enum):
    """Available cloud providers"""
    GOOGLE_AI = "google_ai"
    RUNWARE = "runware"


class AspectRatio(str, Enum):
    """Supported aspect ratios"""
    RATIO_1_1 = "1:1"
    RATIO_2_3 = "2:3"
    RATIO_3_2 = "3:2"
    RATIO_3_4 = "3:4"
    RATIO_4_3 = "4:3"
    RATIO_4_5 = "4:5"
    RATIO_5_4 = "5:4"
    RATIO_9_16 = "9:16"
    RATIO_16_9 = "16:9"
    RATIO_21_9 = "21:9"


class ResolutionTier(str, Enum):
    """Resolution tier for models that support it"""
    K1 = "1K"
    K2 = "2K"
    K4 = "4K"


class CloudModelConfig(BaseModel):
    """Configuration for a cloud model"""
    id: str
    name: str
    provider: CloudProvider
    model_id: str  # Provider-specific model ID
    supports_resolution_tiers: bool = False
    supports_reference_image: bool = False
    aspect_ratios: list[str] = []
    resolution_tiers: list[str] = []


class CloudGenerateRequest(BaseModel):
    """Request to generate image using cloud provider"""
    prompt: str
    model_id: str  # Our unified model ID
    aspect_ratio: AspectRatio = AspectRatio.RATIO_1_1
    resolution_tier: Optional[ResolutionTier] = None
    reference_image: Optional[str] = None  # Base64 encoded image or file path
    # Runware specific
    width: Optional[int] = None
    height: Optional[int] = None
    steps: Optional[int] = None
    guidance_scale: Optional[float] = None


class CloudGenerateResponse(BaseModel):
    """Response from cloud generation"""
    status: Literal["success", "failed"]
    message: str
    image_id: Optional[str] = None
    image_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
