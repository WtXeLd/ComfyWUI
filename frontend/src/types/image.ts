export interface ImageMetadata {
  id: string;
  filename: string;
  workflow_id: string;
  workflow_name: string;
  prompt: string;
  prompt_id: string;
  file_path: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
  metadata: Record<string, any>;
}

export interface ImageListResponse {
  images: ImageMetadata[];
  total: number;
  page: number;
  page_size: number;
}
