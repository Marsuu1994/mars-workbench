# AI Chat UI

A Next.js chat application with daisyUI Forest theme.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Update Log

### 2026-02-05
- Sidebar chat list: menu button hidden by default, appears on hover
- Current chat highlighted in sidebar
- Menu hover state persists while dropdown is open
- Chat bubble styling adjustments (accent colors, transparency)

### 2026-02-04
- New chat flow: first message on `/chat` creates a chat, generates title via LLM, streams response, then navigates to `/chat/[chatId]` with sidebar refresh
- Auto-generated chat titles using `/api/llm/summarizeTitle` (runs in parallel with streaming for minimal latency)

### 2025-12-14
- ChatInput auto-resize: 1 row default, max 3 rows, then scroll

### 2025-12-13
- Set up PostgreSQL database with Prisma ORM
- Created `chats` and `messages` tables with proper relations
- Implemented 7 REST API endpoints for chat/message CRUD
- Refactored `/api/chat` to `/api/llm` for better separation
- Added multi-chat support with sidebar navigation (SSR)
- Created `/chat` and `/chat/[chatId]` route structure
- Messages persist to database on send
- Created data access layer (`lib/db/`) for centralized queries

### 2025-12-12
- Integrated OpenAI API with streaming responses (gpt-5-nano)
- Added conversation history support
- Loading indicator while waiting for API response
- Renamed message `type` to `role` for API consistency
- Node.js inspector enabled for server-side debugging

### 2025-12-11
- Keyboard shortcuts: Enter to send, Shift+Enter for new line
- Fixed layout with scrollable chat area (header/input stay in place)
- Auto-scroll to newest messages
- Zustand for global state management
- `useChat` hook with streaming support
- `/api/chat` endpoint with mock streaming response
- Pulsing cursor indicator during streaming

### 2024-12-09
- Refactored state to use callback pattern, added loading state
- Added welcome screen and loading skeleton
- Glassmorphism + neon border styling for chat components

### Earlier
- Basic layout with Header, ChatArea, ChatInput
- daisyUI Forest theme integration