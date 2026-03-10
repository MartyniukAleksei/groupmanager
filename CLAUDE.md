# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GroupManager is a full-stack web platform for managing school/university groups. It supports Google OAuth authentication and role-based access (admin, starosta, editor, user) for managing schedules, homework, attendance, materials, and an electronic queue system.

## Development Commands

### Docker (recommended — full stack)
```bash
docker-compose up          # Start all services (DB on 5432, backend on 8000, frontend on 5173)
docker-compose up --build  # Rebuild images first
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # Production build to dist/
npm run lint      # ESLint
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Database Migrations
```bash
cd backend
alembic upgrade head                   # Apply all migrations
alembic revision --autogenerate -m "description"  # Generate migration from model changes
alembic downgrade -1                   # Rollback one step
```

## Architecture

### Stack
- **Backend:** FastAPI + SQLAlchemy 2.0 async + PostgreSQL (Neon cloud) + Alembic + PyJWT
- **Frontend:** React 19 + Vite + React Router + Axios + @react-oauth/google
- **Auth:** Google OAuth 2.0 → backend JWT (7-day expiry, stored in localStorage)

### Backend Structure (`backend/app/`)
- `main.py` — FastAPI app, CORS config, lifespan (auto-creates tables on startup)
- `database/models.py` — SQLAlchemy ORM: `users`, `groups`, `user_groups` (many-to-many with roles)
- `database/database.py` — Async engine, session factory, `get_db` dependency
- `routers/auth.py` — Google OAuth verification + JWT issuance at `/auth/google`
- `schemas.py` — Pydantic request/response models

### Frontend Structure (`frontend/src/`)
- `main.jsx` — React root, wraps with `GoogleOAuthProvider`
- `App.jsx` — Top-level routing and Google login
- `context/AuthContext.jsx` — Auth state (user, token) persisted in localStorage
- `context/ThemeContext.jsx` — Light/dark theme
- `features/` — Feature modules: `attendance/`, `board/`, `homework/`, `materials/`, `queue/`, `schedule/`
- `styles/` — Feature-specific CSS files

### Authentication Flow
1. Google credential token received in frontend
2. POST to `/auth/google` with token
3. Backend verifies with Google, upserts user in DB, returns JWT
4. JWT stored in localStorage, sent as `Authorization: Bearer <token>` header

### Database Schema
- `users` — Google OAuth accounts
- `groups` — Class groups with unique join codes
- `user_groups` — Junction table with `role` field (admin/starosta/editor/user)

## Environment Variables (`.env`)
Required: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET_KEY`, `VITE_API_URL`
