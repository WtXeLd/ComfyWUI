"""
Image generation service
"""
from typing import AsyncGenerator, Optional
import logging
import uuid
from pathlib import Path

from app.core.comfyui_client import ComfyUIClient
from app.services.workflow_service import WorkflowService
from app.services.storage_service import StorageService
from app.models.generation import GenerationRequest, GenerationResponse, ProgressUpdate
from app.models.image import ImageMetadata

logger = logging.getLogger(__name__)


class GenerationService:
    """Service for managing image generation"""

    def __init__(
        self,
        comfyui_client: ComfyUIClient,
        workflow_service: WorkflowService,
        storage_service: StorageService
    ):
        """
        Initialize generation service

        Args:
            comfyui_client: ComfyUI client instance
            workflow_service: Workflow service instance
            storage_service: Storage service instance
        """
        self.comfyui = comfyui_client
        self.workflow_service = workflow_service
        self.storage = storage_service
        # Cache for storing actual parameters used in generation (prompt_id -> params)
        self._actual_params_cache: dict[str, dict] = {}
        # Cache for storing client_id used for each prompt_id
        self._client_id_cache: dict[str, str] = {}

    async def generate_image(self, request: GenerationRequest, user_id: str) -> GenerationResponse:
        """
        Submit an image generation request

        Args:
            request: Generation request
            user_id: Current user ID (for permission checking and owner tracking)

        Returns:
            GenerationResponse with prompt_id
        """
        try:
            # Load workflow (with permission check)
            workflow_config = await self.workflow_service.get_workflow(request.workflow_id, user_id)
            if not workflow_config:
                return GenerationResponse(
                    prompt_id="",
                    workflow_id=request.workflow_id,
                    status="failed",
                    message=f"Workflow not found: {request.workflow_id}"
                )

            # Clone workflow JSON to avoid modifying original
            workflow = dict(workflow_config.workflow_json)

            # Modify prompt node
            workflow = ComfyUIClient.modify_prompt_node(
                workflow,
                workflow_config.prompt_node_id,
                request.prompt
            )

            # Apply parameter overrides (also randomizes seeds by default)
            # Always call this even if no overrides, to ensure seed randomization
            workflow, actual_params = ComfyUIClient.apply_parameter_overrides(
                workflow,
                request.override_params or {}
            )
            logger.info(f"Actual parameters used: {actual_params}")

            # Apply uploaded image if provided
            if request.image_filename and workflow_config.image_node_id:
                from app.utils.prompt_detector import ImageNodeDetector
                workflow = ImageNodeDetector.set_image_filename(
                    workflow,
                    workflow_config.image_node_id,
                    request.image_filename
                )
                logger.info(f"Applied image {request.image_filename} to node {workflow_config.image_node_id}")

            # Generate a unique client_id for this generation task
            # This ensures each task has its own WebSocket connection to ComfyUI
            task_client_id = str(uuid.uuid4())
            logger.info(f"Generated unique client_id for this task: {task_client_id}")

            # Submit to ComfyUI with the unique client_id
            prompt_id = await self.comfyui.submit_workflow(workflow, client_id=task_client_id)

            # Cache the client_id for later use in monitoring
            self._client_id_cache[prompt_id] = task_client_id
            # Cache the actual parameters for later use in metadata
            self._actual_params_cache[prompt_id] = actual_params

            logger.info(f"Generation submitted: prompt_id={prompt_id}, workflow={request.workflow_id}")

            return GenerationResponse(
                prompt_id=prompt_id,
                workflow_id=request.workflow_id,
                status="queued",
                message="Generation task submitted successfully"
            )

        except Exception as e:
            logger.error(f"Generation failed: {str(e)}")
            return GenerationResponse(
                prompt_id="",
                workflow_id=request.workflow_id,
                status="failed",
                message=str(e)
            )

    async def monitor_generation(
        self,
        prompt_id: str,
        workflow_id: str,
        prompt: str,
        user_id: str,
        save_to_disk: bool = True,
        override_params: dict = None
    ) -> AsyncGenerator[ProgressUpdate, None]:
        """
        Monitor generation progress and yield updates

        Args:
            prompt_id: Prompt ID to monitor
            workflow_id: Workflow ID
            prompt: Original prompt text
            user_id: Current user ID (for owner tracking)
            save_to_disk: Whether to save images to disk
            override_params: Parameter overrides used for generation

        Yields:
            ProgressUpdate objects
        """
        try:
            logger.info(f"[{prompt_id}] Starting to monitor generation progress...")

            # Get the client_id used for this task
            task_client_id = self._client_id_cache.get(prompt_id)
            if task_client_id:
                logger.info(f"[{prompt_id}] Using cached client_id: {task_client_id}")
            else:
                logger.warning(f"[{prompt_id}] No cached client_id found, using default")

            async for progress in self.comfyui.monitor_progress(prompt_id, client_id=task_client_id):
                if progress["type"] == "executing":
                    # Node execution progress
                    yield ProgressUpdate(
                        prompt_id=prompt_id,
                        status="processing",
                        current_node=progress.get("node")
                    )

                elif progress["type"] == "executed":
                    # Generation completed
                    images = progress.get("images", [])
                    logger.info(f"[{prompt_id}] Generation completed, received {len(images)} images from ComfyUI")

                    if save_to_disk and images:
                        # Get actual parameters from cache
                        actual_params = self._actual_params_cache.get(prompt_id, {})

                        logger.info(f"[{prompt_id}] Starting to save {len(images)} images to disk...")
                        # Save images and create metadata (with owner_id)
                        saved_images = await self._save_generated_images(
                            images,
                            workflow_id,
                            prompt_id,
                            prompt,
                            user_id,
                            actual_params
                        )
                        logger.info(f"[{prompt_id}] Successfully saved {len(saved_images)} images to disk")

                        # Clean up caches
                        self._actual_params_cache.pop(prompt_id, None)
                        self._client_id_cache.pop(prompt_id, None)

                        yield ProgressUpdate(
                            prompt_id=prompt_id,
                            status="completed",
                            images=[{
                                "id": img.id,
                                "filename": img.filename,
                                "file_path": img.file_path
                            } for img in saved_images]
                        )
                    else:
                        yield ProgressUpdate(
                            prompt_id=prompt_id,
                            status="completed",
                            images=images
                        )

                elif progress["type"] == "error":
                    # Execution error
                    yield ProgressUpdate(
                        prompt_id=prompt_id,
                        status="error",
                        error=progress.get("error", "Unknown error")
                    )

        except Exception as e:
            logger.error(f"Monitoring failed: {str(e)}")
            yield ProgressUpdate(
                prompt_id=prompt_id,
                status="error",
                error=str(e)
            )

    async def _save_generated_images(
        self,
        images: list[dict],
        workflow_id: str,
        prompt_id: str,
        prompt: str,
        owner_id: str,
        actual_params: dict = None
    ) -> list[ImageMetadata]:
        """
        Save generated images to disk and create metadata

        Args:
            images: List of image dicts from ComfyUI
            workflow_id: Workflow ID
            prompt_id: Prompt ID
            prompt: Original prompt text
            owner_id: User ID who owns this image
            actual_params: Actual parameters used for generation (including generated seeds)

        Returns:
            List of ImageMetadata objects
        """
        # Note: We don't need permission check here as the workflow was already
        # validated in generate_image or monitor_generation
        workflow = await self.workflow_service.get_workflow(workflow_id, owner_id)
        if not workflow:
            logger.warning(f"Workflow not found: {workflow_id}")
            return []

        saved_metadata = []

        for img in images:
            try:
                filename = img.get("filename")
                subfolder = img.get("subfolder", "")

                if not filename:
                    logger.warning("Image has no filename, skipping")
                    continue

                logger.info(f"[{prompt_id}] Downloading image {filename} from ComfyUI...")
                # Download image from ComfyUI
                image_data = await self.comfyui.download_image(filename, subfolder)

                logger.info(f"[{prompt_id}] Saving image {filename} to disk...")
                # Save to disk (organized by user)
                file_path = await self.storage.save_image(
                    image_data,
                    workflow.name,
                    filename,
                    owner_id
                )

                # Prepare generation parameters for metadata
                generation_params = {
                    "subfolder": subfolder,
                    "type": img.get("type", "output")
                }

                # Add actual parameters used (including random seeds)
                if actual_params:
                    generation_params["generation_params"] = actual_params
                    logger.info(f"Added actual generation params to metadata: {actual_params}")

                # Create metadata with owner_id
                metadata = ImageMetadata(
                    filename=filename,
                    workflow_id=workflow_id,
                    workflow_name=workflow.name,
                    owner_id=owner_id,
                    prompt=prompt,
                    prompt_id=prompt_id,
                    file_path=file_path,
                    file_size=len(image_data),
                    metadata=generation_params
                )

                # Save metadata
                await self.storage.save_image_metadata(metadata)

                saved_metadata.append(metadata)
                logger.info(f"[{prompt_id}] Saved image: {metadata.id} ({filename}) at {file_path}")

            except Exception as e:
                logger.error(f"[{prompt_id}] Failed to save image {filename}: {str(e)}")
                continue

        return saved_metadata
