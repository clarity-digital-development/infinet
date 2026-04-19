# Venice.ai API Reference (verified April 2026)

Quick-reference for Phase 2+ integration work. All shapes verified against live Venice docs and API.

## Global

- **Base URL:** `https://api.venice.ai/api/v1`
- **Auth:** `Authorization: Bearer $VENICE_API_KEY`
- **OpenAI-compatible** — endpoints mirror OpenAI's. Venice-specific features live under `venice_parameters`.
- **Key gotchas:**
  - `enable_web_search` is a **string** `"auto" | "on" | "off"` — NOT a boolean.
  - Venice injects a default system prompt unless you pass `venice_parameters.include_venice_system_prompt: false`.
  - `include_search_results_in_stream: true` puts citations in the **first SSE chunk**; without it, streamed responses have no citations.

---

## 1. Chat Completions with Web Search

`POST /chat/completions`

```json
{
  "model": "venice-uncensored",
  "messages": [{ "role": "user", "content": "..." }],
  "stream": true,
  "venice_parameters": {
    "enable_web_search": "auto",
    "enable_web_citations": true,
    "include_search_results_in_stream": true,
    "enable_web_scraping": false
  }
}
```

**Citation shape** (in `venice_parameters.web_search_citations[]`):

```json
{
  "title": "string",
  "url": "string",
  "date": "ISO-8601 string",
  "content": "string snippet"
}
```

**Streaming parser rule:** check every chunk for `chunk.venice_parameters?.web_search_citations` — it appears exactly once, in the first chunk, when citations apply.

---

## 2. Text-to-Speech

`POST /audio/speech` — JSON request, binary response.

```json
{
  "input": "Hello world",
  "model": "tts-kokoro",
  "voice": "af_sky",
  "response_format": "mp3",
  "speed": 1,
  "streaming": false
}
```

- **Default model:** `tts-kokoro` (cheapest — $3.50/1M chars)
- **Default voice:** `af_sky` (only works with `tts-kokoro` — voices are model-specific)
- **Response formats:** `mp3`, `opus`, `aac`, `flac`, `wav`, `pcm`
- **Speed:** 0.25–4.0
- **Input max:** 4096 chars
- List voices via `GET /models?type=tts` → read `model_spec.voices`

**Node.js fetch (binary handling):**

```js
const res = await fetch('https://api.venice.ai/api/v1/audio/speech', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ input: text, model: 'tts-kokoro', voice: 'af_sky', response_format: 'mp3' }),
})
const audioBuffer = Buffer.from(await res.arrayBuffer())
```

---

## 3. Speech-to-Text (Transcriptions)

`POST /audio/transcriptions` — multipart/form-data.

**Fields:**
- `file` (required) — binary audio
- `model` (optional) — default `nvidia/parakeet-tdt-0.6b-v3`
- `response_format` — `json` (default) or `text`
- `timestamps` — `true | false`
- `language` — ISO 639-1

**Supported audio formats:** wav, wave, flac, m4a, aac, mp4, mp3, ogg, webm

**Node.js fetch:**

```js
const form = new FormData()
form.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm')
form.append('model', 'nvidia/parakeet-tdt-0.6b-v3')
form.append('response_format', 'json')

const res = await fetch('https://api.venice.ai/api/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.VENICE_API_KEY}` }, // NO Content-Type — fetch sets boundary
  body: form,
})
const { text, duration } = await res.json()
```

**Key gotcha:** returns **422** for zero-length audio (common when MediaRecorder stops instantly). Guard against empty blobs on the client.

---

## 4. Vision

Same `/chat/completions` endpoint. Pass content as an array of parts:

```json
{
  "model": "qwen3-vl-235b-a22b",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "What's in this image?" },
        {
          "type": "image_url",
          "image_url": { "url": "https://..." }
        }
      ]
    }
  ]
}
```

- `image_url.url` accepts **public URLs** OR **base64 data URLs** (`data:image/png;base64,...`)
- Min size: 64px per side
- Keep base64 under ~5MB

**Current vision-capable model IDs** (live from `/models?type=text` filtered by `capabilities.supportsVision`):

- `qwen3-vl-235b-a22b` (default router)
- `qwen3-5-9b`, `qwen3-5-35b-a3b`, `qwen3-5-397b-a17b`
- `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-opus-4-7`
- `openai-gpt-54`, `openai-gpt-54-mini`, `openai-gpt-4o-2024-11-20`
- `gemini-3-flash-preview`, `gemini-3-1-pro-preview`
- `grok-41-fast`, `grok-4-20`
- `venice-uncensored-1-2`, `venice-uncensored-role-play`
- `e2ee-qwen3-vl-30b-a3b-p` (E2EE vision)

**Don't hardcode this list** — fetch `/models?type=text` and filter by `model_spec.capabilities.supportsVision === true`. Cache ~5 min.

---

## Model capability flags (on `/models?type=text`)

Each model has `model_spec.capabilities` with booleans:
- `supportsFunctionCalling`
- `supportsReasoning`
- `supportsResponseSchema`
- `supportsVision`
- `supportsVideoInput`
- `supportsMultipleImages`
- `supportsWebSearch`
- `supportsXSearch`
- `supportsLogProbs`
- `supportsTeeAttestation`
- `supportsE2EE`

Use this to dynamically route requests (vision uploads → vision model, reasoning requests → reasoning-capable model, etc).

---

## Pricing reference (per 1M tokens or per operation)

- Chat (venice-uncensored): $0.20 in / $0.90 out per 1M tokens
- Chat (glm-4.7-flash-heretic): $0.14 in / $0.80 out per 1M tokens
- **Web search: $10 / 1K searches** ($0.01 each)
- **Web scraping: $10 / 1K URLs** ($0.01 each)
- **X search: $10 / 1K results** ($0.01 each)
- TTS (Kokoro): $3.50 / 1M chars
- TTS (ElevenLabs v3): higher — check `/models?type=tts`
- **STT: $0.0001/audio-second** ($0.36/hour)
- Embeddings (BGE-M3): $0.15 / 1M tokens

---

## Common errors

- `400` — invalid params
- `401` — auth failure (including Pro-only model attempts)
- `402` — insufficient balance
- `422` — validation (e.g. zero-length audio)
- `429` — rate limited
- `500` — inference failure
- `503` — at capacity
