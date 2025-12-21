import axios, { AxiosInstance } from 'axios';

// Get API base URL from environment or automatically use current host
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // With Nginx reverse proxy, use current origin (same host and port)
  return window.location.origin;
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private client: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load API key from localStorage
    this.apiKey = localStorage.getItem('api_key');

    // Add request interceptor to include API key
    this.client.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers['X-API-Key'] = this.apiKey;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('Authentication failed - invalid API key');
        }
        return Promise.reject(error);
      }
    );
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('api_key', key);
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('api_key');
  }

  get<T>(url: string, params?: any): Promise<T> {
    return this.client.get(url, { params }).then((res) => res.data);
  }

  post<T>(url: string, data?: any): Promise<T> {
    return this.client.post(url, data).then((res) => res.data);
  }

  put<T>(url: string, data?: any): Promise<T> {
    return this.client.put(url, data).then((res) => res.data);
  }

  delete<T>(url: string): Promise<T> {
    return this.client.delete(url).then((res) => res.data);
  }

  upload<T>(url: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.client
      .post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((res) => res.data);
  }
}

export const apiService = new ApiService();
export default apiService;
