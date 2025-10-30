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
