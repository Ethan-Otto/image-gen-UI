// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/jobManager';
import { getGeminiClient } from '@/lib/gemini';
import { GenerateRequest, GenerateResponse } from '@/lib/types';
import { startCleanupTask } from '@/lib/cleanup';

// Start cleanup task once
let cleanupStarted = false;
if (!cleanupStarted) {
  startCleanupTask();
  cleanupStarted = true;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    // Validation
    if (!body.prompt || body.prompt.length < 3) {
      return NextResponse.json(
        { error: 'Prompt must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (body.imageCount < 1 || body.imageCount > 10) {
      return NextResponse.json(
        { error: 'Image count must be between 1 and 10' },
        { status: 400 }
      );
    }

    if (body.concurrency < 1 || body.concurrency > 5) {
      return NextResponse.json(
        { error: 'Concurrency must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Create jobs
    const jobIds: string[] = [];
    for (let i = 0; i < body.imageCount; i++) {
      const jobId = jobManager.createJob();
      jobIds.push(jobId);
    }

    // Create batch
    const batchId = jobManager.createBatch(jobIds, body.concurrency);

    // Start processing asynchronously (don't await)
    processJobs(jobIds, body, body.concurrency);

    const response: GenerateResponse = {
      batchId,
      jobIds,
      status: 'pending',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processJobs(
  jobIds: string[],
  request: GenerateRequest,
  concurrency: number
) {
  const queue = [...jobIds];
  const active = new Set<Promise<void>>();

  while (queue.length > 0 || active.size > 0) {
    // Start new jobs up to concurrency limit
    while (active.size < concurrency && queue.length > 0) {
      const jobId = queue.shift()!;
      const promise = processJob(jobId, request).finally(() => {
        active.delete(promise);
      });
      active.add(promise);
    }

    // Wait for at least one to complete
    if (active.size > 0) {
      await Promise.race(active);
    }
  }
}

async function processJob(jobId: string, request: GenerateRequest) {
  try {
    jobManager.updateJob(jobId, { status: 'generating' });

    const geminiClient = getGeminiClient();
    const imageUrl = await geminiClient.generateImage(request.prompt, {
      temperature: request.temperature,
      image: request.image,
      mode: request.mode,
    });

    jobManager.updateJob(jobId, {
      status: 'complete',
      imageUrl,
    });
  } catch (error) {
    jobManager.updateJob(jobId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
