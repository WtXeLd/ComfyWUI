import apiService from './api';
import { GenerationRequest, GenerationResponse } from '../types/generation';

export const generationService = {
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    return apiService.post<GenerationResponse>('/generate', request);
  },
};
