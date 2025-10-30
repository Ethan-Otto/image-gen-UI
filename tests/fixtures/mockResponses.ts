// Mock API responses for testing
import { GenerateResponse, StatusResponse } from '@/lib/types';

// Mock base64 image (1x1 red pixel PNG)
export const MOCK_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// Mock base64 uploaded image (1x1 blue pixel PNG)
export const MOCK_UPLOADED_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Mock successful generation response
export const mockGenerateResponse = (
  imageCount: number = 5
): GenerateResponse => {
  const jobIds = Array.from({ length: imageCount }, (_, i) => `job-${i + 1}`);
  return {
    batchId: 'batch-1',
    jobIds,
    status: 'pending',
  };
};

// Mock status responses for different states
export const mockPendingStatus = (jobId: string): StatusResponse => ({
  jobId,
  status: 'pending',
});

export const mockGeneratingStatus = (jobId: string): StatusResponse => ({
  jobId,
  status: 'generating',
});

export const mockCompleteStatus = (jobId: string): StatusResponse => ({
  jobId,
  status: 'complete',
  imageUrl: MOCK_IMAGE_BASE64,
});

export const mockErrorStatus = (jobId: string, error?: string): StatusResponse => ({
  jobId,
  status: 'error',
  error: error || 'Generation failed',
});

// Helper to create a sequence of status updates
export const mockStatusProgression = (jobId: string) => [
  mockPendingStatus(jobId),
  mockGeneratingStatus(jobId),
  mockCompleteStatus(jobId),
];

// Mock validation error responses
export const mockValidationErrors = {
  shortPrompt: {
    error: 'Prompt must be at least 3 characters',
  },
  invalidImageCount: {
    error: 'Image count must be between 1 and 10',
  },
  invalidConcurrency: {
    error: 'Concurrency must be between 1 and 5',
  },
};

// Mock network error
export const mockNetworkError = {
  error: 'Network error',
};

// Helper to create multiple complete jobs
export const mockMultipleCompleteJobs = (count: number): StatusResponse[] => {
  return Array.from({ length: count }, (_, i) => mockCompleteStatus(`job-${i + 1}`));
};

// Helper to create mixed status jobs (some complete, some generating, some error)
export const mockMixedStatusJobs = (): StatusResponse[] => [
  mockCompleteStatus('job-1'),
  mockCompleteStatus('job-2'),
  mockGeneratingStatus('job-3'),
  mockErrorStatus('job-4', 'API quota exceeded'),
  mockPendingStatus('job-5'),
];
