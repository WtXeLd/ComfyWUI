"""
Workflow management service
"""
from typing import Optional
from datetime import datetime, timezone
import logging

from app.models.workflow import (
    WorkflowConfig,
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowListResponse,
    WorkflowDetectPromptResponse
)
from app.services.storage_service import StorageService
from app.utils.prompt_detector import PromptNodeDetector, ImageNodeDetector
from app.utils.parameter_detector import detect_configurable_params

logger = logging.getLogger(__name__)


class WorkflowService:
    """Service for managing workflows"""

    def __init__(self, storage_service: StorageService):
        """
        Initialize workflow service

        Args:
            storage_service: Storage service instance
        """
        self.storage = storage_service

    async def list_workflows(self, user_id: str) -> WorkflowListResponse:
        """
        List workflows accessible to the user (owned + public)

        Args:
            user_id: Current user ID

        Returns:
            WorkflowListResponse with list of workflows
        """
        all_workflows = await self.storage.list_workflows()

        # Filter workflows: show owned workflows + public workflows
        accessible_workflows = [
            wf for wf in all_workflows
            if wf.owner_id == user_id or wf.is_public
        ]

        return WorkflowListResponse(
            workflows=accessible_workflows,
            total=len(accessible_workflows)
        )

    async def get_workflow(self, workflow_id: str, user_id: str) -> Optional[WorkflowConfig]:
        """
        Get a specific workflow by ID (with permission check)

        Args:
            workflow_id: Workflow ID
            user_id: Current user ID

        Returns:
            WorkflowConfig or None if not found/not accessible
        """
        workflow = await self.storage.load_workflow(workflow_id)

        if not workflow:
            return None

        # Check permission: owner or public workflow
        if workflow.owner_id != user_id and not workflow.is_public:
            logger.warning(f"User {user_id} attempted to access private workflow {workflow_id}")
            return None

        return workflow

    async def create_workflow(self, request: WorkflowCreateRequest, user_id: str) -> WorkflowConfig:
        """
        Create a new workflow

        Args:
            request: Workflow creation request
            user_id: Current user ID (owner)

        Returns:
            Created WorkflowConfig
        """
        # Auto-detect prompt node if not provided
        prompt_node_id = request.prompt_node_id
        if not prompt_node_id:
            detected = PromptNodeDetector.detect_prompt_nodes(request.workflow_json)
            if detected:
                prompt_node_id = detected[0]
                logger.info(f"Auto-detected prompt node: {prompt_node_id}")
            else:
                logger.warning("No prompt node detected, workflow may not work correctly")
                prompt_node_id = ""

        # Auto-detect image node if not provided
        image_node_id = request.image_node_id
        if not image_node_id:
            detected = ImageNodeDetector.detect_image_nodes(request.workflow_json)
            if detected:
                image_node_id = detected[0]
                logger.info(f"Auto-detected image node: {image_node_id}")
            else:
                logger.info("No image node detected, workflow is text-only")
                image_node_id = None

        # Auto-detect configurable parameters
        configurable_params = detect_configurable_params(request.workflow_json)
        logger.info(f"Detected {len(configurable_params)} configurable parameters")

        # Create workflow config with owner_id
        workflow = WorkflowConfig(
            name=request.name,
            description=request.description,
            workflow_json=request.workflow_json,
            prompt_node_id=prompt_node_id,
            image_node_id=image_node_id,
            configurable_params=configurable_params,
            owner_id=user_id  # Set owner to current user
        )

        # Save to storage
        await self.storage.save_workflow(workflow)

        logger.info(f"Created workflow: {workflow.id} ({workflow.name}) by user {user_id}")
        return workflow

    async def update_workflow(
        self,
        workflow_id: str,
        request: WorkflowUpdateRequest,
        user_id: str
    ) -> Optional[WorkflowConfig]:
        """
        Update an existing workflow (owner only)

        Args:
            workflow_id: Workflow ID to update
            request: Update request
            user_id: Current user ID

        Returns:
            Updated WorkflowConfig or None if not found/not authorized
        """
        workflow = await self.storage.load_workflow(workflow_id)
        if not workflow:
            return None

        # Check permission: only owner can update
        if workflow.owner_id != user_id:
            logger.warning(f"User {user_id} attempted to update workflow {workflow_id} owned by {workflow.owner_id}")
            return None

        # Update fields if provided
        if request.name is not None:
            workflow.name = request.name
        if request.description is not None:
            workflow.description = request.description
        if request.workflow_json is not None:
            workflow.workflow_json = request.workflow_json
            # Re-detect configurable parameters when workflow JSON changes
            workflow.configurable_params = detect_configurable_params(request.workflow_json)
            logger.info(f"Re-detected {len(workflow.configurable_params)} configurable parameters")
        if request.prompt_node_id is not None:
            workflow.prompt_node_id = request.prompt_node_id
        if request.image_node_id is not None:
            workflow.image_node_id = request.image_node_id
        if request.configurable_params is not None:
            workflow.configurable_params = request.configurable_params
        if request.is_public is not None:
            workflow.is_public = request.is_public
        if request.is_default is not None:
            workflow.is_default = request.is_default

        # Update timestamp
        workflow.updated_at = datetime.now(timezone.utc)

        # Save changes
        await self.storage.save_workflow(workflow)

        logger.info(f"Updated workflow: {workflow_id} by user {user_id}")
        return workflow

    async def delete_workflow(self, workflow_id: str, user_id: str) -> bool:
        """
        Delete a workflow (owner only)

        Args:
            workflow_id: Workflow ID to delete
            user_id: Current user ID

        Returns:
            bool: True if deleted, False if not found/not authorized
        """
        workflow = await self.storage.load_workflow(workflow_id)
        if not workflow:
            return False

        # Check permission: only owner can delete
        if workflow.owner_id != user_id:
            logger.warning(f"User {user_id} attempted to delete workflow {workflow_id} owned by {workflow.owner_id}")
            return False

        result = await self.storage.delete_workflow(workflow_id)
        if result:
            logger.info(f"Deleted workflow: {workflow_id} by user {user_id}")
        return result

    async def detect_prompt_nodes(
        self,
        workflow_json: dict
    ) -> WorkflowDetectPromptResponse:
        """
        Detect prompt nodes in a workflow

        Args:
            workflow_json: Workflow JSON to analyze

        Returns:
            WorkflowDetectPromptResponse with detected nodes
        """
        detected = PromptNodeDetector.detect_prompt_nodes(workflow_json)

        return WorkflowDetectPromptResponse(
            detected_nodes=detected,
            recommended_node_id=detected[0] if detected else None
        )

    async def import_workflow(
        self,
        name: str,
        workflow_json: dict,
        user_id: str,
        description: Optional[str] = None
    ) -> WorkflowConfig:
        """
        Import a ComfyUI workflow JSON

        Args:
            name: Workflow name
            workflow_json: ComfyUI workflow JSON
            user_id: Current user ID (owner)
            description: Optional description

        Returns:
            Created WorkflowConfig
        """
        request = WorkflowCreateRequest(
            name=name,
            description=description,
            workflow_json=workflow_json
        )

        return await self.create_workflow(request, user_id)
