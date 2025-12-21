"""
FastAPI dependencies
"""
from fastapi import Header, HTTPException, status
from app.utils.api_key_generator import APIKeyManager
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Global API key manager instance
api_key_manager = APIKeyManager(settings.api_keys_file)


async def validate_api_key(x_api_key: str = Header(..., description="API Key for authentication")) -> str:
    """
    Validate API key from request header and return user_id

    Args:
        x_api_key: API key from X-API-Key header

    Returns:
        str: The user ID associated with the API key

    Raises:
        HTTPException: If API key is invalid
    """
    if not api_key_manager.validate_key(x_api_key):
        logger.warning(f"Invalid API key attempted: {x_api_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    user_id = api_key_manager.get_user_id(x_api_key)
    if not user_id:
        logger.error(f"Valid API key but no user_id found: {x_api_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key configuration error",
        )

    return user_id


def get_api_key_manager() -> APIKeyManager:
    """
    Dependency to get API key manager instance

    Returns:
        APIKeyManager instance
    """
    return api_key_manager
