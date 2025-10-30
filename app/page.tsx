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
