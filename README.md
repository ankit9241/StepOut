# StepOut — Real-World Outdoor Mindfulness

StepOut is an intentional mindfulness and outdoor-experiment web application. It guides people away from screens and into the physical world through small, safe sensory challenges, a countdown timer, and thoughtful reflections.

The application is built as a **unified, single-service web application** where the TanStack Start frontend and the Node.js backend API run together on the **same HTTP server and port**, deployable directly to **one Render Web Service**.

---

## 1. Architecture

```text
StepOut/
├── src/
│   ├── routes/                   # TanStack Start SSR frontend routes
│   │   ├── index.tsx             # Homepage & intro
│   │   ├── create.tsx            # Challenge creation & configuration
│   │   ├── challenge.tsx         # Challenge briefing
│   │   ├── go.tsx                # Countdown timer session
│   │   ├── return.tsx            # Reflection submission
│   │   ├── result.tsx            # Honest completion field notes
│   │   └── how-it-works.tsx      # Privacy & philosophy
│   ├── components/               # React UI components (AiStatus, chrome, badges)
│   ├── lib/                      # Client utilities (api.ts, session.ts, challenges.ts)
│   ├── server/                   # Backend API runtime
│   │   ├── config/               # Validated server configuration
│   │   ├── schemas/              # Zod schemas for request validation
│   │   ├── middleware/           # Security headers, CORS, rate limiting, body parsing
│   │   ├── services/             # AI (Gemma/Ollama/hosted), challenges, reflections, DB
│   │   ├── routes/               # API endpoint handlers (health, challenges, reflections)
│   │   └── app.ts                # Central API router & dispatcher
│   ├── server.ts                 # Unified production & SSR entry point
│   └── start.ts                  # TanStack Start configuration
├── public/                       # Static assets (robots.txt, favicon.ico)
├── tests/                        # Automated backend & API test suite
├── package.json                  # Root dependencies & scripts
├── vite.config.ts                # Vite & Nitro node-server configuration
└── .env.example                  # Environment configuration reference
```

### Key Architectural Highlights

- **Single HTTP Server:** Both frontend SSR and `/api/*` endpoints are served on the same port by the single production Node.js process.
- **Same-Origin API:** In production, all client requests target relative paths (`/api/health`, `/api/challenges/generate`, `/api/reflections/generate`), removing cross-origin complexity and avoiding CORS issues.
- **Timestamp-Based Session:** Challenge timer sessions in `src/lib/session.ts` are timestamp-based and pure, avoiding clock accumulation skew.
- **Deterministic Offline Fallbacks:** If external AI or database services are unconfigured or unreachable, the application continues to run without error, using built-in deterministic generators.
- **Graceful Lifecycle:** Handles `SIGTERM` and `SIGINT` signals for graceful process shutdown and clean resource release.

---

## 2. API Endpoints

### `GET /api/health`

Fast, lightweight application health check suitable for Render health probes and external uptime monitors (e.g. UptimeRobot). Does not require authentication and does not invoke external AI or database services, ensuring instant sub-millisecond responses without leaking internal infrastructure details.

- **Status:** HTTP 200 OK
- **Response Format:**
  ```json
  {
    "status": "ok"
  }
  ```

### `POST /api/challenges/generate`

Generates a safe outdoor sensory challenge based on preferences.

- **Payload:**
  ```json
  {
    "durationMinutes": 5,
    "environment": "park",
    "category": "notice",
    "difficulty": "easy"
  }
  ```
- **Response Format:**
  ```json
  {
    "id": "builtin-notice-...",
    "title": "The overlooked detail",
    "description": "Find one ordinary detail you have passed without noticing before.",
    "durationMinutes": 5,
    "difficulty": "easy",
    "category": "notice",
    "environment": "park",
    "steps": ["Find a safe place to pause.", "Look around slowly.", "..."],
    "curiosityPrompt": "What made you notice it now?",
    "safetyNote": "Stay in a safe, accessible place...",
    "generationMode": "builtin" | "gemma",
    "createdAt": "2026-10-10T11:00:00.000Z"
  }
  ```

### `POST /api/reflections/generate`

Processes an observation and generates a mindful, encouraging reflection.

- **Payload:**
  ```json
  {
    "challengeTitle": "The overlooked detail",
    "observation": "I noticed small moss growing in the stone crack."
  }
  ```
- **Response Format:**
  ```json
  {
    "reflection": "Noticing small moss growing in the stone crack breaks the rhythm of screen time..."
  }
  ```

