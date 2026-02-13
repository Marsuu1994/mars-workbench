# AI Chat

## Current State

- New chat flow: first message on `/chat` creates a chat, generates title via LLM, streams response, updates URL and sidebar
- Auto-generated chat titles using `/api/llm/summarizeTitle` endpoint (runs in parallel with streaming)
- Delete flow: user able to delete the existing chat
- Multi-chat support with sidebar navigation
- Sidebar: collapsible with smooth transitions, three-region layout (header, functions, chats)
- Sidebar UX: current chat highlighted, menu button appears on hover, persists while menu open
- SSR layout with server-fetched chat list, client hydration for existing chats
- `/chat` for new conversations (client-rendered), `/chat/[chatId]` for existing ones (SSR + hydration)
- Data access layer (`lib/db/`) for centralized Prisma queries
- Messages persist to database on send
- Chat UI with glassmorphism + neon border styling
- Streaming response with animated cursor indicator
- Keyboard shortcuts: Enter to send, Shift+Enter for new line
- Global state management with Zustand (hydration support)
- PostgreSQL database with Prisma ORM

## Backlog

### High Priority

### Medium Priority
- [ ] Design an abstract layer so it takes message and chosen provider - openai/deepseek/claude
- [ ] Wire up actual LLM API - Claude
- [ ] Investigate structural output on LLM providers
- [ ] Add function to generate random welcome message from LLM

### Low Priority
- [ ] Add authentication - probably take some user information and make it a reusable prompt
- [ ] Design to make it a standalone component, so it can take different context to handle different tasks - job search, travel planning
- [ ] Design deploy pipeline
- [ ] Support uploading documents
- [ ] Add prettier
- [ ] Redesign the theme - try autumn
- [ ] Tokenize common patterns

## Update Log

### 2026-02-06
- Restructure to feature-based folder layout (`features/chat/`)

### 2026-02-05
- Collapsible sidebar with smooth width/opacity transitions
- Sidebar refactored into three regions: header (toggle), functions (new chat), chats list
- Extracted Sidebar and ChatHeader into separate components
- Sidebar menu button hidden by default, appears on hover
- Current chat highlighted in sidebar
- Chat bubble styling adjustments (accent colors, transparency)
- Add delete chat flow
- Rename repo to mars-workbench

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

### 2025-12-09
- Refactored state to use callback pattern, added loading state
- Added welcome screen and loading skeleton
- Glassmorphism + neon border styling for chat components

### Earlier
- Basic layout with Header, ChatArea, ChatInput
- daisyUI Forest theme integration

## Done
- [x] Restructure to feature-based folder layout (`features/chat/`)
- [x] Implement sidebar open/collapse state
- [x] Add highlight current chat
- [x] Add delete chat flow
- [x] Add new chat flow
- [x] Add function to summarize new chat's title dynamically
- [x] ChatInput auto-resize: 1 row default, max 3 rows, then scroll
- [x] Wire up actual LLM API - OpenAI
- [x] ChatInput - add support for send message by enter, shift enter to second line
- [x] ChatArea - add max height so we dont have to scroll the whole page
- [x] Implement Zustand for state management
- [x] Build custom `useChat` hook with streaming support using mock server
- [x] Create Route Handler for LLM API (refactored to `/api/llm`)
- [x] Set up Prisma with PostgreSQL
- [x] Design and create database schema (chats, messages tables)
- [x] Implement 7 REST API endpoints for chat/message CRUD
- [x] Design db and ui so the app can have multiple chats
- [x] Wire up with DB and expose corresponding endpoints for message and chat CRUD
- [x] Rebuild the layout to have a side nav with all chat history and header (SSR)
- [x] Create /chat/chatId for specific chat page and wire up created endpoint
- [x] Create data access layer (lib/db/) for centralized Prisma queries
