# Copilot instructions — FoodShare

This repository contains multiple copies of a small Express backend and a static UI. The canonical, full-featured backend is the one that connects to MongoDB and serves the UI from `FoodShare/backend`.

- **Canonical backend**: [FoodShare/backend/server.js](FoodShare/backend/server.js#L1-L20) — listens on port `5000`, attempts to connect to MongoDB at `mongodb://localhost:27017/foodshare` and falls back to in-memory storage when the DB is unavailable.
- **Simpler/dev servers**: `index.js` and `backend/server.js` at repo root are in-memory variants (port `3000`) and are duplicated copies. Prefer editing the canonical backend unless you intentionally want a minimal server.

Quick run & debug
- Ensure MongoDB is installed/running if you want persistent storage: run `mongod` or start the MongoDB service on Windows.
- Start the full backend (recommended):
  - `node FoodShare/backend/server.js` (from repo root) or `cd FoodShare/backend && node server.js`
  - Visit `http://localhost:5000` (server prints `MongoDB Connected` or a warning and the server URL)
- Start the minimal server (dev quick-check): `node index.js` (runs at `http://localhost:3000`)
 - The canonical backend supports configurable admin credentials via env vars:
   - `ADMIN_ID` and `ADMIN_PASSWORD` default to `Nihar` / `1234`.
   - Example run with custom admin creds:
     - `ADMIN_ID=admin ADMIN_PASSWORD=secret node FoodShare/backend/server.js`
 - `package.json` scripts added for convenience:
   - Root: `npm start` will run the canonical backend.
   - Canonical backend: `cd FoodShare/backend && npm start`.

Key files and patterns
- API surface lives in `FoodShare/backend/server.js` (restaurant & acceptor flows, admin routes). See public vs admin endpoints for how data is filtered (`/restaurants` returns verified only; `/admin/restaurants` returns all).
- Mongoose models: `FoodShare/backend/models/*.js` — use these when persisting to MongoDB. Example: [FoodShare/backend/models/restaurant.js](FoodShare/backend/models/restaurant.js#L1-L40).
- Static UI: `FoodShare/public/*` — pages `restaurant.html`, `acceptor.html`, `admin.html` are single-page forms that POST to the backend endpoints.
- Fallback behaviour: the canonical backend uses a `mongoConnected` flag — when false it writes to `inMemoryRestaurants` / `inMemoryAcceptors`. Look for `mongoConnected` in `FoodShare/backend/server.js`.

API quick reference (examples)
- POST `/add-restaurant` — create restaurant (body: name,email,phone,location,food,quantity,category)
- GET `/restaurants` — public list (verified only)
- GET `/admin/restaurants` — admin list (all)
- PUT `/verify-restaurant/:id` — mark verified
- DELETE `/delete-restaurant/:id`
- same routes exist for acceptors (`/add-acceptor`, `/acceptors`, `/admin/acceptors`, etc.)
- POST `/verify-admin` — simple hardcoded admin check (credentials currently `adminId: Nihar`, `password: 1234`).

Conventions & guidance for agents
- Prefer editing the canonical files under `FoodShare/backend/` and the UI in `FoodShare/public/`. Avoid changing the duplicated servers in the repo root unless the task explicitly targets the minimal copy.
- Persisting changes: migrations to MongoDB should update both the Mongoose models (`FoodShare/backend/models`) and the backend handlers in `FoodShare/backend/server.js` to keep field names aligned (for example, `items` subdocuments in `restaurant` schema).
- Error handling: handlers log errors and return 5xx on exceptions — follow the existing try/catch style used in `FoodShare/backend/server.js` when adding new endpoints.
- Tests/build: there are no automated tests or build scripts. Use manual requests (curl/Postman) and run the server directly. Example quick check: `curl http://localhost:5000/admin/restaurants`.

Security & gotchas
- Admin credentials are hardcoded in `FoodShare/backend/server.js` — remove or replace with proper auth before any real deployment.
- Multiple server copies: edits to one copy are not automatically reflected in others — ensure you update the canonical implementation.
- MongoDB requirement: if `mongod` is not running the server will still operate but data will be lost after restart (in-memory fallback).

If anything here is outdated or you want a different canonical path, tell me where you prefer to centralize development and I will update these instructions.
