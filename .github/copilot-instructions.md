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

# Copilot instructions — FoodShare

Short summary
- Canonical server: FoodShare/backend/server.js (full-featured, MongoDB-backed, port 5000).
- Dev/minimal servers: root `index.js` and `backend/server.js` at repo root are lightweight duplicates (port 3000). Prefer editing the canonical server unless intentionally working on a minimal copy.

Quick run & debug
- Start MongoDB for persistent data: run `mongod` or start the MongoDB service on Windows.
- Run canonical backend (recommended):
  - `node FoodShare/backend/server.js` or `cd FoodShare/backend && npm start`
  - Server logs `MongoDB Connected` on success; if not, it falls back to in-memory storage and logs a warning.
- Run minimal/dev server: `node index.js` (runs at `http://localhost:3000`).
- Override admin credentials at runtime with env vars: `ADMIN_ID` and `ADMIN_PASSWORD` (defaults: Nihar / 1234).

Architecture & important files
- API entrypoint: FoodShare/backend/server.js — implements restaurant, acceptor, and admin routes. Look for `mongoConnected` to see DB vs in-memory behavior.
- Mongoose models: FoodShare/backend/models/*.js (restaurant.js, acceptor.js, admin.js, activityLog.js). Update schema and server handlers together when adding fields.
- Static UI: FoodShare/public/* (restaurant.html, acceptor.html, admin.html, dashboard.html). There are duplicate copies at repository root `public/` and `FoodShare/public/`.

Data flow & behavior notes
- On startup the canonical server attempts MongoDB at `mongodb://localhost:27017/foodshare`. If the connection fails the code uses `inMemoryRestaurants` / `inMemoryAcceptors` guarded by `mongoConnected`.
- Persisted edits require updating both model definitions and any code that reads/writes those fields in `server.js`.

Common endpoints (examples)
- POST `/add-restaurant` (body: name,email,phone,location,food,quantity,category)
- GET `/restaurants` (public — verified only)
- GET `/admin/restaurants` (admin — returns all)
- PUT `/verify-restaurant/:id` and DELETE `/delete-restaurant/:id`
- Same patterns exist under acceptor routes (`/add-acceptor`, `/acceptors`, `/admin/acceptors`).
- Admin auth: POST `/verify-admin` — currently hardcoded check; replace before production.

Agent conventions & tips
- Prefer edits in `FoodShare/backend/` and `FoodShare/public/` (canonical). Only modify root copies when intentionally working on the lightweight server or UI.
- When adding fields: update model file in `FoodShare/backend/models/` and corresponding handler(s) in `FoodShare/backend/server.js` (search for field names to ensure consistency).
- Follow existing try/catch + logging patterns used in `server.js` for error responses (500 on exceptions).
- No automated tests are present — validate changes with curl/Postman or by running the server locally.

Quick examples
- Start canonical server:

  ADMIN_ID=admin ADMIN_PASSWORD=secret node FoodShare/backend/server.js

- Quick curl check (admin list):

  curl http://localhost:5000/admin/restaurants

If anything here is stale or you'd like more detail (API spec, field lists, or a small test harness), tell me which area to expand and I'll update this file.
