# Gemini Image Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js web app for parallel image generation using Google Gemini API with real-time progress tracking.

**Architecture:** Next.js App Router with API routes for backend, React components for UI, client polling for progress updates, in-memory job queue with concurrency control.

**Tech Stack:** Next.js 14+, React 18+, TypeScript, Tailwind CSS, Google Generative AI SDK

---

## Prerequisites

### Task 0: Research Gemini API

**Goal:** Understand Gemini's actual image generation capabilities and API structure.

**Files:**
- Create: `docs/gemini-api-research.md`

**Step 1: Research Gemini API documentation**

Visit: https://ai.google.dev/docs
Search for: "image generation", "multimodal", "vision"

Document in `docs/gemini-api-research.md`:
```markdown
# Gemini API Research

## Image Generation Capabilities
[Does Gemini generate images? Or only process them?]

## Relevant Models
[Which model: gemini-pro-vision, imagen, etc.?]

## API Structure
[Endpoint, request format, response format]

## Parameters
[temperature, top_k, top_p, etc.]

## Image Input
[How to pass images: base64, URL, file upload?]

## Rate Limits
[Requests per minute/day]

## Error Codes
[Common errors and handling]
```

**Step 2: Verify findings**

If Gemini doesn't generate images directly, identify correct Google API (e.g., Imagen API).
Update design doc if needed.

**Step 3: Document final API approach**

Add conclusion to research doc:
```markdown
## Implementation Decision
We will use [API NAME] with [METHOD] to generate images.
SDK: [@google/generative-ai] or [REST endpoint]
```

**Step 4: Commit research**

```bash
git add docs/gemini-api-research.md
git commit -m "docs: research Gemini/Google image generation API"
```

---

## Project Setup

### Task 1: Initialize Next.js Project

**Files:**
- Create: Next.js app scaffold with TypeScript and Tailwind CSS

**Step 1: Create Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Answer prompts:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- App Router: Yes
- Customize import alias: No

**Step 2: Verify setup**

```bash
npm run dev
```

Visit http://localhost:3000
Expected: Default Next.js welcome page

**Step 3: Clean up default files**

```bash
rm -f app/page.tsx app/layout.tsx
```

**Step 4: Commit initial setup**

```bash
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Gemini SDK**

```bash
npm install @google/generative-ai
```

**Step 2: Install dev dependencies**

```bash
npm install -D @types/node
```

**Step 3: Verify installation**

```bash
npm list @google/generative-ai
```

Expected: Shows installed version

**Step 4: Commit dependencies**

```bash
git add package.json package-lock.json
git commit -m "deps: add Google Generative AI SDK"
```

---

### Task 3: Setup Environment Variables

**Files:**
- Create: `.env.local`
- Create: `.env.example`

**Step 1: Create .env.local**

```bash
cat > .env.local << 'EOF'
GEMINI_API_KEY=your_api_key_here
EOF
```

**Step 2: Create .env.example**

```bash
cat > .env.example << 'EOF'
GEMINI_API_KEY=your_gemini_api_key
EOF
```

**Step 3: Verify .gitignore includes .env.local**

```bash
grep ".env.local" .gitignore
```

Expected: Line exists (Next.js creates this by default)

**Step 4: Commit example file**

```bash
git add .env.example
git commit -m "config: add environment variable template"
```

---

## Type Definitions

### Task 4: Create TypeScript Types

**Files:**
- Create: `lib/types.ts`

**Step 1: Create types file**

```typescript
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
  status: string;
}

export interface StatusResponse {
  jobId: string;
  status: JobStatus;
  imageUrl?: string;
  error?: string;
}
```

**Step 2: Commit types**

```bash
git add lib/types.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Backend - Job Management

### Task 5: Create Job Manager

**Files:**
- Create: `lib/jobManager.ts`

**Step 1: Write test file**

```typescript
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
```

**Step 2: Setup Jest (if not already)**

```bash
npm install -D jest @jest/globals @types/jest ts-jest
npx ts-jest config:init
```

**Step 3: Run test to verify it fails**

```bash
npm test jobManager.test.ts
```

Expected: FAIL - "Cannot find module './jobManager'"

**Step 4: Implement JobManager**

```typescript
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
```

**Step 5: Run test to verify it passes**

```bash
npm test jobManager.test.ts
```

Expected: PASS - All tests green

**Step 6: Commit**

```bash
git add lib/jobManager.ts lib/jobManager.test.ts
git commit -m "feat: add job manager with in-memory storage"
```

---

