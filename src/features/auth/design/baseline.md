# Baseline Design

## Goal

An authentication layer for Mars Workbench that identifies users and gates access to features. Enables per-user data isolation (e.g., each user sees only their own plans, chats, and tasks).

## Features

### Implemented
- Connect to Supabase database (migrated from local PostgreSQL)
- Sign-up / login via Google OAuth
- Route protection — redirect unauthenticated users to login
- Collapsible app sidebar with sign-out flow (mockup: `mockup/mockup-sidebar.html`)
- Redirect authenticated users away from `/auth/login`
- Deployed on Vercel

### Planned: Future

(to be designed)

## Entities

* **User** — a Mars Workbench user who authenticates via Google OAuth.

## Schema

No additional schema required — Supabase Auth manages user records internally.
