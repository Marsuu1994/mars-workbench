# AI Chat UI

A Next.js chat application with daisyUI Forest theme.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Update Log

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