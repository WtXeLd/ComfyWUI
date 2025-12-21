"""
Google AI generation models
"""
from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum


class GoogleAIModel(str, Enum):
    """Available Google AI models"""
    GEMINI_2_5_FLASH = "gemini-2.5-flash-image"
    GEMINI_3_PRO = "gemini-3-pro-image-preview"


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
    """Resolution tier for Gemini 3 Pro"""
    K1 = "1K"
    K2 = "2K"
    K4 = "4K"


# Resolution mapping for Gemini 2.5 Flash
FLASH_RESOLUTIONS = {
    AspectRatio.RATIO_1_1: (1024, 1024),
    AspectRatio.RATIO_2_3: (832, 1248),
    AspectRatio.RATIO_3_2: (1248, 832),
    AspectRatio.RATIO_3_4: (864, 1184),
    AspectRatio.RATIO_4_3: (1184, 864),
    AspectRatio.RATIO_4_5: (896, 1152),
    AspectRatio.RATIO_5_4: (1152, 896),
    AspectRatio.RATIO_9_16: (768, 1344),
    AspectRatio.RATIO_16_9: (1344, 768),
    AspectRatio.RATIO_21_9: (1536, 672),
}

# Resolution mapping for Gemini 3 Pro
PRO_RESOLUTIONS = {
    ResolutionTier.K1: {
        AspectRatio.RATIO_1_1: (1024, 1024),
        AspectRatio.RATIO_2_3: (848, 1264),
        AspectRatio.RATIO_3_2: (1264, 848),
        AspectRatio.RATIO_3_4: (896, 1200),
        AspectRatio.RATIO_4_3: (1200, 896),
        AspectRatio.RATIO_4_5: (928, 1152),
        AspectRatio.RATIO_5_4: (1152, 928),
        AspectRatio.RATIO_9_16: (768, 1376),
        AspectRatio.RATIO_16_9: (1376, 768),
        AspectRatio.RATIO_21_9: (1584, 672),
    },
    ResolutionTier.K2: {
        AspectRatio.RATIO_1_1: (2048, 2048),
        AspectRatio.RATIO_2_3: (1696, 2528),
        AspectRatio.RATIO_3_2: (2528, 1696),
        AspectRatio.RATIO_3_4: (1792, 2400),
        AspectRatio.RATIO_4_3: (2400, 1792),
        AspectRatio.RATIO_4_5: (1856, 2304),
        AspectRatio.RATIO_5_4: (2304, 1856),
        AspectRatio.RATIO_9_16: (1536, 2752),
        AspectRatio.RATIO_16_9: (2752, 1536),
        AspectRatio.RATIO_21_9: (3168, 1344),
    },
    ResolutionTier.K4: {
        AspectRatio.RATIO_1_1: (4096, 4096),
        AspectRatio.RATIO_2_3: (3392, 5056),
        AspectRatio.RATIO_3_2: (5056, 3392),
        AspectRatio.RATIO_3_4: (3584, 4800),
        AspectRatio.RATIO_4_3: (4800, 3584),
        AspectRatio.RATIO_4_5: (3712, 4608),
        AspectRatio.RATIO_5_4: (4608, 3712),
        AspectRatio.RATIO_9_16: (3072, 5504),
        AspectRatio.RATIO_16_9: (5504, 3072),
        AspectRatio.RATIO_21_9: (6336, 2688),
    },
}


class GoogleAIGenerateRequest(BaseModel):
    """Request to generate image using Google AI"""
    prompt: str
    model: GoogleAIModel = GoogleAIModel.GEMINI_2_5_FLASH
    aspect_ratio: AspectRatio = AspectRatio.RATIO_1_1
    resolution_tier: Optional[ResolutionTier] = None  # Only for Gemini 3 Pro
    reference_image: Optional[str] = None  # Base64 encoded image or file path


class GoogleAIGenerateResponse(BaseModel):
    """Response from Google AI generation"""
    status: Literal["success", "failed"]
    message: str
    image_id: Optional[str] = None
    image_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
