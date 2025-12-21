"""
Workflow data models
"""
from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime, timezone
import uuid


class WorkflowConfig(BaseModel):
    """Complete workflow configuration"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    workflow_json: dict[str, Any]  # Original ComfyUI workflow
    prompt_node_id: str  # Which node contains the prompt
    image_node_id: Optional[str] = None  # Which node contains the input image
    configurable_params: dict[str, Any] = Field(default_factory=dict)  # User-customizable parameters
    owner_id: str  # User ID who owns this workflow
    is_public: bool = False  # If True, all users can use this workflow; If False, only owner can use
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_default: bool = False

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WorkflowCreateRequest(BaseModel):
    """Request to create a new workflow"""

    name: str
    description: Optional[str] = None
    workflow_json: dict[str, Any]
    prompt_node_id: Optional[str] = None  # Auto-detect if not provided
    image_node_id: Optional[str] = None  # Auto-detect if not provided


class WorkflowUpdateRequest(BaseModel):
    """Request to update an existing workflow"""

    name: Optional[str] = None
    description: Optional[str] = None
    workflow_json: Optional[dict[str, Any]] = None
    prompt_node_id: Optional[str] = None
    image_node_id: Optional[str] = None
    configurable_params: Optional[dict[str, Any]] = None
    is_public: Optional[bool] = None  # Update public/private status
    is_default: Optional[bool] = None


class WorkflowListResponse(BaseModel):
    """Response containing list of workflows"""

    workflows: list[WorkflowConfig]
    total: int


class WorkflowDetectPromptResponse(BaseModel):
    """Response from prompt node detection"""

    detected_nodes: list[str]  # List of node IDs sorted by priority
    recommended_node_id: Optional[str] = None  # Top recommendation


class ConfigurableParameter(BaseModel):
    """Definition of a configurable parameter"""

    node_id: str
    path: str  # JSON path like "inputs.seed"
    param_type: str  # "number", "text", "dropdown", etc.
    default: Any
    label: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options: Optional[list[str]] = None  # For dropdown type
