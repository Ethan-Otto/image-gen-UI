# Gemini API Research

## Executive Summary

Google provides **two distinct options** for image generation via the Gemini API:
1. **Gemini 2.5 Flash Image** - Native multimodal image generation with conversational refinement
2. **Imagen 4** - Specialized photorealistic image generation model

Both are accessible through the Gemini API ecosystem. Gemini 2.5 Flash Image is recommended for most use cases due to better cost-effectiveness, higher rate limits, and multimodal capabilities.

---

## Image Generation Capabilities

### Can Gemini Generate Images?

**Yes.** Gemini has native image generation capabilities through the `gemini-2.5-flash-image` model (codenamed "Nano Banana"). This model supports:

- **Text-to-Image Generation**: Generate high-quality images from descriptive text prompts
- **Image Editing**: Modify existing images using text prompts (add, remove, or modify elements)
- **Multi-Image Composition**: Combine multiple input images to create new scenes or transfer styles
- **Conversational Refinement**: Iteratively refine images through multi-turn conversations
- **Text Rendering**: Generate images with legible, well-placed text (ideal for logos, diagrams, posters)
- **Interleaved Generation**: Mix text and images in a single conversation flow

### Does Gemini Only Process Images?

**No.** While Gemini's earlier versions (like Gemini Pro Vision) primarily processed/analyzed images, the current `gemini-2.5-flash-image` model can both **generate and process** images.

---

## Relevant Models

### Primary Recommendation: Gemini 2.5 Flash Image

**Model ID**: `gemini-2.5-flash-image`

**Capabilities**:
- Native image generation and editing
- Average generation latency: 3.2 seconds for 1024x1024 images
- Resolution: Up to 1024px
- Aspect ratios: 10 different ratios supported (1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9)
- People generation: Yes, with updated safety filters
- SynthID watermarking: All generated images include non-visible digital watermarks

**Pricing**: $0.039 per image ($30 per 1M tokens, each image = 1290 tokens)

**Rate Limits**:
| Tier | RPM | TPM | RPD |
|------|-----|-----|-----|
| Free | Not available | - | - |
| Tier 1 | 500 | 500,000 | 2,000 |
| Tier 2 | 2,000 | 1,500,000 | 50,000 |
| Tier 3 | 5,000 | 5,000,000 | Unlimited |

**Note**: Free tier for testing available via Google AI Studio (500 daily requests)

### Alternative: Imagen Models

**Available via Gemini API**:
- `imagen-4.0-generate-001` (Standard)
- `imagen-4.0-ultra-generate-001` (Ultra - highest quality)
- `imagen-4.0-fast-generate-001` (Fast)
- `imagen-3.0-generate-002` (Previous generation)

**Capabilities**:
- Photorealistic image generation
- Multiple images per request (1-4 images)
- Image sizes: 1K or 2K (Standard/Ultra only)
- Aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9
- Maximum prompt length: 480 tokens
- Person generation controls: dont_allow, allow_adult, allow_all

**Pricing**: $0.04 per image (Imagen 4)

**Rate Limits** (Imagen 4 Standard/Fast):
| Tier | RPM | RPD |
|------|-----|-----|
| Free | 10 | 70 |
| Tier 1 | 10 | 70 |
| Tier 2 | 15 | 1,000 |
| Tier 3 | 20 | 15,000 |

**When to Use Imagen**:
- When photorealistic quality is critical
- When generating multiple variations simultaneously (up to 4 images)
- Specialized tasks requiring highest fidelity (use Imagen 4 Ultra)

---

## API Structure

### Endpoint

