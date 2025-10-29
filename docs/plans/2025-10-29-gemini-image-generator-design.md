# Gemini Image Generator UI - Design Document

**Date:** 2025-10-29
**Status:** Approved Design

## Overview

A Next.js web application for generating images via Google Gemini API with parallel processing, configurable settings, and real-time progress tracking.

## Requirements

### Core Features
- Generate 1-10 images per batch
- Text prompt input (required)
- Optional image input with two modes:
  - **Edit mode**: Modify/transform uploaded image based on prompt
  - **Reference mode**: Use uploaded image as style/composition reference
- Adjustable settings:
  - Number of images to generate (1-10)
  - Concurrency (1-5 parallel API calls)
  - Temperature (0.0-2.0)
  - Additional Gemini parameters as needed
- Display results in gallery grid
- Download individual images or all at once
- Support multiple independent browser tabs

### User Experience
- Real-time progress tracking as images generate
- Images appear as they complete (not all at once)
- Visual feedback during generation
- Cancel batch option
- Retry failed individual images

## Architecture

### Technology Stack
- **Framework:** Next.js 14+ (App Router)
- **Frontend:** React 18+
- **Styling:** Tailwind CSS
- **API Integration:** Google Gemini API (official SDK or REST)
- **Runtime:** Node.js 18+

### System Architecture

**Client-Server Model with Polling:**

```
[Browser Tab 1] ──┐
                  ├──> [Next.js API Routes] ──> [Gemini API]
[Browser Tab 2] ──┘         │
                            └──> [In-Memory Job Store]
```

**Components:**
1. **Frontend (React)**
   - Input controls for prompt, image upload, settings
   - Gallery component for displaying results
   - Polling logic for job status updates

2. **Backend (Next.js API Routes)**
   - `/api/generate` - Start batch generation
   - `/api/status/:jobId` - Check individual job status
   - Job queue manager with concurrency control
   - Gemini API integration layer

3. **Job Management**
   - In-memory Map storing job metadata
   - Job lifecycle: pending → generating → complete/error
   - Automatic cleanup after 1 hour

### Design Decisions

**Why Client Polling over SSE/WebSockets?**
- Simpler implementation for small batches (1-10 images)
- No need for persistent connections
- Easy to implement and debug
- Sufficient responsiveness with 2-second polling

**Why In-Memory Storage?**
- No database complexity needed
- Acceptable for ephemeral generation jobs
- Jobs automatically cleaned up on restart
- Keeps infrastructure simple

**Why Base64 for Images?**
- No file storage needed
- Immediate availability in React state
- Simple download implementation
- Trade-off: Higher memory usage (acceptable for 10 images max)

## UI Design

### Layout Structure

```
┌─────────────────────────────────────────────┐
│  Gemini Image Generator                      │
├─────────────────────────────────────────────┤
│  Text Prompt                                 │
│  ┌─────────────────────────────────────┐   │
│  │ Enter your image prompt...          │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  Upload Image (Optional)                     │
│  ┌─────────────────────┐                    │
│  │  Drag & Drop         │  [Preview]        │
│  │  or Click            │                    │
│  └─────────────────────┘                    │
│                                              │
│  Mode: ( ) Edit Image  ( ) Use as Reference │
│                                              │
│  Settings                                    │
│  Images: [────●────] 5                      │
│  Concurrency: [──●──] 3                     │
│  Temperature: [────●─] 1.0                  │
│                                              │
│  [Generate Images]                           │
├─────────────────────────────────────────────┤
│  Progress: Generating 3/10 images...         │
│  [Cancel]                                    │
├─────────────────────────────────────────────┤
│  Results Gallery                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  │ 1  │ │ 2  │ │... │ │... │ │... │       │
│  │[↓] │ │[↓] │ │ ⟳  │ │ ⟳  │ │    │       │
│  └────┘ └────┘ └────┘ └────┘ └────┘       │
│                                              │
│  [Download All]                              │
└─────────────────────────────────────────────┘
```

### Component Breakdown

**Input Controls:**
- `PromptInput`: Expandable textarea
- `ImageUpload`: Drag-drop area with preview
- `ModeSelector`: Radio buttons (visible only with image)
- `SettingsPanel`: Sliders for images, concurrency, temperature
- `GenerateButton`: Primary action button

**Results Display:**
- `ProgressBar`: Shows N/M images complete
- `ImageGallery`: Grid layout with fade-in animations
- `ImageCard`: Individual image with download button, loading state
- `DownloadAllButton`: Appears when batch complete

## Data Flow

### Generation Flow

1. **User Submits Request**
   ```
   User clicks "Generate" → Frontend validates input
   ```

2. **API Request**
   ```javascript
   POST /api/generate
   {
     "prompt": "serene mountain landscape",
     "imageCount": 10,
     "concurrency": 5,
     "temperature": 1.0,
     "image": "base64..." (optional),
     "mode": "edit" | "reference"
   }
   ```

3. **Backend Processing**
   - Generate UUID for batch
   - Create N job objects (one per image)
   - Start first `concurrency` jobs
   - Return job IDs immediately

4. **Response**
   ```javascript
   {
     "batchId": "uuid",
     "jobIds": ["uuid1", "uuid2", ...],
     "status": "started"
   }
   ```

5. **Client Polling**
   - Every 2 seconds, check status of all job IDs
   - GET `/api/status/:jobId`
   - Update gallery as jobs complete

