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
