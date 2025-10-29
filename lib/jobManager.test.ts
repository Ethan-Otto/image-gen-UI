// lib/jobManager.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { JobManager } from './jobManager';

describe('JobManager', () => {
  let manager: JobManager;

  beforeEach(() => {
    manager = new JobManager();
  });

  it('creates a new job with pending status', () => {
    const jobId = manager.createJob();
    const job = manager.getJob(jobId);

    expect(job).toBeDefined();
    expect(job?.status).toBe('pending');
  });

  it('updates job status', () => {
    const jobId = manager.createJob();
    manager.updateJob(jobId, { status: 'complete', imageUrl: 'test.png' });

    const job = manager.getJob(jobId);
    expect(job?.status).toBe('complete');
    expect(job?.imageUrl).toBe('test.png');
  });

  it('returns undefined for non-existent job', () => {
    const job = manager.getJob('fake-id');
    expect(job).toBeUndefined();
  });
});