6. **Job Status Response**
   ```javascript
   {
     "jobId": "uuid",
     "status": "pending" | "generating" | "complete" | "error",
     "imageUrl": "data:image/png;base64...",
     "error": "error message" (if failed)
   }
   ```

### Concurrency Control

**Queue-Based Processing:**
```
Total images: 10
Concurrency: 5

[Jobs 1-5: Generating]
[Jobs 6-10: Queued]

When Job 2 completes → Start Job 6
When Job 1 completes → Start Job 7
...
```

**Implementation:**
- Maintain queue of pending job IDs per batch
- Track active jobs count
- When job completes, pop next from queue if available
- Process until queue empty

## API Integration

### Gemini API Research Requirements

**Before implementation, verify:**
1. Official Gemini image generation endpoints
2. How to structure requests with text + optional image
3. Supported parameters (temperature, top_k, top_p, etc.)
4. Image input format (base64, URL, multipart?)
5. Response format for generated images
6. Rate limits and quota management
7. Error codes and messages
8. Maximum image dimensions/file sizes
9. Supported output formats

**API Key Management:**
- Store in `.env.local`: `GEMINI_API_KEY=your_key_here`
- Access via `process.env.GEMINI_API_KEY`
- Validate on server startup
- Never expose to client

**Dependencies:**
- Check if `@google/generative-ai` package exists
- Fallback to REST API with `fetch` if needed

## Error Handling

### Generation Failures

**Job-Level Errors:**
- Individual job fails → mark as "error"
- Display error icon in gallery card
- Show error message on hover/click
- Provide "Retry" button for that specific image
- Don't block other images from completing

**Common Error Scenarios:**
- Invalid API key → Show clear setup message
- Rate limit exceeded → Retry with backoff
- Invalid prompt (safety filters) → Show error, allow edit
- Network timeout → Retry automatically
- Invalid image format → Validate before upload

### Input Validation

**Image Upload:**
- Accept: jpg, png, webp
- Max size: 10MB (adjust per Gemini limits)
- Validate on client before upload
- Show clear error messages

**Prompt Validation:**
- Minimum length check (e.g., 3 characters)
- Maximum length per Gemini limits
- Clear error messages

### Network Resilience

**Polling Failures:**
- Retry with exponential backoff (2s, 4s, 8s, 16s)
- Show "Connection lost" after repeated failures
- Jobs continue on backend even if client disconnects
- Allow client to resume polling if batch ID stored

**Backend Errors:**
- Catch and log all Gemini API errors
- Return structured error responses
- Don't crash server on individual job failures

## Memory Management

**Job Cleanup:**
- Store completed jobs for 1 hour
- Background cleanup task runs every 15 minutes
- Remove jobs older than 1 hour
- Clear associated image data from memory

**Client State:**
- Gallery images stored in React state only
- Cleared on page refresh
- No localStorage persistence (keep simple)
- Each browser tab has independent state

## Multi-Tab Support

**Browser Tab Independence:**
- Each tab = separate React app instance
- Each maintains own gallery state
- Jobs identified by UUID (no conflicts)
- No shared state between tabs

**Workflow Example:**
```
Tab 1: Generate "sunset mountains" (10 images)
Tab 2: Generate "cyberpunk city" (5 images)
Tab 3: Generate "abstract art" (8 images)

All run independently, polling their own job IDs
```

**Trade-offs:**
- Simple: No session management needed
- Limitation: Refreshing tab loses gallery
- Enhancement (if needed): Add localStorage persistence

## Testing Strategy

**Unit Tests:**
- Job queue management logic
- Concurrency control algorithm
- Input validation functions

**Integration Tests:**
- API routes (mock Gemini responses)
- Polling logic with various job states
- Error handling paths

**Manual Testing:**
- Generate 1, 5, 10 images
- Test with/without image upload
- Test both modes (edit, reference)
- Multiple browser tabs simultaneously
- Network disconnection scenarios
- Invalid API key
- Rate limiting

## Future Enhancements

**Out of scope for v1, potential additions:**
- Gallery persistence with localStorage
- Generation history/library
- Share generated images
- Batch download as ZIP
- More Gemini parameters (aspect ratio, style presets)
- Image-to-image variations
- Prompt templates/presets
- Cost tracking
- User accounts and saved generations

## Implementation Notes

**Development Phases:**
1. Research Gemini API specifics
2. Setup Next.js project scaffold
3. Build basic UI components
4. Implement API routes with mocked responses
5. Integrate real Gemini API
6. Add polling and progress tracking
7. Implement gallery and download
8. Error handling and validation
9. Testing and refinement

**Key Files Structure:**
```
/app
  /page.tsx                 # Main UI
  /api
    /generate/route.ts      # Start generation
    /status/[jobId]/route.ts # Check status
/components
  /PromptInput.tsx
  /ImageUpload.tsx
  /SettingsPanel.tsx
  /ImageGallery.tsx
  /ImageCard.tsx
/lib
  /gemini.ts               # Gemini API wrapper
  /jobManager.ts           # Job queue and storage
  /types.ts                # TypeScript types
/.env.local                # API key (gitignored)
```

## Success Criteria

**The implementation is successful when:**
- User can generate 1-10 images from text prompt
- Optional image upload works in both modes
- Settings (count, concurrency, temperature) are applied correctly
- Images appear in gallery as they complete
- Progress shows real-time status
- Individual and batch download work
- Multiple browser tabs work independently
- Errors are handled gracefully with clear messages
- Gemini API is correctly integrated per documentation
