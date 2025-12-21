"""
Workflow API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional
import json

from app.models.workflow import (
    WorkflowConfig,
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowListResponse,
    WorkflowDetectPromptResponse
)
from app.services.workflow_service import WorkflowService
from app.services.storage_service import StorageService
from app.dependencies import validate_api_key
from app.config import settings

router = APIRouter(prefix="/workflows", tags=["workflows"])

# Initialize services
storage_service = StorageService(
    workflows_path=settings.workflows_path,
    images_path=settings.images_path,
    metadata_path=settings.metadata_path
)
workflow_service = WorkflowService(storage_service)


@router.get("", response_model=WorkflowListResponse)
async def list_workflows(user_id: str = Depends(validate_api_key)):
    """List workflows accessible to the user (owned + public)"""
    return await workflow_service.list_workflows(user_id)


@router.post("", response_model=WorkflowConfig)
async def create_workflow(request: WorkflowCreateRequest, user_id: str = Depends(validate_api_key)):
    """Create a new workflow"""
    return await workflow_service.create_workflow(request, user_id)


@router.get("/{workflow_id}", response_model=WorkflowConfig)
async def get_workflow(workflow_id: str, user_id: str = Depends(validate_api_key)):
    """Get a specific workflow (with permission check)"""
    workflow = await workflow_service.get_workflow(workflow_id, user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow not found or access denied: {workflow_id}"
        )
    return workflow


@router.put("/{workflow_id}", response_model=WorkflowConfig)
async def update_workflow(workflow_id: str, request: WorkflowUpdateRequest, user_id: str = Depends(validate_api_key)):
    """Update an existing workflow (owner only)"""
    workflow = await workflow_service.update_workflow(workflow_id, request, user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow not found or access denied: {workflow_id}"
        )
    return workflow


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, user_id: str = Depends(validate_api_key)):
    """Delete a workflow (owner only)"""
    success = await workflow_service.delete_workflow(workflow_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow not found or access denied: {workflow_id}"
        )
    return {"message": f"Workflow {workflow_id} deleted successfully"}


@router.post("/import", response_model=WorkflowConfig)
async def import_workflow(
    file: UploadFile = File(...),
    name: Optional[str] = None,
    description: Optional[str] = None,
    user_id: str = Depends(validate_api_key)
):
    """
    Import a ComfyUI workflow JSON file
    """
    # Read file content
    content = await file.read()

    try:
        workflow_json = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON file"
        )

    # Use filename as name if not provided
    if not name:
        name = file.filename.replace(".json", "")

    return await workflow_service.import_workflow(name, workflow_json, user_id, description)


@router.post("/{workflow_id}/detect-prompt", response_model=WorkflowDetectPromptResponse)
async def detect_prompt_nodes(workflow_id: str, user_id: str = Depends(validate_api_key)):
    """
    Auto-detect prompt nodes in a workflow (with permission check)
    """
    workflow = await workflow_service.get_workflow(workflow_id, user_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow not found or access denied: {workflow_id}"
        )

    return await workflow_service.detect_prompt_nodes(workflow.workflow_json)
