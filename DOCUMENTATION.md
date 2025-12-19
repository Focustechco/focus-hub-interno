# Focus Hub - Project Documentation

## Overview
Focus Hub is a daily operations and task management application designed to help teams organize their work, track goals, and manage daily check-ins.

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, TailwindCSS (inferred from usage), Framer Motion, Recharts, Dnd-kit.
- **Backend**: Node.js, Express, PostgreSQL.
- **Database**: PostgreSQL (schema defined in `backend/schema.sql`).

## Current Status
The project is currently in a **hybrid state**, transitioning from a frontend-only prototype with mock data to a full-stack application connected to a backend.

### Frontend
- **Screens**:
    - Dashboard
    - Check-in/Check-out
    - Tasks (Kanban/List/Calendar views)
    - Mural (Posts)
    - Goals
    - Focus Tools
    - Admin
- **Data Source**: Currently uses a mix of `MOCK_DATA` constants and API calls (`api.get('/tasks')`, etc.) in `App.tsx`.
- **Authentication**: `useAuth` hook is present, but `LoginScreen` currently mocks user selection.

### Backend
- **Server**: `server.js` running on Node/Express.
- **Database**: PostgreSQL schema includes tables for `users`, `tasks`, `subtasks`, `check_ins`, `posts`, `goals`, `daily_checklist`.
- **API**: Routes seem to be defined (based on `backend/routes` folder existence), but need verification of full coverage.

## Next Steps (Planned)
1.  **Complete API Integration**: Replace all `MOCK_DATA` in frontend with real API calls.
2.  **Finalize Authentication**: Connect `LoginScreen` to the backend `/login` endpoint.
3.  **Database Migration**: Ensure the PostgreSQL database is running and seeded with initial data.
4.  **Testing**: Verify full end-to-end flow (Login -> Dashboard -> Task Management).
