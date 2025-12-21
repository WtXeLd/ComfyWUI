"""
File storage service for workflows, images, and metadata
"""
import json
import aiofiles
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
import logging

from app.models.workflow import WorkflowConfig
from app.models.image import ImageMetadata

logger = logging.getLogger(__name__)


class StorageService:
    """Service for managing file storage"""

    def __init__(
        self,
        workflows_path: Path,
        images_path: Path,
        metadata_path: Path
    ):
        """
        Initialize storage service

        Args:
            workflows_path: Directory for workflow JSON files
            images_path: Directory for generated images
            metadata_path: Directory for image metadata
        """
        self.workflows_path = Path(workflows_path)
        self.images_path = Path(images_path)
        self.metadata_path = Path(metadata_path)

        # Ensure directories exist
        self.workflows_path.mkdir(parents=True, exist_ok=True)
        self.images_path.mkdir(parents=True, exist_ok=True)
        self.metadata_path.mkdir(parents=True, exist_ok=True)

    # ========== Workflow Storage ==========

    async def save_workflow(self, workflow: WorkflowConfig) -> None:
        """
        Save workflow configuration to JSON file

        Args:
            workflow: Workflow configuration to save
        """
        file_path = self.workflows_path / f"{workflow.id}.json"

        try:
            workflow_dict = workflow.model_dump()
            # Convert datetime objects to ISO format strings
            workflow_dict['created_at'] = workflow.created_at.isoformat()
            workflow_dict['updated_at'] = workflow.updated_at.isoformat()

            async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(workflow_dict, indent=2, ensure_ascii=False))

            logger.info(f"Saved workflow: {workflow.id} ({workflow.name})")

        except Exception as e:
            logger.error(f"Failed to save workflow {workflow.id}: {str(e)}")
            raise

    async def load_workflow(self, workflow_id: str) -> Optional[WorkflowConfig]:
        """
        Load workflow configuration from JSON file

        Args:
            workflow_id: Workflow ID

        Returns:
            WorkflowConfig or None if not found
        """
        file_path = self.workflows_path / f"{workflow_id}.json"

        if not file_path.exists():
            logger.warning(f"Workflow not found: {workflow_id}")
            return None

        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
                data = json.loads(content)

            # Convert ISO format strings back to datetime with timezone handling
            if 'created_at' in data:
                dt = datetime.fromisoformat(data['created_at'])
                # If naive datetime (no timezone), assume UTC
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                data['created_at'] = dt
            if 'updated_at' in data:
                dt = datetime.fromisoformat(data['updated_at'])
                # If naive datetime (no timezone), assume UTC
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                data['updated_at'] = dt

            workflow = WorkflowConfig(**data)
            logger.info(f"Loaded workflow: {workflow_id}")
            return workflow

        except Exception as e:
            logger.error(f"Failed to load workflow {workflow_id}: {str(e)}")
            raise

    async def list_workflows(self) -> list[WorkflowConfig]:
        """
        List all workflow configurations

        Returns:
            list: List of WorkflowConfig objects
        """
        workflows = []

        try:
            for file_path in self.workflows_path.glob("*.json"):
                workflow_id = file_path.stem
                workflow = await self.load_workflow(workflow_id)
                if workflow:
                    workflows.append(workflow)

            # Sort by updated_at descending
            workflows.sort(key=lambda w: w.updated_at, reverse=True)

            logger.info(f"Listed {len(workflows)} workflows")
            return workflows

        except Exception as e:
            logger.error(f"Failed to list workflows: {str(e)}")
            raise

    async def delete_workflow(self, workflow_id: str) -> bool:
        """
        Delete a workflow configuration file

        Args:
            workflow_id: Workflow ID to delete

        Returns:
            bool: True if deleted, False if not found
        """
        file_path = self.workflows_path / f"{workflow_id}.json"

        if not file_path.exists():
            logger.warning(f"Workflow not found for deletion: {workflow_id}")
            return False

        try:
            file_path.unlink()
            logger.info(f"Deleted workflow: {workflow_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete workflow {workflow_id}: {str(e)}")
            raise

    # ========== Image Storage ==========

    async def save_image(
        self,
        image_data: bytes,
        workflow_name: str,
        filename: str,
        owner_id: Optional[str] = None
    ) -> str:
        """
        Save image file to disk (organized by user)

        Args:
            image_data: Image binary data
            workflow_name: Workflow name for organizing images
            filename: Original filename
            owner_id: User ID for organizing images by user

        Returns:
            str: Full file path where image was saved
        """
        # Create user-specific directory structure: images/{user_id}/{workflow_name}/
        if owner_id:
            workflow_dir = self.images_path / owner_id / workflow_name
        else:
            # Fallback to old structure for backwards compatibility
            workflow_dir = self.images_path / workflow_name

        workflow_dir.mkdir(parents=True, exist_ok=True)

        # Generate timestamped filename to avoid conflicts
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"{timestamp}_{filename}"
        file_path = workflow_dir / new_filename

        try:
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(image_data)

            logger.info(f"Saved image: {file_path} (owner: {owner_id or 'legacy'})")
            return str(file_path)

        except Exception as e:
            logger.error(f"Failed to save image {filename}: {str(e)}")
            raise

    async def save_image_metadata(self, metadata: ImageMetadata) -> None:
        """
        Save image metadata to JSON file

        Args:
            metadata: Image metadata to save
        """
        file_path = self.metadata_path / f"{metadata.id}.json"

        try:
            metadata_dict = metadata.model_dump()
            metadata_dict['created_at'] = metadata.created_at.isoformat()

            async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(metadata_dict, indent=2, ensure_ascii=False))

            logger.info(f"Saved image metadata: {metadata.id}")

        except Exception as e:
            logger.error(f"Failed to save image metadata {metadata.id}: {str(e)}")
            raise

    async def load_image_metadata(self, image_id: str) -> Optional[ImageMetadata]:
        """
        Load image metadata from JSON file

        Args:
            image_id: Image ID

        Returns:
            ImageMetadata or None if not found
        """
        file_path = self.metadata_path / f"{image_id}.json"

        if not file_path.exists():
            logger.warning(f"Image metadata not found: {image_id}")
            return None

        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
                data = json.loads(content)

            # Convert ISO format strings back to datetime with timezone handling
            if 'created_at' in data:
                dt = datetime.fromisoformat(data['created_at'])
                # If naive datetime (no timezone), assume UTC
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                data['created_at'] = dt

            metadata = ImageMetadata(**data)
            return metadata

        except Exception as e:
            logger.error(f"Failed to load image metadata {image_id}: {str(e)}")
            raise

    async def list_image_metadata(
        self,
        owner_id: Optional[str] = None,
        workflow_id: Optional[str] = None,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> list[ImageMetadata]:
        """
        List image metadata with optional filtering

        Args:
            owner_id: Filter by owner ID (strict - only show images owned by this user)
            workflow_id: Filter by workflow ID
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            list: List of ImageMetadata objects
        """
        all_metadata = []

        try:
            for file_path in self.metadata_path.glob("*.json"):
                image_id = file_path.stem
                metadata = await self.load_image_metadata(image_id)
                if metadata:
                    # Filter by owner_id if specified (strict permission check)
                    if owner_id and metadata.owner_id != owner_id:
                        continue
                    # Filter by workflow_id if specified
                    if workflow_id and metadata.workflow_id != workflow_id:
                        continue
                    all_metadata.append(metadata)

            # Sort by created_at descending (newest first)
            all_metadata.sort(key=lambda m: m.created_at, reverse=True)

            # Apply offset and limit
            if limit:
                all_metadata = all_metadata[offset:offset + limit]
            else:
                all_metadata = all_metadata[offset:]

            return all_metadata

        except Exception as e:
            logger.error(f"Failed to list image metadata: {str(e)}")
            raise

    async def delete_image(self, image_id: str) -> bool:
        """
        Delete an image and its metadata

        Args:
            image_id: Image ID to delete

        Returns:
            bool: True if deleted, False if not found
        """
        metadata = await self.load_image_metadata(image_id)
        if not metadata:
            return False

        try:
            # Delete image file
            image_path = Path(metadata.file_path)
            if image_path.exists():
                image_path.unlink()

            # Delete metadata file
            metadata_path = self.metadata_path / f"{image_id}.json"
            if metadata_path.exists():
                metadata_path.unlink()

            logger.info(f"Deleted image: {image_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete image {image_id}: {str(e)}")
            raise
