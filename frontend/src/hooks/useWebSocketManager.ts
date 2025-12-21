import { useEffect, useRef } from 'react';
import apiService from '../services/api';

interface UseWebSocketManagerOptions {
  onProgress: (promptId: string, data: any) => void;
  onComplete: (promptId: string, imageData?: any) => void;
  onError: (promptId: string, error: string) => void;
}

interface UseWebSocketManagerReturn {
  connect: (promptId: string, workflowId: string, prompt: string, overrideParams?: any) => void;
  disconnect: (promptId: string) => void;
  disconnectAll: () => void;
}

/**
 * Custom hook for managing WebSocket connections for generation monitoring
 * Supports multiple concurrent connections (one per prompt_id)
 *
 * @param options - Callback functions for progress, completion, and errors
 * @returns Connection control functions
 */
export function useWebSocketManager(options: UseWebSocketManagerOptions): UseWebSocketManagerReturn {
  const { onProgress, onComplete, onError } = options;
  const wsMapRef = useRef<Map<string, WebSocket>>(new Map());

  // Connect to WebSocket for a specific prompt
  const connect = (promptId: string, workflowId: string, prompt: string, overrideParams?: any) => {
    console.log('WebSocket connect called for prompt:', promptId);

    // Close existing connection for this prompt_id if any
    const existingWs = wsMapRef.current.get(promptId);
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      console.log(`Closing existing WebSocket for prompt ${promptId}`);
      existingWs.close();
    }

    // Get API base URL from environment or use current origin
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    // Convert http/https to ws/wss for WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = apiBaseUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/api/generate/ws/${promptId}`;

    const ws = new WebSocket(wsUrl);
    wsMapRef.current.set(promptId, ws);

    ws.onopen = () => {
      console.log(`WebSocket connected for prompt ${promptId}`);
      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        api_key: apiService.getApiKey()
      }));

      // Start monitoring after a short delay
      setTimeout(() => {
        const monitorMessage = {
          type: 'monitor',
          prompt_id: promptId,
          workflow_id: workflowId,
          prompt: prompt,
          save_to_disk: true,
          override_params: overrideParams
        };
        console.log('Sending monitor message:', monitorMessage);
        ws.send(JSON.stringify(monitorMessage));
      }, 100);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message:', message);

        if (message.type === 'progress' && message.data) {
          const data = message.data;

          // Notify progress update
          onProgress(promptId, data);

          // If completed, notify completion
          if (data.status === 'completed') {
            console.log('Generation completed, images:', data.images);
            onComplete(promptId, data);
          } else if (data.status === 'error') {
            // Notify error
            console.error('Generation error:', data.error);
            onError(promptId, data.error || 'Unknown error');
          }
        } else if (message.type === 'error') {
          console.error('WebSocket error:', message.data);
          onError(promptId, message.data?.error || 'Unknown error');
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for prompt ${promptId}:`, error);
      onError(promptId, 'WebSocket connection error');
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for prompt ${promptId}`);
      wsMapRef.current.delete(promptId);
    };
  };

  // Disconnect a specific WebSocket connection
  const disconnect = (promptId: string) => {
    const ws = wsMapRef.current.get(promptId);
    if (ws) {
      console.log(`Disconnecting WebSocket for prompt ${promptId}`);
      ws.close();
      wsMapRef.current.delete(promptId);
    }
  };

  // Disconnect all WebSocket connections
  const disconnectAll = () => {
    console.log('Disconnecting all WebSocket connections');
    wsMapRef.current.forEach((ws, promptId) => {
      console.log(`Closing WebSocket for prompt ${promptId}`);
      ws.close();
    });
    wsMapRef.current.clear();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, []);

  return {
    connect,
    disconnect,
    disconnectAll,
  };
}
