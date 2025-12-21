"""
Authentication and API key management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.dependencies import get_api_key_manager, validate_api_key
from app.utils.api_key_generator import APIKeyManager

router = APIRouter(prefix="/auth", tags=["authentication"])


class CreateKeyRequest(BaseModel):
    """Request to create a new API key"""
    name: str = "API Key"


class CreateKeyResponse(BaseModel):
    """Response containing new API key"""
    api_key: str
    name: str
    message: str


class ValidateKeyRequest(BaseModel):
    """Request to validate an API key"""
    api_key: str


class ValidateKeyResponse(BaseModel):
    """Response from key validation"""
    valid: bool
    message: str


@router.post("/generate-key", response_model=CreateKeyResponse)
async def generate_api_key(
    request: CreateKeyRequest,
    api_key_manager: APIKeyManager = Depends(get_api_key_manager),
    _: str = Depends(validate_api_key)  # Require existing API key to create new ones
):
    """
    Generate a new API key

    Note: Requires an existing valid API key to create new ones
    (except for the initial default key created on first run)

    Args:
        request: Request with optional name for the key

    Returns:
        CreateKeyResponse with the new API key
    """
    try:
        new_key = api_key_manager.create_key(request.name)
        return CreateKeyResponse(
            api_key=new_key,
            name=request.name,
            message="API key created successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )


@router.post("/validate-key", response_model=ValidateKeyResponse)
async def validate_key(
    request: ValidateKeyRequest,
    api_key_manager: APIKeyManager = Depends(get_api_key_manager)
):
    """
    Validate an API key

    Args:
        request: Request with API key to validate

    Returns:
        ValidateKeyResponse indicating if key is valid
    """
    is_valid = api_key_manager.validate_key(request.api_key)

    return ValidateKeyResponse(
        valid=is_valid,
        message="API key is valid" if is_valid else "API key is invalid or inactive"
    )


@router.delete("/revoke-key", dependencies=[Depends(validate_api_key)])
async def revoke_api_key(
    api_key: str,
    api_key_manager: APIKeyManager = Depends(get_api_key_manager)
):
    """
    Revoke an API key

    Args:
        api_key: The API key to revoke

    Returns:
        Success message
    """
    success = api_key_manager.revoke_key(api_key)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    return {"message": f"API key revoked successfully"}


@router.get("/list-keys", dependencies=[Depends(validate_api_key)])
async def list_api_keys(
    api_key_manager: APIKeyManager = Depends(get_api_key_manager)
):
    """
    List all API keys

    Returns:
        List of API key information (keys are partially masked)
    """
    keys = api_key_manager.list_keys()

    # Mask API keys for security
    masked_keys = []
    for key in keys:
        masked_key = key.copy()
        # Show only first 10 and last 4 characters
        full_key = key["key"]
        if len(full_key) > 14:
            masked_key["key"] = f"{full_key[:10]}...{full_key[-4:]}"
        masked_keys.append(masked_key)

    return {"keys": masked_keys, "total": len(masked_keys)}
