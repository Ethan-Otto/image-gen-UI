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
