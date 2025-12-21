"""
ComfyUI API Client
Refactored from the original comfyui.py script to use async/await
"""
import httpx
import websockets
import json
import uuid
from typing import AsyncGenerator, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ComfyUIError(Exception):
    """Base exception for ComfyUI client errors"""
    pass


class ConnectionError(ComfyUIError):
    """Connection to ComfyUI server failed"""
    pass


class WorkflowExecutionError(ComfyUIError):
    """Workflow execution failed"""
    pass


class ImageDownloadError(ComfyUIError):
    """Image download failed"""
    pass


class ImageUploadError(ComfyUIError):
    """Image upload failed"""
    pass


class ComfyUIClient:
    """Async client for ComfyUI API"""

    def __init__(self, base_url: str, client_id: Optional[str] = None):
        """
        Initialize ComfyUI client

        Args:
            base_url: Base URL of ComfyUI server (e.g., http://localhost:8188)
            client_id: Optional client ID, generates one if not provided
        """
        self.base_url = base_url.rstrip('/')
        self.client_id = client_id or str(uuid.uuid4())
        self.http_client = None

    async def __aenter__(self):
        """Async context manager entry"""
        self.http_client = httpx.AsyncClient(timeout=30.0)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.http_client:
            await self.http_client.aclose()

    async def submit_workflow(self, workflow: dict, client_id: Optional[str] = None) -> str:
        """
        Submit a workflow to ComfyUI for generation

        Args:
            workflow: ComfyUI workflow dictionary
            client_id: Optional client ID for this specific task. If not provided, uses self.client_id

        Returns:
            str: Prompt ID for tracking the task

        Raises:
            ConnectionError: If connection to ComfyUI fails
            ComfyUIError: If submission fails
        """
        task_client_id = client_id or self.client_id
        data = {
            "client_id": task_client_id,
            "prompt": workflow
        }

        try:
            if not self.http_client:
                self.http_client = httpx.AsyncClient(timeout=30.0)

            logger.info(f"Submitting workflow to {self.base_url}/prompt")
            response = await self.http_client.post(
                f"{self.base_url}/prompt",
                json=data
            )
            response.raise_for_status()

            result = response.json()

            # Check for validation errors from ComfyUI
            # ComfyUI can return errors in two formats:
            # 1. {"error": {"type": "...", "message": "...", "details": "..."}}
            # 2. {"type": "...", "message": "...", "details": "..."}
            error_info = None
            if 'error' in result:
                error_info = result['error']
            elif 'type' in result and 'message' in result:
                # Direct error format (e.g., prompt_outputs_failed_validation)
                error_info = result

            if error_info:
                error_type = error_info.get('type', 'unknown')
                error_message = error_info.get('message', 'Unknown error')
                error_details = error_info.get('details', '')
                extra_info = error_info.get('extra_info', {})

                full_error = f"ComfyUI Error [{error_type}]: {error_message}"
                if error_details:
                    full_error += f" - Details: {error_details}"
                if extra_info:
                    full_error += f" - Extra info: {extra_info}"

                logger.error(f"ComfyUI validation error: {error_info}")
                raise ComfyUIError(full_error)

            prompt_id = result.get('prompt_id')

            if not prompt_id:
                raise ComfyUIError(f"No prompt_id in response: {result}")

            logger.info(f"Workflow submitted successfully. Prompt ID: {prompt_id}")
            return prompt_id

        except httpx.ConnectError as e:
            logger.error(f"Connection error: {str(e)}")
            raise ConnectionError(
                f"Cannot connect to ComfyUI at {self.base_url}. "
                "Please check if ComfyUI is running."
            ) from e
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {str(e)}")

            # Try to extract error details from response body
            try:
                error_response = e.response.json()

                # Check if error response contains validation error
                error_info = None
                if 'error' in error_response:
                    error_info = error_response['error']
                elif 'type' in error_response and 'message' in error_response:
                    error_info = error_response

                if error_info:
                    error_type = error_info.get('type', 'unknown')
                    error_message = error_info.get('message', 'Unknown error')
                    error_details = error_info.get('details', '')

                    full_error = f"ComfyUI Error [{error_type}]: {error_message}"
                    if error_details:
                        full_error += f" - Details: {error_details}"

                    logger.error(f"ComfyUI error details: {error_info}")
                    raise ComfyUIError(full_error) from e
            except (ValueError, KeyError):
                # Failed to parse error response, use generic message
                pass

            raise ComfyUIError(f"HTTP error {e.response.status_code}: {e.response.text[:200]}") from e
        except ComfyUIError:
            # Re-raise ComfyUIError as-is
            raise
        except ConnectionError:
            # Re-raise ConnectionError as-is
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise ComfyUIError(f"Failed to submit workflow: {str(e)}") from e

    async def get_history(self, prompt_id: str) -> Optional[dict]:
        """
        Get execution history for a prompt

        Args:
            prompt_id: Prompt ID to query

        Returns:
            dict: History data or None if not found
        """
        try:
            if not self.http_client:
                self.http_client = httpx.AsyncClient(timeout=30.0)

            response = await self.http_client.get(f"{self.base_url}/history/{prompt_id}")
            response.raise_for_status()

            history_data = response.json()
            return history_data.get(prompt_id)
        except Exception as e:
            logger.warning(f"Failed to get history for {prompt_id}: {str(e)}")
            return None

    async def monitor_progress(
        self,
        prompt_id: str,
        timeout: float = 300.0,
        client_id: Optional[str] = None
    ) -> AsyncGenerator[dict, None]:
        """
        Monitor workflow execution progress via WebSocket

        Args:
            prompt_id: Prompt ID to monitor
            timeout: Timeout in seconds (default 300)
            client_id: Optional client ID to use for monitoring. If not provided, uses self.client_id

        Yields:
            dict: Progress updates with structure:
                {
                    "type": "executing" | "executed" | "error",
                    "node": node_id (for executing type),
                    "images": [...] (for executed type),
                    "error": error_message (for error type)
                }

        Raises:
            ConnectionError: If WebSocket connection fails
            WorkflowExecutionError: If workflow execution fails
        """
        import asyncio

        # Use the provided client_id or fall back to self.client_id
        task_client_id = client_id or self.client_id

        # First check if task already completed (e.g., cached result)
        await asyncio.sleep(0.5)  # Small delay to let ComfyUI process
        history = await self.get_history(prompt_id)

        if history and history.get('status', {}).get('completed', False):
            logger.info(f"Task {prompt_id} already completed (cached result)")
            # Extract images from history
            outputs = history.get('outputs', {})
            images = []
            for node_output in outputs.values():
                if 'images' in node_output:
                    images.extend(node_output['images'])

            if images:
                yield {
                    "type": "executed",
                    "images": images
                }
                return
            else:
                logger.warning("Task completed but no images found in history")

        ws_url = f"ws://{self.base_url.replace('http://', '').replace('https://', '')}/ws?clientId={task_client_id}"

        try:
            logger.info(f"Connecting to WebSocket: {ws_url}")

            async with websockets.connect(ws_url, open_timeout=10) as websocket:
                logger.info("WebSocket connected")

                import asyncio
                start_time = asyncio.get_event_loop().time()

                while True:
                    # Check timeout
                    if asyncio.get_event_loop().time() - start_time > timeout:
                        raise WorkflowExecutionError(f"Execution timeout after {timeout} seconds")

                    try:
                        # Receive message with timeout
                        message_str = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=5.0
                        )
                        message = json.loads(message_str)
                        msg_type = message.get('type')

                        # Executing progress
                        if msg_type == 'executing':
                            data = message.get('data', {})
                            if data.get('prompt_id') == prompt_id:
                                node = data.get('node')
                                if node:
                                    logger.info(f"Executing node: {node}")
                                    yield {
                                        "type": "executing",
                                        "node": node
                                    }

                        # Task completed
                        elif msg_type == 'executed':
                            data = message.get('data', {})
                            if data.get('prompt_id') == prompt_id:
                                logger.info("Workflow execution completed")
                                output = data.get('output', {})
                                images = output.get('images', [])
                                yield {
                                    "type": "executed",
                                    "images": images
                                }
                                return

                        # Execution error
                        elif msg_type == 'execution_error':
                            data = message.get('data', {})
                            if data.get('prompt_id') == prompt_id:
                                error_msg = data.get('exception_message', 'Unknown error')
                                node_id = data.get('node_id', 'unknown')
                                logger.error(f"Execution error at node {node_id}: {error_msg}")
                                yield {
                                    "type": "error",
                                    "error": f"Error at node {node_id}: {error_msg}"
                                }
                                raise WorkflowExecutionError(f"Error at node {node_id}: {error_msg}")

                        # Execution interrupted
                        elif msg_type == 'execution_interrupted':
                            data = message.get('data', {})
                            if data.get('prompt_id') == prompt_id:
                                logger.warning("Workflow execution interrupted")
                                yield {
                                    "type": "error",
                                    "error": "Workflow execution was interrupted"
                                }
                                raise WorkflowExecutionError("Workflow execution was interrupted")

                    except asyncio.TimeoutError:
                        # No message received, continue waiting
                        continue

        except websockets.exceptions.WebSocketException as e:
            logger.error(f"WebSocket error: {str(e)}")
            raise ConnectionError(f"WebSocket connection failed: {str(e)}") from e

    async def download_image(
        self,
        filename: str,
        subfolder: str = ""
    ) -> bytes:
        """
        Download a generated image from ComfyUI

        Args:
            filename: Image filename
            subfolder: Optional subfolder path

        Returns:
            bytes: Image data

        Raises:
            ImageDownloadError: If download fails
        """
        try:
            if not self.http_client:
                self.http_client = httpx.AsyncClient(timeout=30.0)

            # Build download URL
            if subfolder:
                url = f"{self.base_url}/view?filename={filename}&subfolder={subfolder}"
            else:
                url = f"{self.base_url}/view?filename={filename}"

            logger.info(f"Downloading image: {filename}")
            response = await self.http_client.get(url)
            response.raise_for_status()

            logger.info(f"Image downloaded successfully: {filename}")
            return response.content

        except Exception as e:
            logger.error(f"Failed to download image {filename}: {str(e)}")
            raise ImageDownloadError(f"Failed to download {filename}: {str(e)}") from e

    async def upload_image(
        self,
        image_data: bytes,
        filename: str
    ) -> str:
        """
        Upload an image to ComfyUI

        Args:
            image_data: Image binary data
            filename: Original filename

        Returns:
            str: Uploaded filename (may be modified by ComfyUI)

        Raises:
            ImageUploadError: If upload fails
        """
        try:
            if not self.http_client:
                self.http_client = httpx.AsyncClient(timeout=30.0)

            # ComfyUI upload endpoint
            url = f"{self.base_url}/upload/image"

            # Prepare multipart form data
            files = {
                "image": (filename, image_data, "image/png")
            }

            logger.info(f"Uploading image: {filename}")
            response = await self.http_client.post(url, files=files)
            response.raise_for_status()

            result = response.json()
            uploaded_filename = result.get("name", filename)

            logger.info(f"Image uploaded successfully: {uploaded_filename}")
            return uploaded_filename

        except Exception as e:
            logger.error(f"Failed to upload image {filename}: {str(e)}")
            raise ImageUploadError(f"Failed to upload {filename}: {str(e)}") from e

    @staticmethod
    def modify_prompt_node(
        workflow: dict,
        node_id: str,
        prompt: str
    ) -> dict:
        """
        Modify the prompt text in a specific node

        Args:
            workflow: ComfyUI workflow dictionary
            node_id: Node ID to modify
            prompt: New prompt text

        Returns:
            dict: Modified workflow
        """
        if node_id in workflow:
            if "inputs" not in workflow[node_id]:
                workflow[node_id]["inputs"] = {}
            workflow[node_id]["inputs"]["text"] = prompt
            logger.info(f"Modified prompt in node {node_id}")
        else:
            logger.warning(f"Node {node_id} not found in workflow")

        return workflow

    @staticmethod
    def apply_parameter_overrides(
        workflow: dict,
        overrides: dict
    ) -> tuple[dict, dict]:
        """
        Apply parameter overrides to workflow
        Supports both structured format and simple key-value pairs

        Args:
            workflow: ComfyUI workflow dictionary
            overrides: Dictionary of parameter overrides
                Format 1 (structured): {
                    "param_name": {
                        "node_id": "44",
                        "path": "inputs.seed",
                        "value": 12345
                    }
                }
                Format 2 (simple - auto-detected): {
                    "seed": 12345,
                    "steps": 20,
                    "cfg": 7.0,
                    "sampler": "euler",
                    ...
                }

        Returns:
            tuple: (Modified workflow, Actual parameters used)
        """
        import random

        # Track actual parameters used
        actual_params = {}

        # First, randomize all seed values in the workflow by default
        # This ensures random generation unless user explicitly sets a seed
        for node_id, node_data in workflow.items():
            if not isinstance(node_data, dict) or 'inputs' not in node_data:
                continue

            inputs = node_data['inputs']
            # Check for seed parameters
            for seed_param in ['seed', 'noise_seed']:
                if seed_param in inputs and not isinstance(inputs[seed_param], list):
                    # Generate a random seed
                    random_seed = random.randint(0, 0xffffffffffffffff)
                    inputs[seed_param] = random_seed
                    # Track the seed parameter (use generic 'seed' name)
                    actual_params['seed'] = random_seed
                    logger.info(f"Randomized seed in node {node_id}: {random_seed}")

        # Parameter mapping for common parameters
        PARAM_PATTERNS = {
            'seed': ['seed', 'noise_seed'],
            'steps': ['steps'],
            'cfg': ['cfg'],
            'sampler': ['sampler_name', 'sampler'],
            'scheduler': ['scheduler'],
            'denoise': ['denoise'],
            'width': ['width'],
            'height': ['height'],
            'batch_size': ['batch_size']
        }

        for param_name, value in overrides.items():
            # Check if it's structured format
            if isinstance(value, dict) and all(k in value for k in ['node_id', 'path', 'value']):
                # Structured format
                node_id = value.get("node_id")
                path = value.get("path")
                actual_value = value.get("value")

                if not all([node_id, path, actual_value is not None]):
                    logger.warning(f"Invalid structured override for {param_name}")
                    continue

                if node_id not in workflow:
                    logger.warning(f"Node {node_id} not found for override {param_name}")
                    continue

                # Navigate path and set value
                parts = path.split('.')
                current = workflow[node_id]

                for part in parts[:-1]:
                    if part not in current:
                        current[part] = {}
                    current = current[part]

                # Generate random seed if value is -1
                if param_name in ['seed', 'noise_seed'] and actual_value == -1:
                    actual_value = random.randint(0, 0xffffffffffffffff)
                    logger.info(f"Generated random seed: {actual_value}")

                current[parts[-1]] = actual_value
                # Track this parameter
                actual_params[param_name] = actual_value
                logger.info(f"Applied structured override: {param_name} = {actual_value} at {node_id}.{path}")

            else:
                # Simple format - auto-detect nodes
                patterns = PARAM_PATTERNS.get(param_name, [param_name])
                applied = False

                for node_id, node_data in workflow.items():
                    if 'inputs' not in node_data:
                        continue

                    inputs = node_data['inputs']

                    # Try each pattern
                    for pattern in patterns:
                        if pattern in inputs:
                            # Found matching parameter
                            # Generate random seed if value is -1
                            actual_value = value
                            if param_name in ['seed', 'noise_seed'] and value == -1:
                                actual_value = random.randint(0, 0xffffffffffffffff)
                                logger.info(f"Generated random seed: {actual_value}")

                            inputs[pattern] = actual_value
                            # Track this parameter
                            actual_params[param_name] = actual_value
                            logger.info(f"Applied auto-detected override: {param_name} = {actual_value} at node {node_id}.inputs.{pattern}")
                            applied = True
                            break

                    if applied:
                        break

                if not applied:
                    logger.warning(f"Could not find node for parameter: {param_name}")

        return workflow, actual_params
