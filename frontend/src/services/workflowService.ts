import apiService from './api';
import { WorkflowConfig, WorkflowCreateRequest, WorkflowListResponse } from '../types/workflow';

export const workflowService = {
  async list(): Promise<WorkflowListResponse> {
    return apiService.get<WorkflowListResponse>('/workflows');
  },

  async get(id: string): Promise<WorkflowConfig> {
    return apiService.get<WorkflowConfig>(`/workflows/${id}`);
  },

  async create(data: WorkflowCreateRequest): Promise<WorkflowConfig> {
    return apiService.post<WorkflowConfig>('/workflows', data);
  },

  async update(id: string, data: Partial<WorkflowConfig>): Promise<WorkflowConfig> {
    return apiService.put<WorkflowConfig>(`/workflows/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiService.delete(`/workflows/${id}`);
  },

  async import(file: File, name?: string, description?: string): Promise<WorkflowConfig> {
    return apiService.upload<WorkflowConfig>('/workflows/import', file, {
      name,
      description,
    });
  },
};
