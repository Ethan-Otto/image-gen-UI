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
