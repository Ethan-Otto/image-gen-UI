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
