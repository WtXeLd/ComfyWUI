"""
Runware image generation service
"""
import io
import logging
from datetime import datetime
from typing import Optional
from PIL import Image
import base64

from runware import Runware, IImageInference, IInputs, IBytedanceProviderSettings

from app.models.cloud_provider import CloudGenerateRequest, CloudGenerateResponse
from app.models.image import ImageMetadata
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


SEEDREAM_2K_SIZES = {
    "1:1": (2048, 2048),
    "4:3": (2304, 1728),
    "3:4": (1728, 2304),
    "16:9": (2560, 1440),
    "9:16": (1440, 2560),
    "3:2": (2496, 1664),
    "2:3": (1664, 2496),
    "21:9": (3024, 1296),
}
SEEDREAM_4K_SIZES = {
    "1:1": (4096, 4096),
    "4:3": (4608, 3456),
    "3:4": (3456, 4608),
    "16:9": (5120, 2880),
    "9:16": (2880, 5120),
    "3:2": (4992, 3328),
    "2:3": (3328, 4992),
    "21:9": (6048, 2592),
}
SEEDREAM_VALID_SIZES = set(SEEDREAM_2K_SIZES.values()) | set(SEEDREAM_4K_SIZES.values())


class RunwareService:
    """Service for Runware image generation"""

    def __init__(self, storage_service: StorageService, api_key: Optional[str] = None):
        """
        Initialize Runware service

        Args:
            storage_service: Storage service instance
            api_key: Runware API key
        """
        self.storage = storage_service
        self.api_key = api_key
        self.runware = None
        if api_key:
            self.runware = Runware(api_key=api_key)

    def _get_seedream_size(self, request: CloudGenerateRequest) -> tuple[int, int]:
        width = request.width
        height = request.height
        if width and height and (width, height) in SEEDREAM_VALID_SIZES:
            return width, height

        if width or height:
            logger.warning(
                "Unsupported Seedream size requested: %sx%s. Falling back to aspect ratio preset.",
                width,
                height,
            )

        return SEEDREAM_2K_SIZES.get(request.aspect_ratio.value, SEEDREAM_2K_SIZES["1:1"])

    async def generate_image(
        self,
        request: CloudGenerateRequest,
        model_name: str,
        provider_model_id: str,
        owner_id: str
    ) -> CloudGenerateResponse:
        """
        Generate image using Runware SDK

        Args:
            request: Generation request
            model_name: Display name of the model
            provider_model_id: Runware model ID (e.g., "bytedance:seedream@4.5")
            owner_id: User ID who owns this image

        Returns:
            CloudGenerateResponse
        """
        if not self.runware:
            return CloudGenerateResponse(
                status="failed",
                message="Runware API key not configured"
            )

        try:
            # Connect to Runware
            await self.runware.connect()

            width, height = self._get_seedream_size(request)

            inference_params = {
                "positivePrompt": request.prompt,
                "model": provider_model_id,
                "width": width,
                "height": height,
                "numberResults": 1,
                "outputType": "base64Data",
                "outputFormat": "PNG",
                "providerSettings": IBytedanceProviderSettings(optimizePromptMode="standard"),
            }

            if request.reference_image:
                inference_params["inputs"] = IInputs(referenceImages=[request.reference_image])

            inference_request = IImageInference(**inference_params)

            logger.info(f"Generating image with Runware: model={provider_model_id}, size={width}x{height}")

            # Generate image
            images = await self.runware.imageInference(requestImage=inference_request)

            if not images or len(images) == 0:
                return CloudGenerateResponse(
                    status="failed",
                    message="No image generated"
                )

            image_result = images[0]

            # Get base64 image (outputType: base64Data -> imageBase64Data)
            if not hasattr(image_result, 'imageBase64Data') or not image_result.imageBase64Data:
                return CloudGenerateResponse(
                    status="failed",
                    message="No base64 image in response"
                )

            base64_image = image_result.imageBase64Data

            # Decode base64 to image
            image_bytes = base64.b64decode(base64_image)
            image = Image.open(io.BytesIO(image_bytes))

            # Get actual dimensions
            actual_width, actual_height = image.size

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"runware_{timestamp}.png"

            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format="PNG")
            img_data = img_byte_arr.getvalue()

            file_path = await self.storage.save_image(
                img_data,
                "runware",
                filename,
                owner_id
            )

            metadata = ImageMetadata(
                filename=filename,
                workflow_id="runware",
                workflow_name=f"Runware - {model_name}",
                owner_id=owner_id,
                prompt=request.prompt,
                prompt_id=f"runware_{timestamp}",
                file_path=file_path,
                file_size=len(img_data),
                width=actual_width,
                height=actual_height,
                metadata={
                    "model": provider_model_id,
                    "model_name": model_name,
                    "width": width,
                    "height": height,
                    "aspect_ratio": request.aspect_ratio.value,
                    "has_reference_image": bool(request.reference_image)
                }
            )

            # Save metadata
            await self.storage.save_image_metadata(metadata)

            logger.info(f"Saved Runware generated image: {metadata.id}")

            # Generate download URL
            download_url = f"/api/images/{metadata.id}/download"

            return CloudGenerateResponse(
                status="success",
                message="Image generated successfully",
                image_id=metadata.id,
                image_url=download_url,
                width=actual_width,
                height=actual_height
            )

        except Exception as e:
            logger.error(f"Failed to generate image with Runware: {str(e)}")
            return CloudGenerateResponse(
                status="failed",
                message=f"Generation failed: {str(e)}"
            )
        finally:
            # Disconnect from Runware
            try:
                if self.runware:
                    await self.runware.disconnect()
            except Exception as e:
                logger.warning(f"Failed to disconnect from Runware: {str(e)}")
