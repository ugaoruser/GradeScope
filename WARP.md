# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common commands

- Install dependencies
  - npm install
- Start backend (serves the frontend in docs/ and the API)
  - npm start
  - App will be available at http://localhost:3000/
- Seed/reset the database (uses server/seed_unified.sql via Node script)
  - npm run seed
  - Notes: generate_seed_sql.js reads DB settings from process env with sensible defaults; adjust server/.env and/or your shell env as needed before running.
- Build
  - npm run build (no-op; static frontend, no bundler)
- Lint and tests
  - Not configured in this repo (no lint or test scripts present).

Tip: If you prefer editing the static frontend with a separate dev server (e.g., VS Code Live Server on http://localhost:5500), CORS is already permitted by the API. Otherwise, just use http://localhost:3000 which serves docs/ directly from the backend.

## High-level architecture

- Root Node/Express service (ESM, Node >= 18) defined by package.json
  - Entry: server/server.js
  - Middleware: helmet, compression, cors, JSON/urlencoded parsing, static serving of docs/
  - Auth: JWT; tokens returned in JSON and also set as httpOnly cookie; verifyToken reads Authorization: Bearer or cookie; requireRole enforces role-based access
  - Real-time: Server-Sent Events at /api/events; broadcasts events like classCreated, enrollmentUpdated, scoreUpdated, parentLinkUpdated, announcement
- Database: MySQL (mysql2/promise)
  - Schema files: server/schema.sql (DDL), server/seed_unified.sql (sample data)
  - Startup migrations: server/server.js ensures columns/tables/indexes exist for subjects, roles, grade_categories, grade_items, enrollments, parent_child, scores, announcements (with best-effort ALTER/CREATE)
  - Data model (essentials): roles, users, subjects, enrollments, grade_categories, grade_items, scores, parent_child, announcements
- API surface (coarse-grained)
  - Auth and profile: POST /api/signup, POST /api/login, GET /api/me, POST /api/me/update
  - Grades and classes: GET/POST /api/grades, GET /api/classes
  - Subjects lifecycle: GET/POST /api/subjects, POST /api/subjects/join
  - Grading setup: grade categories (GET/POST /api/subjects/:subjectId/categories), grade items (GET/POST/DELETE under /api/subjects/:subjectId/items)
  - Scores: GET/POST/DELETE under /api/subjects/:subjectId/scores and GET /api/subjects/:subjectId/grade-summary
  - Parent/child: POST /api/parent/link, GET /api/children
  - Announcements: GET/POST /api/subjects/:subjectId/announcements
- Frontend: Pure HTML/CSS/JS in docs/
  - config.js resolves API_BASE (localhost, GitHub Pages, or same-origin) and wraps fetch with credentials & Authorization header
  - app.js initializes per-page behavior, integrates SSE for live updates, and manages role-based UI
  - index.html, login.html, signup.html, homepage1.html (student/parent), homepage2.html (teacher), settings.html

## Environment and database

- Backend configuration comes from server/.env (loaded explicitly by server/server.js)
  - PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, JWT_SECRET
- Seeding
  - npm run seed runs server/generate_seed_sql.js, which executes server/seed_unified.sql against the configured database
  - The seed file includes sample roles/users/subjects/categories/items/scores for quick local testing

## Repository notes and inconsistencies

- The README mentions an Admin role and seed_data.sql; the current code and seed files implement roles: student, teacher, parent and use server/seed_unified.sql (see npm run seed). No Admin routes exist in server/server.js.
- package.json defines "type": "module" and engines.node ">=18"; run with Node 18+.
