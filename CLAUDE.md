# AI Chat

A Next.js chat application with job search focus.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, daisyUI 5 (Forest theme)
- **Icons**: Heroicons
- **Language**: TypeScript

## Project Structure

```
ui/
├── src/
│   ├── app/
│   │   ├── home/page.tsx      # Main chat page with state management
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   └── components/
│       ├── chat/
│       │   ├── ChatArea.tsx       # Message display area
│       │   ├── ChatBubble.tsx     # Individual message bubble
│       │   ├── ChatInput.tsx      # Text input with send button
│       │   ├── LoadingIndicator.tsx
│       │   └── WelcomeMessage.tsx
│       └── common/
│           └── Header.tsx
```

## Current State

- Basic chat UI with glassmorphism + neon border styling
- Mock response system (2s delay hardcoded)
- Welcome screen when no messages
- Loading skeleton while waiting for response

## Backlog

### High Priority
- [ ] ChatInput - add support for send message by enter, shift enter to second line
- [ ] ChatArea - add max height so we dont have to scroll the whole page
- [ ] Implement Zustand for state management
- [ ] Build custom `useChat` hook with streaming support using mock server
- [ ] Create Route Handler for LLM API (`/api/chat`)

### Medium Priority
- [ ] ChatInput - add text validation, send button should disable when no input
- [ ] ChatInput - size should be adjustable, adding more line should change the height
- [ ] Wire up actual LLM API (OpenAI/Anthropic)
- [ ] Design to make it more job search focused

### Low Priority
- [ ] Refactor header
- [ ] Add SSE streaming support
- [ ] Add authentication
- [ ] Support adding multiple chat and save chat history
- [ ] Support uploading pictures
- [ ] Add prettier
- [ ] Codebase cleanup

### UI Design
- [ ] Redesign the theme
- [ ] Tokenize common patterns

## Commands

```bash
cd ui && npm run dev   # Start dev server
cd ui && npm run build # Production build
```