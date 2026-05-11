import apiService from './api';

export interface CloudGenerateRequest {
  prompt: string;
  model_id: string;
  aspect_ratio?: string;
  resolution_tier?: string;
  reference_image?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
}

export interface CloudGenerateResponse {
  status: 'success' | 'failed';
  message: string;
  image_id?: string;
  image_url?: string;
  width?: number;
  height?: number;
}

export interface CloudModel {
  id: string;
  name: string;
  provider: 'google_ai' | 'runware';
  model_id: string;
  supports_resolution_tiers: boolean;
  supports_reference_image: boolean;
  aspect_ratios: string[];
  resolution_tiers?: string[];
}

export const cloudService = {
  async generate(request: CloudGenerateRequest): Promise<CloudGenerateResponse> {
    return apiService.post<CloudGenerateResponse>('/cloud/generate', request);
  },

  async listModels(): Promise<{ models: CloudModel[] }> {
    return apiService.get<{ models: CloudModel[] }>('/cloud/models');
  },

  async addModel(model: CloudModel): Promise<CloudModel> {
    return apiService.post<CloudModel>('/cloud/models', model);
  },

  async updateModel(modelId: string, model: CloudModel): Promise<CloudModel> {
    return apiService.put<CloudModel>(`/cloud/models/${modelId}`, model);
  },

  async deleteModel(modelId: string): Promise<{ message: string }> {
    return apiService.delete<{ message: string }>(`/cloud/models/${modelId}`);
  },

  async reloadModels(): Promise<{ message: string; count: number }> {
    return apiService.post<{ message: string; count: number }>('/cloud/models/reload', {});
  }
};

export default cloudService;
