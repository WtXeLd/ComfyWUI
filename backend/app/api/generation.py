"""
Image generation API endpoints
"""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, status, UploadFile, File
import logging

from app.models.generation import GenerationRequest, GenerationResponse
from app.services.generation_service import GenerationService
from app.services.workflow_service import WorkflowService
from app.services.storage_service import StorageService
from app.core.comfyui_client import ComfyUIClient
from app.core.websocket_manager import websocket_manager
from app.dependencies import validate_api_key
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generate", tags=["generation"])

# Initialize services
storage_service = StorageService(
    workflows_path=settings.workflows_path,
    images_path=settings.images_path,
    metadata_path=settings.metadata_path
)
workflow_service = WorkflowService(storage_service)
comfyui_client = ComfyUIClient(base_url=settings.comfyui_base_url)
generation_service = GenerationService(comfyui_client, workflow_service, storage_service)


@router.post("", response_model=GenerationResponse)
async def generate_image(request: GenerationRequest, user_id: str = Depends(validate_api_key)):
    """
    Submit an image generation request

    Args:
        request: Generation request with workflow_id and prompt
        user_id: Current user ID (from API key)

    Returns:
        GenerationResponse with prompt_id for tracking
    """
    return await generation_service.generate_image(request, user_id)


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time generation progress updates

    Args:
        websocket: WebSocket connection
        client_id: Unique client identifier

    Usage:
        1. Connect to ws://host:port/api/generate/ws/{client_id}
        2. Send auth message: {"type": "auth", "api_key": "your_key"}
        3. Send monitor message: {"type": "monitor", "prompt_id": "...", "workflow_id": "...", "prompt": "..."}
        4. Receive progress updates
    """
    await websocket_manager.connect(client_id, websocket)

    try:
        # Wait for authentication
        auth_data = await websocket.receive_json()

        if auth_data.get("type") != "auth":
            await websocket_manager.send_error(client_id, "First message must be authentication")
            await websocket_manager.disconnect(client_id)
            return

        api_key = auth_data.get("api_key")
        if not api_key:
            await websocket_manager.send_error(client_id, "API key required")
            await websocket_manager.disconnect(client_id)
            return

        # Validate API key and get user_id
        from app.dependencies import api_key_manager
        if not api_key_manager.validate_key(api_key):
            await websocket_manager.send_error(client_id, "Invalid API key")
            await websocket_manager.disconnect(client_id)
            return

        user_id = api_key_manager.get_user_id(api_key)
        if not user_id:
            await websocket_manager.send_error(client_id, "API key configuration error")
            await websocket_manager.disconnect(client_id)
            return

        logger.info(f"WebSocket client {client_id} authenticated as user {user_id}")

        # Wait for monitoring request
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "monitor":
                prompt_id = data.get("prompt_id")
                workflow_id = data.get("workflow_id")
                prompt = data.get("prompt")
                save_to_disk = data.get("save_to_disk", True)
                override_params = data.get("override_params")

                if not all([prompt_id, workflow_id, prompt]):
                    await websocket_manager.send_error(
                        client_id,
                        "Missing required fields: prompt_id, workflow_id, prompt"
                    )
                    continue

                logger.info(f"Starting monitoring for prompt_id: {prompt_id}")
                logger.info(f"Override params received: {override_params}")

                # Monitor generation progress (with user_id for owner tracking)
                async for update in generation_service.monitor_generation(
                    prompt_id,
                    workflow_id,
                    prompt,
                    user_id,
                    save_to_disk,
                    override_params
                ):
                    await websocket_manager.send_progress_update(
                        client_id,
                        update.model_dump()
                    )

                    # Break if completed or error
                    if update.status in ["completed", "error"]:
                        break

            elif data.get("type") == "ping":
                # Respond to ping
                await websocket_manager.send_message(client_id, {"type": "pong"})

            else:
                await websocket_manager.send_error(
                    client_id,
                    f"Unknown message type: {data.get('type')}"
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_id} disconnected")
        await websocket_manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
        await websocket_manager.send_error(client_id, str(e))
        await websocket_manager.disconnect(client_id)


@router.post("/upload-image", dependencies=[Depends(validate_api_key)])
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image to ComfyUI for use in generation

    Args:
        file: Image file to upload

    Returns:
        dict: Upload result with filename
    """
    try:
        # Read file content
        content = await file.read()

        # Upload to ComfyUI
        filename = await comfyui_client.upload_image(content, file.filename or "upload.png")

        logger.info(f"Image uploaded successfully: {filename}")

        return {
            "success": True,
            "filename": filename,
            "original_filename": file.filename
        }

    except Exception as e:
        logger.error(f"Failed to upload image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )
