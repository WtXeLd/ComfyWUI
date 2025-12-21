import { useState } from 'react';
import apiService from '../services/api';

interface UseImageUploadOptions {
  uploadEndpoint: string;
  onError: (error: string) => void;
}

interface UseImageUploadReturn {
  uploadedFile: string | null;
  previewUrl: string | null;
  isUploading: boolean;
  handleUpload: (file: File) => Promise<void>;
  handleRemove: () => void;
}

/**
 * Custom hook for image file upload with preview
 * Handles file validation, preview generation, and upload to backend
 *
 * @param options - Configuration with upload endpoint and error callback
 * @returns Upload state and control functions
 */
export function useImageUpload(options: UseImageUploadOptions): UseImageUploadReturn {
  const { uploadEndpoint, onError } = options;

  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file');
      return;
    }

    setIsUploading(true);
    onError(''); // Clear previous errors

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      const formData = new FormData();
      formData.append('file', file);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const response = await fetch(`${apiBaseUrl}${uploadEndpoint}`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiService.getApiKey() || '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      setUploadedFile(result.filename);

      console.log('Image uploaded:', result.filename);
    } catch (err: any) {
      onError(err.message || 'Failed to upload image');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
  };

  return {
    uploadedFile,
    previewUrl,
    isUploading,
    handleUpload,
    handleRemove,
  };
}
