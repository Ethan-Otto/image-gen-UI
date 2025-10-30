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