### Task 6: Create Gemini API Wrapper

**Files:**
- Create: `lib/gemini.ts`

**Step 1: Write test file**

```typescript
// lib/gemini.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GeminiClient } from './gemini';

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    client = new GeminiClient();
  });

  it('throws error if API key missing', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => new GeminiClient()).toThrow('GEMINI_API_KEY');
  });

  // Note: Real API tests would use mocks
  // This is just structure validation
});
```

**Step 2: Run test to verify it fails**

```bash
npm test gemini.test.ts
```

Expected: FAIL - "Cannot find module './gemini'"

**Step 3: Implement Gemini wrapper**

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerationMode } from './types';

export class GeminiClient {
  private client: GoogleGenerativeAI;
  private model: string = 'gemini-pro-vision'; // Update based on research

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateImage(
    prompt: string,
    options: {
      temperature?: number;
      image?: string; // base64
      mode?: GenerationMode;
    } = {}
  ): Promise<string> {
    // TODO: Update this implementation based on Task 0 research
    // This is a placeholder structure

    const { temperature = 1.0, image, mode } = options;

    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      // If image provided, include it in the request
      const parts = [];
      if (image) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: image.split(',')[1], // Remove data URL prefix
          },
        });
      }
      parts.push({ text: prompt });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature,
        },
      });

      // Extract image from response
      // TODO: Update based on actual Gemini API response format
      const response = await result.response;
      const imageData = response.text(); // Placeholder

      return `data:image/png;base64,${imageData}`;
    } catch (error) {
      throw new Error(`Gemini API error: ${error}`);
    }
  }
}

export const geminiClient = new GeminiClient();
```

**Step 4: Run test to verify it passes**

```bash
npm test gemini.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add lib/gemini.ts lib/gemini.test.ts
git commit -m "feat: add Gemini API client wrapper"
```

---

## Backend - API Routes

### Task 7: Create Generate API Route

**Files:**
- Create: `app/api/generate/route.ts`

**Step 1: Create API route**

```typescript
// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/jobManager';
import { geminiClient } from '@/lib/gemini';
import { GenerateRequest, GenerateResponse } from '@/lib/types';

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
      status: 'started',
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
```

**Step 2: Test API route manually**

```bash
npm run dev
```

In another terminal:
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test prompt",
    "imageCount": 2,
    "concurrency": 1,
    "temperature": 1.0
  }'
```

Expected: JSON response with batchId and jobIds

