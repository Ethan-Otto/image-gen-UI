// lib/gemini.ts
import { GoogleGenAI } from '@google/genai';
import { GenerationMode } from './types';

export class GeminiClient {
  private client: GoogleGenAI;
  private model: string = 'gemini-2.5-flash-image';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  async generateImage(
    prompt: string,
    options: {
      temperature?: number;
      image?: string; // base64
      mode?: GenerationMode;
      aspectRatio?: string;
    } = {}
  ): Promise<string> {
    const { temperature = 1.0, image, mode, aspectRatio = '1:1' } = options;

    try {
      // Build the parts array for the request
      const parts: Array<{ text: string } | { inline_data: { mimeType: string; data: string } }> = [];

      // If image provided, include it in the request
      if (image) {
        // Remove data URL prefix if present
        const base64Data = image.includes(',') ? image.split(',')[1] : image;

        parts.push({
          inline_data: {
            mimeType: 'image/png',
            data: base64Data,
          },
        });
      }

      // Add the text prompt
      parts.push({ text: prompt });

      // Make the API request using the SDK
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{
          parts,
        }],
        generationConfig: {
          responseModalities: ['Image'],
          imageConfig: {
            aspectRatio,
          },
        },
      });

      // Extract the generated image from response
      // Response structure: candidates[0].content.parts[].inline_data
      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error('No candidate generated in response');
      }

      const imagePart = candidate.content?.parts?.find(
        (part: any) => part.inline_data
      );

      if (!imagePart || !imagePart.inline_data) {
        throw new Error('No image data found in response');
      }

      const base64Image = imagePart.inline_data.data;
      const mimeType = imagePart.inline_data.mimeType || 'image/png';

      // Return as data URL
      return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw new Error(`Gemini API error: ${String(error)}`);
    }
  }
}

// Singleton instance - only create if API key is available
let _geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!_geminiClient) {
    _geminiClient = new GeminiClient();
  }
  return _geminiClient;
}
