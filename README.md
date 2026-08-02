# Nexus AI

Nexus AI is a premium, production-ready AI assistant experience built with Express.js and the official Google Gen AI SDK for Node.js. The application combines a polished frontend, secure backend, and Gemini-powered conversational AI into one deployable experience.

## Highlights

- Premium, responsive UI with mobile-first design
- Secure Express.js server with Helmet, CSP, compression, and rate limiting
- Gemini-backed chat flow with request validation and graceful error handling
- Conversation history, editing, retry, export, and theme support
- PWA-ready setup with a manifest, service worker, and offline fallback

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a local environment file:
   ```bash
   cp .env.example .env
   ```
3. Add your Gemini credentials and optional deployment settings.

To switch models, edit the GEMINI_MODEL value in your local .env file. The app uses the configured value automatically, with gemini-3.5-pro as the default.

## Environment variables

Create a `.env` file with:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini--
`
npm start
```

Open:

```text
http://localhost:3000
```

## API behavior

The chat endpoint accepts:

```json
{
  "message": "Explain this idea in a concise executive summary",
  "history": []
}
```

It returns:

```json
{
  "reply": "AI response",
  "model": "gemini-flash-latest"
}
```-latest

Errors return JSONloads -latestsuch as:

```json-latest
{
  "error": "Meanin error-latest message"
}
```-latest

## Deployment guid-latest

### Render / Railway / Google Cloud Run

- Set `NODE_ENV=production`
- Set `PORT` to the platform-assigned port
- Configure `GEMINI_API_KEY` securely in environment variables
- Ensure the health endpoint is reachable at `/health`

## SEO and PWA

The app includes:

- metadata and Open Graph tags for social sharing
- a web app manifest for installability
- a service worker for caching and offline support

## Troubleshooting

- `GEMINI_API_KEY is not configured` → add a real key in `.env`
- `401` → API key is invalid or missing
- `429` → quota or rate limit reached
- `404` → model name may be unavailable
- `504` → request timed out; retry with a shorter prompt

## Project structure

```text
public/          Static frontend assets and PWA files
routes/          API route definitions
middleware/      Validation, rate limiting, and error handling
utils/           AI integration helpers
server.js        Application entry point
```

## Notes

- API keys are never exposed to the frontend.
- Store secrets in environment variables and prevent them from being committed.
