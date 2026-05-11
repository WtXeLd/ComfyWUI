import { useState } from 'react';
import { cloudService } from '../services/cloudService';
import { imageService } from '../services/imageService';
import type { CloudModel } from '../services/cloudService';
import type { ImageMetadata } from '../types/image';

interface UseCloudGenerationOptions {
  models: CloudModel[];
  onGenerationStart: (generatingImage: any) => void;
  onGenerationComplete: (tempId: string, imageData: ImageMetadata) => void;
  onGenerationFailed: (tempId: string, error: string) => void;
  onError: (error: string) => void;
}

interface GenerateParams {
  prompt: string;
  modelId: string;
  aspectRatio: string;
  resolutionTier?: string;
  width?: number;
  height?: number;
}

interface UseCloudGenerationReturn {
  referenceImage: string | null;
  referencePreview: string | null;
  handleReferenceUpload: (file: File) => void;
  handleReferenceRemove: () => void;
  generate: (params: GenerateParams) => Promise<void>;
}

/**
 * Custom hook for unified cloud generation (Google AI, Runware, etc.)
 * Handles reference image upload, generation request, and loading card management
 *
 * @param options - Configuration with models, callbacks
 * @returns Reference image state, control functions, and generate function
 */
export function useCloudGeneration(options: UseCloudGenerationOptions): UseCloudGenerationReturn {
  const { models, onGenerationStart, onGenerationComplete, onGenerationFailed, onError } = options;

  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  const handleReferenceUpload = (file: File) => {
    // Create preview with FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setReferencePreview(dataUrl);
      setReferenceImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleReferenceRemove = () => {
    setReferenceImage(null);
    setReferencePreview(null);
  };

  const generate = async (params: GenerateParams): Promise<void> => {
    const { prompt, modelId, aspectRatio, resolutionTier, width, height } = params;

    if (!prompt.trim()) {
      onError('Please enter a prompt');
      return;
    }

    // Generate a unique temporary ID for the loading card
    const tempId = `cloud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Find model name
    const modelData = models.find(m => m.id === modelId);
    const modelName = modelData?.name || 'Cloud';

    // Create generating image record
    const newGeneratingImage = {
      id: tempId,
      prompt: prompt,
      workflow_id: 'cloud',
      workflow_name: modelName,
      status: 'processing',
      progress: 0,
      timestamp: Date.now()
    };

    // Notify that generation has started
    onGenerationStart(newGeneratingImage);

    try {
      // Call cloud generation service
      const response = await cloudService.generate({
        prompt: prompt,
        model_id: modelId,
        aspect_ratio: aspectRatio,
        resolution_tier: resolutionTier,
        reference_image: referenceImage || undefined,
        width: width,
        height: height
      });

      if (response.status === 'failed') {
        // Notify failure
        onGenerationFailed(tempId, response.message || 'Generation failed');
        onError(`Generation failed: ${response.message}`);
        return;
      }

      // Backend saves immediately, fetch the new image directly
      try {
        const newImages = await imageService.list({ page: 1, page_size: 50 });
        const newImage = newImages.images.find(img => img.id === response.image_id);

        if (newImage) {
          // Successfully found the image
          onGenerationComplete(tempId, newImage);
        } else {
          // Image not found
          console.error(`Image not found for ${response.image_id}`);
          onGenerationFailed(tempId, 'Image not found after generation');
        }
      } catch (err) {
        console.error(`Error fetching image ${response.image_id}:`, err);
        onGenerationFailed(tempId, 'Failed to retrieve generated image');
      }
    } catch (err: any) {
      // Notify failure
      onGenerationFailed(tempId, err.message || 'Generation failed');
      onError(`Generation failed: ${err.message}`);
    }
  };

  return {
    referenceImage,
    referencePreview,
    handleReferenceUpload,
    handleReferenceRemove,
    generate,
  };
}
