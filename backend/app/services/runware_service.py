"""
Runware image generation service
"""
import io
import logging
import uuid
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
OPENAI_MODEL_SIZES = {
    "openai:1@1": {
        "3:2": (1536, 1024),
    },
    "openai:gpt-image@2": {
        "3:2": (1536, 1024),
        "4:3": (1024, 768),
    },
    "openai:1@2": {
        "1:1": (1024, 1024),
        "2:3": (1024, 1536),
        "3:2": (1536, 1024),
    },
}
OPENAI_MODELS_WITH_BACKGROUND = {"openai:1@1", "openai:1@2"}
OPENAI_MODELS_WITH_TOP_LEVEL_REFERENCES = {"openai:gpt-image@2"}


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

    def _get_size(self, request: CloudGenerateRequest, provider_model_id: str) -> tuple[int, int]:
        width = request.width
        height = request.height

        if provider_model_id in OPENAI_MODEL_SIZES:
            valid_sizes = set(OPENAI_MODEL_SIZES[provider_model_id].values())
            if width and height and (width, height) in valid_sizes:
                return width, height

            if width or height:
                logger.warning(
                    "Unsupported OpenAI image size requested for %s: %sx%s. Falling back to aspect ratio preset.",
                    provider_model_id,
                    width,
                    height,
                )

            sizes = OPENAI_MODEL_SIZES[provider_model_id]
            return sizes.get(request.aspect_ratio.value, next(iter(sizes.values())))

        if provider_model_id.startswith("bytedance:seedream"):
            if width and height and (width, height) in SEEDREAM_VALID_SIZES:
                return width, height

            if width or height:
                logger.warning(
                    "Unsupported Seedream size requested: %sx%s. Falling back to aspect ratio preset.",
                    width,
                    height,
                )

            return SEEDREAM_2K_SIZES.get(request.aspect_ratio.value, SEEDREAM_2K_SIZES["1:1"])

        return width or 1024, height or 1024

    def _get_provider_settings(self, provider_model_id: str) -> dict:
        if provider_model_id in OPENAI_MODEL_SIZES:
            params = {"quality": "high", "moderation": "auto"}
            if provider_model_id in OPENAI_MODELS_WITH_BACKGROUND:
                params["background"] = "opaque"
            return {"openai": params}

        if provider_model_id.startswith("bytedance:seedream"):
            return IBytedanceProviderSettings(optimizePromptMode="standard").to_request_dict()

        return {}

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
        if not self.api_key:
            return CloudGenerateResponse(
                status="failed",
                message="Runware API key not configured"
            )

        runware = Runware(api_key=self.api_key)

        try:
            await runware.connect()

            width, height = self._get_size(request, provider_model_id)
            provider_settings = self._get_provider_settings(provider_model_id)

            extra_args = {}
            if provider_settings:
                extra_args["providerSettings"] = provider_settings

            inference_params = {
                "positivePrompt": request.prompt,
                "model": provider_model_id,
                "width": width,
                "height": height,
                "numberResults": 1,
                "outputType": "base64Data",
                "outputFormat": "PNG",
                "extraArgs": extra_args,
            }

            if request.reference_image:
                if provider_model_id in OPENAI_MODELS_WITH_TOP_LEVEL_REFERENCES:
                    inference_params["referenceImages"] = [request.reference_image]
                else:
                    inference_params["inputs"] = IInputs(referenceImages=[request.reference_image])

            inference_request = IImageInference(**inference_params)

            logger.info(f"Generating image with Runware: model={provider_model_id}, size={width}x{height}")

            images = await runware.imageInference(requestImage=inference_request)

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
            generation_id = f"runware_{timestamp}_{uuid.uuid4().hex[:8]}"
            filename = f"{generation_id}.png"

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
                prompt_id=generation_id,
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
            try:
                await runware.disconnect()
            except Exception as e:
                logger.warning(f"Failed to disconnect from Runware: {str(e)}")
