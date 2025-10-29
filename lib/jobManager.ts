// lib/jobManager.ts
import { Job, Batch } from './types';
import { randomUUID } from 'crypto';

export class JobManager {
  private jobs: Map<string, Job> = new Map();
  private batches: Map<string, Batch> = new Map();

  createJob(): string {
    const id = randomUUID();
    const job: Job = {
      id,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.jobs.set(id, job);
    return id;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<Job>): void {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...updates });
    }
  }

  createBatch(jobIds: string[], concurrency: number): string {
    const id = randomUUID();
    const batch: Batch = {
      id,
      jobIds,
      concurrency,
      createdAt: Date.now(),
    };
    this.batches.set(id, batch);
    return id;
  }

  getBatch(id: string): Batch | undefined {
    return this.batches.get(id);
  }

  cleanup(olderThanMs: number): void {
    const cutoff = Date.now() - olderThanMs;

    for (const [id, job] of this.jobs.entries()) {
      if (job.createdAt < cutoff) {
        this.jobs.delete(id);
      }
    }

    for (const [id, batch] of this.batches.entries()) {
      if (batch.createdAt < cutoff) {
        this.batches.delete(id);
      }
    }
  }
}

// Singleton instance
export const jobManager = new JobManager();
