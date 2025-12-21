import { generationService } from '../services/generationService';
import type { WorkflowConfig } from '../types/workflow';

interface UseLocalGenerationOptions {
  workflows: WorkflowConfig[];
  onGenerationStart: (generatingImage: any) => void;
  onError: (error: string) => void;
}

interface GenerateParams {
  workflowId: string;
  prompt: string;
  uploadedImageFile?: string;
}

interface UseLocalGenerationReturn {
  generate: (params: GenerateParams) => Promise<string | null>;
}

/**
 * Custom hook for local ComfyUI generation
 * Handles parameter overrides, generation request, and WebSocket monitoring setup
 *
 * @param options - Configuration with workflows, callbacks
 * @returns Generate function that returns prompt_id
 */
export function useLocalGeneration(options: UseLocalGenerationOptions): UseLocalGenerationReturn {
  const { workflows, onGenerationStart, onError } = options;

  const generate = async (params: GenerateParams): Promise<string | null> => {
    const { workflowId, prompt, uploadedImageFile } = params;

    if (!workflowId) {
      onError('Please select a workflow');
      return null;
    }

    try {
      // Get parameter overrides from localStorage
      const savedOverrides = localStorage.getItem('parameterOverrides');
      let overrideParams: any = null;

      if (savedOverrides) {
        try {
          const allOverrides = JSON.parse(savedOverrides);
          const workflowOverrides = allOverrides[workflowId];

          // Filter out empty values
          if (workflowOverrides) {
            overrideParams = {};
            for (const [key, value] of Object.entries(workflowOverrides)) {
              if (value !== '' && value !== null && value !== undefined) {
                overrideParams[key] = value;
              }
            }
            // If no valid overrides, set to null
            if (Object.keys(overrideParams).length === 0) {
              overrideParams = null;
            }
          }
        } catch (e) {
          console.error('Failed to parse parameter overrides:', e);
        }
      }

      // Call generation service
      const response = await generationService.generate({
        workflow_id: workflowId,
        prompt: prompt,
        override_params: overrideParams,
        save_to_disk: true,
        image_filename: uploadedImageFile || undefined,
      });

      // Check if generation failed
      if (response.status === 'failed') {
        onError(`Generation failed: ${response.message}`);
        return null;
      }

      // Find workflow name
      const workflow = workflows.find(w => w.id === workflowId);
      const workflowName = workflow?.name || 'Unknown';

      // Create generating image record
      const newGeneratingImage = {
        id: response.prompt_id,
        prompt: prompt,
        workflow_id: workflowId,
        workflow_name: workflowName,
        status: 'queued',
        progress: 0,
        override_params: overrideParams,
        timestamp: Date.now()
      };

      // Notify that generation has started
      onGenerationStart(newGeneratingImage);

      // Return prompt_id for WebSocket monitoring
      return response.prompt_id;
    } catch (err: any) {
      onError(`Generation failed: ${err.message}`);
      return null;
    }
  };

  return {
    generate,
  };
}
