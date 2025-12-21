"""
Google AI image generation service
"""
import os
import io
import base64
import logging
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Optional
from PIL import Image

from google import genai
from google.genai import types

from app.models.google_ai import (
    GoogleAIModel,
    GoogleAIGenerateRequest,
    GoogleAIGenerateResponse,
    AspectRatio,
    ResolutionTier,
    FLASH_RESOLUTIONS,
    PRO_RESOLUTIONS
)
from app.models.image import ImageMetadata
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class GoogleAIService:
    """Service for Google AI image generation"""

    def __init__(self, storage_service: StorageService, api_key: Optional[str] = None):
        """
        Initialize Google AI service

        Args:
            storage_service: Storage service instance
            api_key: Google AI API key (optional, can use GOOGLE_API_KEY env var)
        """
        self.storage = storage_service

        # Initialize Google AI client
        if api_key:
            self.client = genai.Client(api_key=api_key)
        else:
            # Will use GOOGLE_API_KEY environment variable
            self.client = genai.Client()

    def _get_resolution(
        self,
        model: GoogleAIModel,
        aspect_ratio: AspectRatio,
        resolution_tier: Optional[ResolutionTier] = None
    ) -> tuple[int, int]:
        """
        Get resolution based on model and parameters

        Args:
            model: Google AI model
            aspect_ratio: Aspect ratio
            resolution_tier: Resolution tier (for Gemini 3 Pro)

        Returns:
            Tuple of (width, height)
        """
        if model == GoogleAIModel.GEMINI_2_5_FLASH:
            return FLASH_RESOLUTIONS.get(aspect_ratio, (1024, 1024))
        elif model == GoogleAIModel.GEMINI_3_PRO:
            tier = resolution_tier or ResolutionTier.K1
            return PRO_RESOLUTIONS[tier].get(aspect_ratio, (1024, 1024))
        else:
            return (1024, 1024)

    def _load_reference_image(self, image_data: str) -> Optional[Image.Image]:
        """
        Load reference image from base64 or file path

        Args:
            image_data: Base64 encoded image or file path

        Returns:
            PIL Image or None
        """
        try:
            # Try as file path first
            if os.path.exists(image_data):
                return Image.open(image_data)

            # Try as base64
            if image_data.startswith('data:image'):
                # Remove data URL prefix
                image_data = image_data.split(',')[1]

            image_bytes = base64.b64decode(image_data)
            return Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            logger.error(f"Failed to load reference image: {e}")
            return None

    async def generate_image(
        self,
        request: GoogleAIGenerateRequest,
        owner_id: str
    ) -> GoogleAIGenerateResponse:
        """
        Generate image using Google AI

        Args:
            request: Generation request
            owner_id: User ID who owns this image

        Returns:
            GoogleAIGenerateResponse
        """
        try:
            # Prepare contents
            contents = [request.prompt]

            # Add reference image if provided
            if request.reference_image:
                ref_image = self._load_reference_image(request.reference_image)
                if ref_image:
                    contents.append(ref_image)
                    logger.info("Added reference image to generation request")
                else:
                    logger.warning("Failed to load reference image, proceeding without it")

            # Get target resolution
            width, height = self._get_resolution(
                request.model,
                request.aspect_ratio,
                request.resolution_tier
            )

            # Generate configuration
            image_config_params = {
                "aspect_ratio": request.aspect_ratio.value,
            }

            # Add image size (resolution tier) for Gemini 3 Pro
            if request.model == GoogleAIModel.GEMINI_3_PRO and request.resolution_tier:
                image_config_params["image_size"] = request.resolution_tier.value

            generate_config = types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(**image_config_params)
            )

            logger.info(f"Generating image with Google AI: model={request.model.value}, "
                       f"aspect_ratio={request.aspect_ratio.value}, resolution_tier={request.resolution_tier.value if request.resolution_tier else 'N/A'}")

            # Generate image (run in thread pool to avoid blocking event loop)
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=request.model.value,
                contents=contents,
                config=generate_config
            )

            logger.info(f"Response received: {response}")

            # Check for finish reason
            if response.candidates and len(response.candidates) > 0:
                finish_reason = response.candidates[0].finish_reason
                logger.info(f"Finish reason: {finish_reason}")

                if finish_reason and str(finish_reason) == "FinishReason.NO_IMAGE":
                    logger.error("Google AI refused to generate image (NO_IMAGE)")
                    return GoogleAIGenerateResponse(
                        status="failed",
                        message="Image generation blocked by content policy. Please try a different prompt."
                    )

            # Extract generated image
            generated_image = None

            if not response or not hasattr(response, 'parts') or not response.parts:
                logger.error(f"Invalid response from Google AI: {response}")
                return GoogleAIGenerateResponse(
                    status="failed",
                    message="Invalid response from Google AI. Please try again."
                )

            for part in response.parts:
                logger.info(f"Processing part: {part}")
                if hasattr(part, 'inline_data') and part.inline_data is not None:
                    # Convert inline_data to PIL Image
                    image_data = part.inline_data.data
                    generated_image = Image.open(io.BytesIO(image_data))
                    logger.info(f"Image extracted successfully, size: {generated_image.size}")
                    break

            if not generated_image:
                return GoogleAIGenerateResponse(
                    status="failed",
                    message="No image data in response. Your prompt may violate content policies."
                )

            # Use actual image size from Google AI
            actual_width, actual_height = generated_image.size
            logger.info(f"Generated image actual size: {actual_width}x{actual_height}")

            # Save image to disk
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"google_ai_{timestamp}.png"

            # Convert to bytes
            img_byte_arr = io.BytesIO()
            generated_image.save(img_byte_arr, format='PNG')
            img_data = img_byte_arr.getvalue()

            # Save using storage service (organized by user)
            file_path = await self.storage.save_image(
                img_data,
                "google_ai",
                filename,
                owner_id
            )

            # Create metadata
            metadata = ImageMetadata(
                filename=filename,
                workflow_id="google_ai",
                workflow_name=f"Google - {request.model.value}",
                owner_id=owner_id,
                prompt=request.prompt,
                prompt_id=f"google_ai_{timestamp}",
                file_path=file_path,
                file_size=len(img_data),
                width=actual_width,
                height=actual_height,
                metadata={
                    "model": request.model.value,
                    "aspect_ratio": request.aspect_ratio.value,
                    "resolution_tier": request.resolution_tier.value if request.resolution_tier else None,
                    "has_reference": request.reference_image is not None
                }
            )

            # Save metadata
            await self.storage.save_image_metadata(metadata)

            logger.info(f"Saved Google AI generated image: {metadata.id}")

            # Generate download URL
            download_url = f"/api/images/{metadata.id}/download"

            return GoogleAIGenerateResponse(
                status="success",
                message="Image generated successfully",
                image_id=metadata.id,
                image_url=download_url,
                width=actual_width,
                height=actual_height
            )

        except Exception as e:
            logger.error(f"Failed to generate image with Google AI: {str(e)}")
            return GoogleAIGenerateResponse(
                status="failed",
                message=f"Generation failed: {str(e)}"
            )
