import apiService from './api';
import { ImageListResponse, ImageMetadata } from '../types/image';

export const imageService = {
  async list(params?: {
    workflow_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<ImageListResponse> {
    return apiService.get<ImageListResponse>('/images', params);
  },

  async get(id: string): Promise<ImageMetadata> {
    return apiService.get<ImageMetadata>(`/images/${id}`);
  },

  async delete(id: string): Promise<void> {
    return apiService.delete(`/images/${id}`);
  },

  getDownloadUrl(id: string): string {
    // Get API base URL from environment or automatically use current origin (with Nginx proxy)
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const apiKey = apiService.getApiKey();
    return `${baseUrl}/api/images/${id}/download?api_key=${apiKey}`;
  },
};
