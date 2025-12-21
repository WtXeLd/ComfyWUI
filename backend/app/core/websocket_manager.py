"""
WebSocket connection manager for real-time progress updates
"""
from fastapi import WebSocket
from typing import Dict
import logging
import json

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manager for WebSocket connections"""

    def __init__(self):
        """Initialize WebSocket manager"""
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        """
        Accept and register a WebSocket connection

        Args:
            client_id: Unique client identifier
            websocket: WebSocket connection
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"WebSocket client connected: {client_id}")

    async def disconnect(self, client_id: str):
        """
        Remove a WebSocket connection

        Args:
            client_id: Client identifier to disconnect
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"WebSocket client disconnected: {client_id}")

    async def send_message(self, client_id: str, message: dict):
        """
        Send a message to a specific client

        Args:
            client_id: Target client identifier
            message: Message dictionary to send
        """
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to {client_id}: {str(e)}")
                await self.disconnect(client_id)

    async def send_progress_update(self, client_id: str, update: dict):
        """
        Send a progress update to a client

        Args:
            client_id: Target client identifier
            update: Progress update dictionary
        """
        message = {
            "type": "progress",
            "data": update
        }
        await self.send_message(client_id, message)

    async def send_error(self, client_id: str, error: str):
        """
        Send an error message to a client

        Args:
            client_id: Target client identifier
            error: Error message
        """
        message = {
            "type": "error",
            "data": {"error": error}
        }
        await self.send_message(client_id, message)

    async def broadcast(self, message: dict):
        """
        Broadcast a message to all connected clients

        Args:
            message: Message dictionary to broadcast
        """
        disconnected = []

        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to {client_id}: {str(e)}")
                disconnected.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected:
            await self.disconnect(client_id)

    def is_connected(self, client_id: str) -> bool:
        """
        Check if a client is connected

        Args:
            client_id: Client identifier to check

        Returns:
            bool: True if connected
        """
        return client_id in self.active_connections

    def get_connection_count(self) -> int:
        """
        Get the number of active connections

        Returns:
            int: Number of active connections
        """
        return len(self.active_connections)


# Global instance
websocket_manager = WebSocketManager()
