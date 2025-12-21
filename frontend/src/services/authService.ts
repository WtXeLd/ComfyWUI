import apiService from './api';

interface ValidateKeyResponse {
  valid: boolean;
  message: string;
}

export const authService = {
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await apiService.post<ValidateKeyResponse>('/auth/validate-key', {
        api_key: apiKey
      });
      return response.valid;
    } catch (error) {
      console.error('Failed to validate API key:', error);
      return false;
    }
  }
};

export default authService;