---

## 3. Installation & Local Development

### Prerequisites

- Node.js >= 20.x
- npm >= 10.x
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd StepOut-new

# Install dependencies with lockfile consistency
npm ci
```

### Local Development

```bash
npm run dev
```

The dev server starts on `http://localhost:8080/`. Both the frontend and API routes (`/api/*`) are available on this origin.

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

Compiles client bundles and generates the unified Node.js standalone server into `.output/server/index.mjs`.

### Running in Production Locally

```bash
export PORT=3000
npm start
# or: node .output/server/index.mjs
```

---

## 4. Single-Service Render Deployment

Deploying StepOut to Render requires only **one Web Service**:

| Setting               | Value                                            |
| --------------------- | ------------------------------------------------ |
| **Environment**       | Node                                             |
| **Node Version**      | `>= 20.0.0`                                      |
| **Root Directory**    | `.` (repository root)                            |
| **Build Command**     | `npm ci && npm run build`                        |
| **Start Command**     | `npm start` (or `node .output/server/index.mjs`) |
| **Health Check Path** | `/api/health`                                    |
| **Auto-Deploy**       | Yes (on push to main branch)                     |

No second backend service or frontend static site is needed.

---

## 5. Environment Variables Reference

Copy `.env.example` to `.env` if customizing your environment:

```bash
cp .env.example .env
```

| Variable                     | Default      | Purpose                                                                  |
| ---------------------------- | ------------ | ------------------------------------------------------------------------ |
| `PORT`                       | `3000`       | Port for the HTTP server to listen on (automatically set by Render).     |
| `NODE_ENV`                   | `production` | Runtime mode (`development`, `production`, `test`).                      |
| `AI_PROVIDER`                | `none`       | AI provider (`none`, `ollama`, `openai`).                                |
| `AI_API_URL`                 | `""`         | Base URL of provider (e.g. `http://localhost:11434` or hosted endpoint). |
| `AI_MODEL`                   | `gemma:2b`   | Model name.                                                              |
| `AI_API_KEY`                 | `""`         | Secret API key for hosted providers (kept strictly server-side).         |
| `AI_TIMEOUT_MS`              | `20000`      | Total request timeout for AI calls (ms).                                 |
| `AI_MAX_CONCURRENCY`         | `3`          | Maximum concurrent AI requests processed.                                |
| `RATE_LIMIT_GENERAL_MAX`     | `100`        | Max requests per minute per IP for general endpoints.                    |
| `RATE_LIMIT_CHALLENGES_MAX`  | `15`         | Max requests per minute per IP for challenge generation.                 |
| `RATE_LIMIT_REFLECTIONS_MAX` | `15`         | Max requests per minute per IP for reflection submission.                |
| `MONGODB_URI`                | `""`         | Optional MongoDB connection string for activity logging.                 |
| `MONGODB_DB_NAME`            | `stepout`    | MongoDB database name.                                                   |
| `ALLOWED_ORIGINS`            | `""`         | Optional comma-separated CORS origins.                                   |
| `TRUST_PROXY`                | `true`       | Enables extraction of real client IPs behind Render's reverse proxy.     |

---

## 6. AI Provider & Fallback Details

- **Zero-Config Startup:** StepOut starts and runs smoothly without AI credentials. Challenges and reflections use safe, deterministic built-in templates.
- **Hosted Gemma / Ollama Integration:** When `AI_PROVIDER=ollama` or `AI_PROVIDER=openai` is set with an accessible URL, requests invoke Gemma to tailor challenges and reflections dynamically.
- **Concurrency & Timeouts:** Requests are guarded by a semaphore (`AI_MAX_CONCURRENCY`) and an `AbortSignal` timeout (`AI_TIMEOUT_MS`).
- **Safety Checks:** If the AI provider returns malformed JSON, times out, or fails schema validation, the system falls back seamlessly to deterministic generation without presenting an error to the user.

---

## 7. Security & Rate Limiting

- **Security Headers:** Every API response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Content-Security-Policy`.
- **Payload Bounds:** Request bodies are capped at 50 KB and require `application/json`.
- **Rate Limiting:** Dedicated token-bucket rate limits per client IP prevent abuse on `/api/challenges/generate` and `/api/reflections/generate`.
- **Render Health Checks:** `/api/health` is exempt from aggressive rate limiting so Render health probes never trigger HTTP 429.

---

## 8. License

MIT
