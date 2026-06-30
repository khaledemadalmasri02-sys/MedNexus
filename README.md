# Professional API Server

A standalone, professional backend API server with AI-powered features and self-contained terminal functionality. This server is independent of any platform like Replit and can be deployed anywhere.

## Features

### Core API
- **Authentication**: Session-based auth with guest access support
- **Deck Management**: Create, read, update, delete, merge, and export decks
- **Card Management**: CRUD operations for flashcards with batch regeneration
- **Health Checks**: Comprehensive health monitoring endpoints

### Self-Contained Terminal
- **Terminal Sessions**: Create isolated terminal sessions
- **Command Execution**: Execute shell commands in sandboxed workspaces
- **File Management**: Read, write, and list files within workspaces
- **Security**: Blocked dangerous commands, workspace isolation

### AI-Ready Architecture
- **Multi-Provider Support**: OpenRouter, OpenAI, Groq, Ollama
- **Configurable Models**: Separate models for text, vision, Q&A
- **Streaming Support**: Server-Sent Events for real-time responses

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite (via better-sqlite3 + Drizzle ORM)
- **Logging**: Pino
- **Validation**: Zod

## Project Structure

```
├── src/
│   ├── config.ts           # Configuration management
│   ├── index.ts            # Entry point
│   ├── app.ts              # Express app setup
│   ├── db/
│   │   ├── index.ts        # Database connection
│   │   └── schema.ts       # Database schema
│   ├── lib/
│   │   ├── logger.ts       # Logging setup
│   │   └── auth.ts         # Authentication utilities
│   ├── middleware/
│   │   └── auth.ts         # Auth middleware
│   └── routes/
│       ├── index.ts        # Route aggregator
│       ├── auth.ts         # Auth routes
│       ├── decks.ts        # Deck CRUD routes
│       ├── cards.ts        # Card CRUD routes
│       ├── health.ts       # Health check routes
│       └── terminal.ts     # Terminal routes
├── data/                   # SQLite database
├── logs/                   # Log files
├── workspaces/             # Terminal workspaces
├── package.json
├── tsconfig.json
└── .env.example
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd professional-api-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run in development mode**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | SQLite database path | `./data/sqlite.db` |
| `OPENROUTER_API_KEY` | OpenRouter API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `GROQ_API_KEY` | Groq API key | - |
| `AI_TEXT_MODEL` | Model for text generation | `openrouter/anthropic/claude-3.5-sonnet:free` |
| `ADMIN_SECRET_KEY` | Admin API key | - |
| `FREE_MAX_DECKS` | Free tier deck limit | `10` |

## API Endpoints

### Authentication
- `POST /api/auth/guest` - Create guest session
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Get current user

### Decks
- `GET /api/decks` - List all decks
- `POST /api/decks` - Create new deck
- `GET /api/decks/:id` - Get deck details
- `PATCH /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck
- `GET /api/decks/:id/cards` - Get deck cards
- `GET /api/decks/:id/export` - Export deck as CSV
- `POST /api/decks/merge` - Merge multiple decks

### Cards
- `GET /api/cards?deckId=:id` - Get cards by deck
- `POST /api/cards` - Create new card
- `PATCH /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card
- `POST /api/cards/regenerate-batch` - Batch regenerate with AI

### Terminal
- `POST /api/terminal/sessions` - Create terminal session
- `GET /api/terminal/sessions/:id` - Get session info
- `POST /api/terminal/exec` - Execute command
- `GET /api/terminal/files` - List files
- `GET /api/terminal/files/content` - Read file
- `POST /api/terminal/files/content` - Write file
- `DELETE /api/terminal/sessions/:id` - Close session

### Health
- `GET /healthz` - Basic health check
- `GET /api/health` - Detailed health check
- `GET /api/model-info` - AI model configuration

## Usage Examples

### Create a Guest Session
```bash
curl -X POST http://localhost:3001/api/auth/guest \
  -c cookies.txt
```

### Create a Deck
```bash
curl -X POST http://localhost:3001/api/decks \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name": "My Deck", "description": "Study deck"}'
```

### Create a Card
```bash
curl -X POST http://localhost:3001/api/cards \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"deckId": 1, "front": "Question?", "back": "Answer!"}'
```

### Execute Terminal Command
```bash
curl -X POST http://localhost:3001/api/terminal/exec \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la", "sessionId": "session-id"}'
```

## Security Features

- Session-based authentication with HTTP-only cookies
- CORS protection
- Helmet.js security headers
- Command injection prevention in terminal
- Workspace isolation for terminal sessions
- Input validation with Zod

## License

MIT
