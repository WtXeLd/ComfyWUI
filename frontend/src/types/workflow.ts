export interface ConfigurableParameter {
  node_id: string;
  path: string;
  param_type: 'number' | 'text' | 'dropdown';
  default: any;
  label: string;
  min_value?: number;
  max_value?: number;
  options?: string[];
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  workflow_json: Record<string, any>;
  prompt_node_id: string;
  image_node_id?: string;
  configurable_params: Record<string, ConfigurableParameter>;
  created_at: string;
  updated_at: string;
  is_default: boolean;
}

export interface WorkflowCreateRequest {
  name: string;
  description?: string;
  workflow_json: Record<string, any>;
  prompt_node_id?: string;
  image_node_id?: string;
}

export interface WorkflowListResponse {
  workflows: WorkflowConfig[];
  total: number;
}
