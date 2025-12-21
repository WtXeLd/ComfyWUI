export interface GenerationRequest {
  workflow_id: string;
  prompt: string;
  override_params?: Record<string, any>;
  save_to_disk?: boolean;
  image_filename?: string;
}

export interface GenerationResponse {
  prompt_id: string;
  workflow_id: string;
  status: string;
  message?: string;
}

export interface ProgressUpdate {
  prompt_id: string;
  status: 'processing' | 'completed' | 'error';
  current_node?: string;
  progress_percent?: number;
  error?: string;
  images?: Array<{
    id: string;
    filename: string;
    file_path: string;
  }>;
}
