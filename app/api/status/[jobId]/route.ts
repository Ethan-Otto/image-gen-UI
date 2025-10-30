// app/api/status/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/jobManager';
import { StatusResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = jobManager.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const response: StatusResponse = {
      jobId: job.id,
      status: job.status,
      imageUrl: job.imageUrl,
      error: job.error,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
