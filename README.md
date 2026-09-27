# Universal AI API Connector & API Hub

A production-grade, multi-provider AI gateway platform allowing administrators to create, configure, test, document, and manage reusable AI-powered API microservices.

---

## 🌟 Overview & Highlights

- **Multi-Provider Architecture**: Plug-and-play adapter interface (`AIProvider`) with implementations for **Google Gemini** (`@google/genai`) and **OpenAI**.
- **Dynamic Input Engine**: Administrators can define arbitrary input fields (`TEXT`, `NUMBER`, `BOOLEAN`, `IMAGE`, `FILE`, `JSON`) with runtime type validation, file upload parsing, and coercion.
- **Structured JSON Output**: Guarantees valid, normalized JSON output matching the connector's expected output schema with fallback extraction and repair.
- **Real Generated HTTP Endpoints**: Every connector automatically provisions a real, usable endpoint:
  - `POST /api/run/:slug` (and direct short route `POST /api/:slug`, e.g. `POST /api/card-scanner`)
- **API Key Security**: Endpoints protected via Bearer token (`Authorization: Bearer <API_KEY>`) or `x-api-key`. Keys are salted and hashed (SHA-256) at rest; underlying provider keys stay strictly server-side.
- **Interactive Testing Playground**: Automatically generated UI forms based on the dynamic input schema with direct execution, latency tracking, token usage, and live response viewer.
- **Auto Developer Documentation**: OpenAPI-style documentation generation with parameter descriptions, response shapes, and working cURL snippets.
- **Audit Logging & Analytics**: Every request (success or error) is persistently logged with response times, token counts, and costs, powering live Recharts visualizations.

---

## 🏗️ Architecture Diagram

```
                 CLIENT APPLICATION / EXTERNAL CONSUMER
                                   │
               POST /api/run/:slug (Bearer Token / x-api-key)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY / SERVER                            │
│                                                                        │
│  1. Authenticate API Key ──► Verify SHA-256 against Database KeyHash   │
│  2. Retrieve Connector   ──► Fetch Inputs & Output Schema by Slug       │
│  3. Check Status         ──► Ensure Connector is 'active' (not disabled)│
│  4. Dynamic Input Engine ──► Validate types, required fields, files   │
│  5. Safe Prompt Builder  ──► Combine System Instructions + Inputs      │
│  6. Provider Adapter     ──► Route to GeminiProvider or OpenAIProvider │
│  7. AI Provider Call     ──► Call model with structured JSON schema    │
│  8. Output Validator     ──► Normalize and validate output structure   │
│  9. Audit & Analytics    ──► Persist latency, token usage, cost, status│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
        Google Gemini Provider               OpenAI Provider
       (SDK: @google/genai)              (Chat Completions API)
     Multimodal Vision & JSON           Structured JSON & Vision
```

---

## 📁 Project Directory Structure

```
├── data/
│   └── database.json          # Persistent ACID JSON database
├── prisma/
│   └── schema.prisma          # Relational Prisma models (Connector, Input, Key, Log)
├── server/
│   ├── db/
│   │   ├── database.ts        # Database access layer with atomic write persistence
│   │   ├── schema.ts          # Database entity types
│   │   └── seed.ts            # Seeds Card Scanner & Article Writer demo connectors
│   ├── engine/
│   │   ├── auth.ts            # API Key authentication & extraction
│   │   ├── dynamicInput.ts    # Dynamic input parameter validation engine
│   │   ├── promptBuilder.ts   # Safe system prompt and parameter assembler
│   │   └── schemaValidator.ts # Structured output schema validation & normalizer
│   ├── providers/
│   │   ├── types.ts           # AIProvider interface and models
│   │   ├── gemini.ts          # GeminiProvider using @google/genai
│   │   ├── openai.ts          # OpenAIProvider HTTP adapter
│   │   └── registry.ts        # Provider registry & model discovery
│   ├── routes/
│   │   ├── analytics.ts       # Analytics and request log endpoints
│   │   ├── connectors.ts      # Connector CRUD, documentation, and key management
│   │   ├── execution.ts       # Generated dynamic execution routes
│   │   └── providers.ts       # Available providers and model listing
│   └── tests/
│       └── runTests.ts        # Backend unit & integration test runner
├── src/
│   ├── components/
│   │   ├── layout/            # Header, Sidebar, Responsive Layout
│   │   └── ui/                # Badge, Modal, CodeBlock, Toast
│   ├── pages/
│   │   ├── AnalyticsPage.tsx  # Analytics dashboard with Recharts
│   │   ├── ConnectorDetailPage.tsx # Connector overview & key generator
│   │   ├── ConnectorsListPage.tsx  # Searchable & filterable connector table
│   │   ├── CreateConnectorPage.tsx # 6-Step connector creation wizard
│   │   ├── DashboardPage.tsx  # Main SaaS dashboard overview
│   │   ├── DocsPage.tsx       # Auto developer documentation portal
│   │   ├── LogsPage.tsx       # Filterable request logs & audit inspector
│   │   ├── SettingsPage.tsx   # System health & security overview
│   │   └── TestPlaygroundPage.tsx  # Interactive API testing playground
│   ├── services/
│   │   └── api.ts             # Typed frontend client API
│   ├── types/
│   │   └── connector.ts       # Shared TypeScript models
│   ├── App.tsx                # Client-side router & layout
│   └── index.css              # Tailwind CSS styles
├── server.ts                  # Full-stack server entrypoint
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Environment Variables

Copy `.env.example` to `.env`:

```bash
# GEMINI_API_KEY: Injected by AI Studio or set manually
GEMINI_API_KEY="your_gemini_api_key"

