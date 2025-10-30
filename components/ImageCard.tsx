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
