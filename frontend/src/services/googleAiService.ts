import apiService from './api';

export interface GoogleAIGenerateRequest {
  prompt: string;
  model?: string;
  aspect_ratio?: string;
  resolution_tier?: string;
  reference_image?: string;
}

export interface GoogleAIGenerateResponse {
  status: 'success' | 'failed';
  message: string;
  image_id?: string;
  image_url?: string;
  width?: number;
  height?: number;
}

export interface GoogleAIModel {
  id: string;
  name: string;
  supports_resolution_tiers: boolean;
  aspect_ratios: string[];
  resolution_tiers?: string[];
}

export const googleAiService = {
  async generate(request: GoogleAIGenerateRequest): Promise<GoogleAIGenerateResponse> {
    return apiService.post<GoogleAIGenerateResponse>('/google-ai/generate', request);
  },

  async listModels(): Promise<{ models: GoogleAIModel[] }> {
    return apiService.get<{ models: GoogleAIModel[] }>('/google-ai/models');
  }
};

export default googleAiService;
