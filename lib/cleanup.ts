// lib/cleanup.ts
import { jobManager } from './jobManager';

const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
const JOB_LIFETIME = 60 * 60 * 1000; // 1 hour

export function startCleanupTask() {
  setInterval(() => {
    console.log('Running job cleanup...');
    jobManager.cleanup(JOB_LIFETIME);
  }, CLEANUP_INTERVAL);
}