**Step 3: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat: add generate API route with job processing"
```

---

### Task 8: Create Status API Route

**Files:**
- Create: `app/api/status/[jobId]/route.ts`

**Step 1: Create status route**

```typescript
// app/api/status/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/jobManager';
import { StatusResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
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
```

**Step 2: Test status route**

```bash
# Use a jobId from previous generate call
curl http://localhost:3000/api/status/YOUR_JOB_ID
```

Expected: JSON with job status

**Step 3: Commit**

```bash
git add app/api/status/[jobId]/route.ts
git commit -m "feat: add status check API route"
```

---

## Frontend - Components

### Task 9: Create App Layout

**Files:**
- Create: `app/layout.tsx`

**Step 1: Create layout**

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gemini Image Generator',
  description: 'Generate images in parallel using Google Gemini API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 2: Create global styles**

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
}
```

**Step 3: Verify**

```bash
npm run dev
```

Visit http://localhost:3000
Expected: Blank page with correct styles

**Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: add app layout and global styles"
```

---

### Task 10: Create PromptInput Component

**Files:**
- Create: `components/PromptInput.tsx`

**Step 1: Create component**

```typescript
// components/PromptInput.tsx
'use client';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  return (
    <div className="w-full">
      <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
        Text Prompt
      </label>
      <textarea
        id="prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Enter your image prompt..."
        rows={4}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/PromptInput.tsx
git commit -m "feat: add prompt input component"
```

---

### Task 11: Create ImageUpload Component

**Files:**
- Create: `components/ImageUpload.tsx`

**Step 1: Create component**

```typescript
// components/ImageUpload.tsx
'use client';

import { useRef, useState } from 'react';

interface ImageUploadProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export default function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.match('image/(jpeg|jpg|png|webp)')) {
      alert('Please upload a JPG, PNG, or WebP image');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Image (Optional)
      </label>

      <div className="flex gap-4">
        {/* Upload Area */}
        <div
          className={`flex-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <p className="text-gray-600">
            {value ? 'Click to change image' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-sm text-gray-500 mt-2">JPG, PNG, WebP (max 10MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />
        </div>

        {/* Preview */}
        {value && (
          <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden relative">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              disabled={disabled}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/ImageUpload.tsx
git commit -m "feat: add image upload component with drag-drop"
```

---

### Task 12: Create ModeSelector Component

**Files:**
- Create: `components/ModeSelector.tsx`

**Step 1: Create component**

```typescript
// components/ModeSelector.tsx
'use client';

import { GenerationMode } from '@/lib/types';

interface ModeSelectorProps {
  value: GenerationMode;
  onChange: (value: GenerationMode) => void;
  disabled?: boolean;
}

export default function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Image Mode
      </label>
      <div className="flex gap-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="edit"
            checked={value === 'edit'}
            onChange={() => onChange('edit')}
            disabled={disabled}
            className="mr-2"
          />
          <div>
            <span className="font-medium">Edit Image</span>
            <p className="text-sm text-gray-500">Modify uploaded image based on prompt</p>
          </div>
        </label>

        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="reference"
            checked={value === 'reference'}
            onChange={() => onChange('reference')}
            disabled={disabled}
            className="mr-2"
          />
          <div>
            <span className="font-medium">Use as Reference</span>
            <p className="text-sm text-gray-500">Use as style/composition guide</p>
          </div>
        </label>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/ModeSelector.tsx
git commit -m "feat: add mode selector component"
```

---

### Task 13: Create SettingsPanel Component

**Files:**
- Create: `components/SettingsPanel.tsx`

**Step 1: Create component**

```typescript
// components/SettingsPanel.tsx
'use client';

interface SettingsPanelProps {
  imageCount: number;
  onImageCountChange: (value: number) => void;
  concurrency: number;
  onConcurrencyChange: (value: number) => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  disabled?: boolean;
}

export default function SettingsPanel({
  imageCount,
  onImageCountChange,
  concurrency,
  onConcurrencyChange,
  temperature,
  onTemperatureChange,
  disabled,
}: SettingsPanelProps) {
  return (
    <div className="w-full space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Settings</h3>

      {/* Image Count */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">
          Number of Images: {imageCount}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={imageCount}
          onChange={(e) => onImageCountChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      {/* Concurrency */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">
          Concurrency: {concurrency}
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={concurrency}
          onChange={(e) => onConcurrencyChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1</span>
          <span>5</span>
        </div>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">
          Temperature: {temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.0</span>
          <span>2.0</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/SettingsPanel.tsx
git commit -m "feat: add settings panel component"
```

---

### Task 14: Create ImageCard Component

**Files:**
- Create: `components/ImageCard.tsx`

**Step 1: Create component**

```typescript
// components/ImageCard.tsx
'use client';

import { StatusResponse } from '@/lib/types';

interface ImageCardProps {
  index: number;
  job: StatusResponse | null;
  onRetry?: () => void;
}

export default function ImageCard({ index, job, onRetry }: ImageCardProps) {
  const downloadImage = () => {
    if (!job?.imageUrl) return;

    const link = document.createElement('a');
    link.href = job.imageUrl;
    link.download = `image-${index + 1}.png`;
    link.click();
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div className="aspect-square relative bg-gray-100">
        {job?.status === 'pending' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400">Queued</div>
          </div>
        )}

        {job?.status === 'generating' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {job?.status === 'complete' && job.imageUrl && (
          <img
            src={job.imageUrl}
            alt={`Generated ${index + 1}`}
            className="w-full h-full object-cover"
          />
        )}

        {job?.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="text-red-500 mb-2">✗ Error</div>
            <div className="text-xs text-gray-600 text-center mb-2">
              {job.error || 'Generation failed'}
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-blue-500 hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-2 flex items-center justify-between">
        <span className="text-sm text-gray-600">Image {index + 1}</span>
        {job?.status === 'complete' && (
          <button
            onClick={downloadImage}
            className="text-sm text-blue-500 hover:underline"
          >
            Download
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/ImageCard.tsx
git commit -m "feat: add image card component with status display"
```

---

### Task 15: Create ImageGallery Component

**Files:**
- Create: `components/ImageGallery.tsx`

**Step 1: Create component**

```typescript
// components/ImageGallery.tsx
'use client';

import { StatusResponse } from '@/lib/types';
import ImageCard from './ImageCard';

interface ImageGalleryProps {
  jobs: StatusResponse[];
  onRetry?: (index: number) => void;
}

export default function ImageGallery({ jobs, onRetry }: ImageGalleryProps) {
  const completedCount = jobs.filter(j => j.status === 'complete').length;
  const totalCount = jobs.length;

  const downloadAll = () => {
    jobs.forEach((job, index) => {
      if (job.status === 'complete' && job.imageUrl) {
        const link = document.createElement('a');
        link.href = job.imageUrl;
        link.download = `image-${index + 1}.png`;
        link.click();
      }
    });
  };

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Progress: {completedCount}/{totalCount} images complete
        </div>
        {completedCount === totalCount && completedCount > 0 && (
          <button
            onClick={downloadAll}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Download All
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {jobs.map((job, index) => (
          <ImageCard
            key={job.jobId}
            index={index}
            job={job}
            onRetry={onRetry ? () => onRetry(index) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/ImageGallery.tsx
git commit -m "feat: add image gallery with progress tracking"
```

---

## Frontend - Main Page

### Task 16: Create Main Page with State Management

**Files:**
- Create: `app/page.tsx`

**Step 1: Create page component**

```typescript
// app/page.tsx
'use client';

import { useState } from 'react';
import { GenerationMode, StatusResponse } from '@/lib/types';
import PromptInput from '@/components/PromptInput';
import ImageUpload from '@/components/ImageUpload';
import ModeSelector from '@/components/ModeSelector';
import SettingsPanel from '@/components/SettingsPanel';
import ImageGallery from '@/components/ImageGallery';

export default function Home() {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [mode, setMode] = useState<GenerationMode>('edit');
  const [imageCount, setImageCount] = useState(5);
  const [concurrency, setConcurrency] = useState(3);
  const [temperature, setTemperature] = useState(1.0);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobs, setJobs] = useState<StatusResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (prompt.length < 3) {
      setError('Prompt must be at least 3 characters');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setJobs([]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageCount,
          concurrency,
          temperature,
          image: image || undefined,
          mode: image ? mode : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await response.json();

      // Initialize job states
      const initialJobs: StatusResponse[] = data.jobIds.map((jobId: string) => ({
        jobId,
        status: 'pending',
      }));
      setJobs(initialJobs);

      // Start polling
      pollJobs(data.jobIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
    }
  };

  const pollJobs = async (jobIds: string[]) => {
    const pollInterval = 2000; // 2 seconds
    let allComplete = false;

    while (!allComplete) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusPromises = jobIds.map(jobId =>
        fetch(`/api/status/${jobId}`).then(res => res.json())
      );

      const statuses: StatusResponse[] = await Promise.all(statusPromises);
      setJobs(statuses);

      // Check if all jobs are done
      allComplete = statuses.every(
        job => job.status === 'complete' || job.status === 'error'
      );
    }

    setIsGenerating(false);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gemini Image Generator
          </h1>
          <p className="text-gray-600">
            Generate images in parallel using Google Gemini API
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            disabled={isGenerating}
          />

          <ImageUpload
            value={image}
            onChange={setImage}
            disabled={isGenerating}
          />

          {image && (
            <ModeSelector
              value={mode}
              onChange={setMode}
              disabled={isGenerating}
            />
          )}

          <SettingsPanel
            imageCount={imageCount}
            onImageCountChange={setImageCount}
            concurrency={concurrency}
            onConcurrencyChange={setConcurrency}
            temperature={temperature}
            onTemperatureChange={setTemperature}
            disabled={isGenerating}
          />

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || prompt.length < 3}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? 'Generating...' : 'Generate Images'}
          </button>
        </div>

        {/* Results Section */}
        <ImageGallery jobs={jobs} />
      </div>
    </main>
  );
}
```

**Step 2: Test full flow**

```bash
npm run dev
```

1. Visit http://localhost:3000
2. Enter a prompt
3. Adjust settings
4. Click Generate
5. Watch images appear in real-time

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add main page with full generation flow"
```

---

## Polish & Cleanup

### Task 17: Add Loading States and Error Handling

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add cancel functionality**

In `app/page.tsx`, add cancel button and logic:

```typescript
const [cancelRequested, setCancelRequested] = useState(false);

const handleCancel = () => {
  setCancelRequested(true);
  setIsGenerating(false);
};

// Update pollJobs to respect cancellation
const pollJobs = async (jobIds: string[]) => {
  // ... existing code ...
  while (!allComplete && !cancelRequested) {
    // ... existing polling logic ...
  }

  if (cancelRequested) {
    setCancelRequested(false);
  }
};

// Add cancel button in JSX
{isGenerating && (
  <button
    onClick={handleCancel}
    className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
  >
    Cancel
  </button>
)}
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add cancel generation functionality"
```

---

### Task 18: Add Cleanup Job Task

**Files:**
- Create: `lib/cleanup.ts`

**Step 1: Create cleanup utility**

```typescript
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
```

**Step 2: Start cleanup on server**

Modify `app/api/generate/route.ts`:

```typescript
import { startCleanupTask } from '@/lib/cleanup';

// Start cleanup task once
let cleanupStarted = false;
if (!cleanupStarted) {
  startCleanupTask();
  cleanupStarted = true;
}
```

**Step 3: Commit**

```bash
git add lib/cleanup.ts app/api/generate/route.ts
git commit -m "feat: add automatic job cleanup task"
```

---

### Task 19: Add README

**Files:**
- Create: `README.md`

**Step 1: Write README**

```markdown
# Gemini Image Generator

A Next.js web application for generating images in parallel using Google Gemini API.

## Features

- Generate 1-10 images per batch
- Real-time progress tracking
- Optional image input (edit or reference mode)
- Adjustable settings (concurrency, temperature)
- Download individual or all images
- Multiple browser tabs support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local and add your Gemini API key
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## Usage

1. Enter a text prompt describing the image you want
2. (Optional) Upload an image to edit or use as reference
3. Adjust settings:
   - Number of images (1-10)
   - Concurrency (1-5)
   - Temperature (0.0-2.0)
4. Click "Generate Images"
5. Watch images appear as they complete
6. Download individual images or all at once

## Architecture

- **Frontend:** React components with real-time polling
- **Backend:** Next.js API routes with job queue management
- **Storage:** In-memory job tracking (resets on server restart)
- **Concurrency:** Queue-based processing with configurable limits

## API Routes

- `POST /api/generate` - Start batch generation
- `GET /api/status/:jobId` - Check job status

## Development

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
npm start
```

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage instructions"
```

---

### Task 20: Final Testing and Verification

**Step 1: Test complete workflow**

1. Start dev server: `npm run dev`
2. Test text-only generation
3. Test with image upload (both modes)
4. Test different settings
5. Test error scenarios (invalid prompt, etc.)
6. Test multiple browser tabs
7. Test cancel functionality
8. Test download (individual and all)

**Step 2: Verify all features work**

Checklist:
- [ ] Prompt input validation
- [ ] Image upload with preview
- [ ] Mode selection
- [ ] Settings sliders
- [ ] Generate button disabled when appropriate
- [ ] Real-time progress
- [ ] Images appear as they complete
- [ ] Error messages display correctly
- [ ] Download buttons work
- [ ] Multiple tabs work independently
- [ ] Cancel works
- [ ] Jobs clean up after 1 hour

**Step 3: Final commit**

```bash
git add .
git commit -m "chore: final verification and cleanup"
```

---

## Deployment (Optional)

### Task 21: Deploy to Vercel

**Step 1: Create Vercel account**

Visit https://vercel.com and sign up

**Step 2: Install Vercel CLI**

```bash
npm install -g vercel
```

**Step 3: Deploy**

```bash
vercel
```

Follow prompts to deploy

**Step 4: Set environment variables**

In Vercel dashboard:
- Go to project settings
- Add `GEMINI_API_KEY` environment variable
- Redeploy

---

## Success Criteria

The implementation is complete when:

- [x] User can generate 1-10 images from text prompt
- [x] Optional image upload works in both modes
- [x] Settings are applied correctly
- [x] Images appear as they complete
- [x] Progress shows real-time status
- [x] Download works (individual and batch)
- [x] Multiple browser tabs work independently
- [x] Errors handled gracefully
- [x] Gemini API integrated correctly
- [x] Code is clean and well-organized
- [x] README documents setup and usage

---

## Notes for Implementation

**Key Principles:**
- **TDD:** Write tests first when possible
- **YAGNI:** Don't add features not in the spec
- **DRY:** Reuse components and utilities
- **Frequent Commits:** Commit after each meaningful change

**Important:**
- Task 0 (API research) is critical - the Gemini implementation may need updates based on actual API
- Test each component individually before integration
- Keep API routes simple and focused
- Use TypeScript types consistently
- Handle errors at every layer

**Testing Tips:**
- Use mock data for initial component development
- Test API routes with curl before connecting frontend
- Test polling logic thoroughly
- Verify cleanup runs correctly

**Common Pitfalls:**
- Forgetting to validate inputs
- Not handling all job statuses
- Polling continuing after component unmount
- Not cleaning up old jobs
- Exposing API keys to client
