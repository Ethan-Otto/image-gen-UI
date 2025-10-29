// lib/types.ts

export type JobStatus = 'pending' | 'generating' | 'complete' | 'error';

export type GenerationMode = 'edit' | 'reference';

export interface GenerateRequest {
  prompt: string;
  imageCount: number;
  concurrency: number;
  temperature: number;
  image?: string; // base64
  mode?: GenerationMode;
}

export interface Job {
  id: string;
  status: JobStatus;
  imageUrl?: string;
  error?: string;
  createdAt: number;
}

export interface Batch {
  id: string;
  jobIds: string[];
  concurrency: number;
  createdAt: number;
}

export interface GenerateResponse {
  batchId: string;
  jobIds: string[];
  status: JobStatus;
}

export interface StatusResponse {
  jobId: string;
  status: JobStatus;
  imageUrl?: string;
  error?: string;
}