# OPENAI_API_KEY: Optional secondary AI provider
OPENAI_API_KEY="your_openai_api_key"

# DATABASE_URL: Prisma database URL
DATABASE_URL="file:./data/apihub.db"

# API_KEY_SECRET: Salt for connector key hashing
API_KEY_SECRET="ai-hub-secret-salt-production-value"

PORT=3000
```

### 2. Development

Run the full-stack development server (Express backend + Vite middleware on port 3000):

```bash
npm run dev
```

Visit `http://localhost:3000` to access the admin dashboard.

### 3. Running Automated Tests

Run the full integration test suite verifying connector creation, dynamic inputs, key hashing, prompt construction, and provider adapters:

```bash
npm test
```

### 4. Production Build & Deployment

```bash
npm run build
npm start
```

---

## 🔌 Preconfigured Demonstration Connectors

The system seeds two real, fully functioning demonstration connectors out of the box:

### 1. Card Scanner (`POST /api/card-scanner`)
- **Provider**: Google Gemini (`gemini-3.8-flash` with vision)
- **Input**: `image` (Type: `IMAGE`, multipart/form-data or base64)
- **Output Schema**:
  ```json
  {
    "name": "Sarah Jenkins",
    "company": "CloudScale Systems Inc.",
    "designation": "VP of Cloud Architecture & AI",
    "phone": "+1 (415) 555-0199",
    "email": "sarah.jenkins@cloudscale.io",
    "website": "https://cloudscale.io"
  }
  ```

### 2. Article Writer (`POST /api/article-writer`)
- **Provider**: Google Gemini (`gemini-3.8-flash`) / OpenAI
- **Inputs**:
  - `topic` (Text, required)
  - `keywords` (Text, optional)
  - `word_count` (Number, default 800)
  - `options` (JSON, optional)
- **Output Schema**:
  ```json
  {
    "title": "The Future of AI Gateways",
    "summary": "Executive summary...",
    "article": "Full markdown body...",
    "keywords": ["AI", "gateway", "microservices"]
  }
  ```

---

## 💻 Example cURL Commands

### Calling the Article Writer Endpoint
```bash
curl -X POST "http://localhost:3000/api/article-writer" \
  -H "Authorization: Bearer aic_live_demo_article_writer_secret_key_99" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Autonomous Microservices with AI Gateways",
    "keywords": "AI gateway, architecture, typescript",
    "word_count": 600,
    "options": { "tone": "executive" }
  }'
```

### Calling the Card Scanner Endpoint (Multipart Image Upload)
```bash
curl -X POST "http://localhost:3000/api/card-scanner" \
  -H "Authorization: Bearer aic_live_demo_card_scanner_secret_key_88" \
  -F "image=@/path/to/business_card.png" \
  -F "notes=Met at developer conference"
```

---

## 🔒 Security & Invariants

1. **Provider Key Protection**: `GEMINI_API_KEY` and `OPENAI_API_KEY` are only ever read in backend server files. They are never sent to the client, included in client bundles, or exposed in developer documentation.
2. **Connector API Key Hashing**: Application keys are generated with 192 bits of entropy (`aic_live_...`) and stored as SHA-256 hashes.
3. **Dynamic Input Validation**: Every request is type-checked against the configured schema (file size limits, MIME type filtering, JSON syntax validation).
4. **Resilience**: Upstream AI timeouts and errors are caught gracefully and returned in standard JSON envelopes without leaking backend stack traces.