**Base URL**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Example**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`

### Authentication

Requires `x-goog-api-key` header with API key:
```
x-goog-api-key: YOUR_API_KEY
```

### Request Format (Gemini 2.5 Flash Image)

```json
{
  "contents": [{
    "parts": [
      {"text": "A robot holding a red skateboard in a futuristic city"}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["Image"],
    "imageConfig": {
      "aspectRatio": "16:9"
    }
  }
}
```

### Request Format (Imagen)

```json
{
  "model": "imagen-4.0-generate-001",
  "prompt": "Robot holding a red skateboard",
  "config": {
    "numberOfImages": 4,
    "aspectRatio": "16:9",
    "imageSize": "1K"
  }
}
```

### Response Format

**Structure**:
```json
{
  "candidates": [{
    "content": {
      "parts": [
        {
          "inline_data": {
            "mimeType": "image/png",
            "data": "base64_encoded_image_data"
          }
        }
      ]
    }
  }]
}
```

**Image data**: Base64-encoded PNG format

---

## Parameters

### Gemini 2.5 Flash Image

| Parameter | Type | Options/Range | Default | Description |
|-----------|------|---------------|---------|-------------|
| `responseModalities` | Array | `['Text', 'Image']`, `['Image']` | `['Text', 'Image']` | Output types to generate |
| `imageConfig.aspectRatio` | String | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 | 1:1 | Image aspect ratio |

**Prompt Best Practices**:
- Use narrative, descriptive paragraphs (not keyword lists)
- Emphasize contextual detail and intent
- Up to 3 input images recommended for multi-image composition

### Imagen Models

| Parameter | Type | Options/Range | Default | Description |
|-----------|------|---------------|---------|-------------|
| `numberOfImages` | Integer | 1-4 | 4 | Number of images to generate |
| `imageSize` | String | "1K", "2K" | "1K" | Output resolution (Standard/Ultra only) |
| `aspectRatio` | String | 1:1, 3:4, 4:3, 9:16, 16:9 | 1:1 | Image aspect ratio |
| `personGeneration` | String | dont_allow, allow_adult, allow_all | allow_adult | Person generation control |

**Prompt Constraints**:
- Maximum length: 480 tokens
- Text descriptions work best

---

## Image Input

### Gemini 2.5 Flash Image

**Supported input methods**:
1. **Text prompts only**: Simple text description
2. **Base64-encoded images**: Include images in request
3. **Multiple images**: Up to 3 images recommended
4. **Interleaved text and images**: Combine in conversation

**Format for base64 images**:
```json
{
  "parts": [
    {
      "text": "Edit this image to add a red hat"
    },
    {
      "inline_data": {
        "mimeType": "image/png",
        "data": "base64_encoded_image"
      }
    }
  ]
}
```

### Imagen Models

**Input**: Text prompts only (no image input for editing)

---

## Rate Limits

### Daily Reset

All rate limits (RPD - Requests Per Day) reset at **midnight Pacific Time**.

### Free Tier Access

- **Gemini 2.5 Flash Image**: No free API tier, but 500 daily requests via Google AI Studio for testing
- **Imagen 4**: 10 RPM, 70 RPD (Standard/Fast); 5 RPM, 30 RPD (Ultra)

### Paid Tier Progression

**Tier 1**: Entry level (default for paid accounts)
**Tier 2**: Requires $250 spending + 30 days account age
**Tier 3**: Enterprise-level quotas

### Rate Limit Calculation

- **RPM**: Requests Per Minute (per project, not per API key)
- **TPM**: Tokens Per Minute (for text generation)
- **RPD**: Requests Per Day
- **IPM**: Images Per Minute (calculated only for image-capable models)

---

## Error Codes

### Common Errors

#### 429 RESOURCE_EXHAUSTED

**Description**: Quota or rate limit exceeded

**Common Causes**:
- Exceeded requests per minute (RPM) limit
- Exceeded requests per day (RPD) limit
- Token quota exhausted

**Response**:
```json
{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota, please check your plan and billing details",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

**Handling**:
- Implement exponential backoff for retries
- Review rate limits at: https://ai.google.dev/gemini-api/docs/rate-limits
- Upgrade to higher tier if consistently hitting limits
- Add delay between requests to stay within RPM limits

#### 400 INVALID_ARGUMENT

**Description**: Request contains invalid parameters

**Common Causes**:
- Invalid model parameters (e.g., unsupported aspect ratio)
- Malformed request structure
- Invalid base64 image data
- Referenced files don't exist
- Prompt exceeds maximum token length

**Handling**:
- Validate all parameters against API documentation
- Verify base64 encoding is correct
- Check prompt length (480 tokens max for Imagen)
- Ensure request JSON structure matches API spec

#### Other Common Issues

**Invalid API Key**: 401 UNAUTHENTICATED
**Model Not Found**: 404 NOT_FOUND
**Request Too Large**: 413 PAYLOAD_TOO_LARGE

---

## SDK Usage

### Installation

**Node.js/JavaScript**:
```bash
npm install @google/genai
```

**Python**:
```bash
pip install google-genai
```

**Go**:
```bash
go get google.golang.org/genai
```

### JavaScript Example (Gemini 2.5 Flash Image)

```javascript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: [{
    parts: [
      { text: "A serene mountain landscape at sunset" }
    ]
  }],
  generationConfig: {
    responseModalities: ["Image"],
    imageConfig: {
      aspectRatio: "16:9"
    }
  }
});

// Extract base64 image data
const imagePart = response.candidates[0].content.parts.find(
  part => part.inline_data
);
const base64Image = imagePart.inline_data.data;
const mimeType = imagePart.inline_data.mimeType;

// Save or display image
const imageBuffer = Buffer.from(base64Image, 'base64');
fs.writeFileSync('output.png', imageBuffer);
```

### Python Example (Imagen)

```python
from google import genai
from google.genai import types

client = genai.Client(api_key='YOUR_API_KEY')

response = client.models.generate_images(
    model='imagen-4.0-generate-001',
    prompt='Robot holding a red skateboard',
    config=types.GenerateImagesConfig(
        number_of_images=4,
        aspect_ratio='16:9'
    )
)

# Save generated images
for idx, image in enumerate(response.generated_images):
    image.save(f'output_{idx}.png')
```

### REST API Example

```bash
curl -X POST \
  https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {"text": "A futuristic cityscape"}
      ]
    }],
    "generationConfig": {
      "responseModalities": ["Image"],
      "imageConfig": {
        "aspectRatio": "16:9"
      }
    }
  }'
```

---

## Implementation Decision

### Recommended Approach: Gemini 2.5 Flash Image

**We will use Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) as our primary image generation API.**

### Rationale

1. **Cost-Effective**: $0.039 per image vs $0.04 for Imagen 4
2. **Higher Rate Limits**: 500 RPM (Tier 1) vs 10 RPM for Imagen 4
3. **Multimodal Capabilities**: Can edit images, compose multiple images, and refine conversationally
4. **Fast Generation**: Average 3.2 seconds per image
5. **Better Integration**: Native support for text+image workflows
6. **Testing Access**: 500 daily free requests via Google AI Studio

### Implementation Plan

**SDK**: `@google/genai` (Node.js/TypeScript)

**Architecture**:
- Use `gemini-2.5-flash-image` for all image generation requests
- Implement retry logic with exponential backoff for rate limit errors
- Store generated images as base64 or convert to PNG buffers
- Add validation for prompt length and parameters
- Handle RESOURCE_EXHAUSTED errors gracefully with user feedback

**Fallback Option**:
- Consider Imagen 4 for specific use cases requiring photorealistic quality
- Both APIs use the same SDK, making it easy to switch models if needed

### Next Steps

1. Set up Google AI API key and configure environment variables
2. Install `@google/genai` SDK
3. Implement base image generation service with error handling
4. Add rate limiting/throttling on client side
5. Test with various prompts and aspect ratios
6. Monitor usage against Tier 1 limits (500 RPM, 2,000 RPD)

---

## References

- [Gemini API Image Generation Documentation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Imagen via Gemini API](https://ai.google.dev/gemini-api/docs/imagen)
- [Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Troubleshooting Guide](https://ai.google.dev/gemini-api/docs/troubleshooting)

---

**Document Version**: 1.0
**Last Updated**: October 29, 2025
**Author**: Research for image_ui project
