# Self(queue)

Documentation baseline for the LinkEt Self(queue) workspace, derived from `05_CodingGuide.docx` and aligned to the code currently present in this repository.

## Current State

- `Backend` has an initial Node.js/Express backend with MongoDB connection setup, core Mongoose models, a FIFO queue engine, basic health routes, and Socket.io room handling.
- `passenger` is a placeholder Flutter app directory. The expected screens and services are documented, but the app scaffold is not committed yet.
- `driver` is a placeholder Flutter app directory. The expected driver-specific flows are documented, but the app scaffold is not committed yet.
- `admin` now has a minimal Vite/React scaffold so dependencies install cleanly and the app can boot, but the real admin features are still placeholders.

## Repo Map

- `Backend` - backend API, database models, queue engine, sockets
- `passenger` - planned passenger Flutter app
- `driver` - planned driver Flutter app
- `admin` - React admin panel scaffold

## Runtime Topology

```text
Flutter Passenger App <-> HTTP / WebSocket <-> Backend API (port 5000)
Flutter Driver App    <-> HTTP / WebSocket <-> Backend API (port 5000)
Admin Panel (3000)    <-> HTTP / WebSocket <-> Backend API (port 5000)
```

## Documents

- `docs/SETUP.md` - local environment setup and startup instructions
- `docs/ARCHITECTURE.md` - system structure, backend modules, data model, and realtime flow
- `docs/API_SPEC.md` - current and planned API/socket contract
- `docs/ROADMAP.md` - phased build order and delivery milestones
- `docs/TESTING.md` - test strategy and execution guidance
- `docs/DEPLOYMENT.md` - CI/CD, Docker, and release deployment notes

## Quick Start

1. Review `docs/SETUP.md`.
2. Copy or update environment variables in `Backend/.env`.
3. Start the backend from `Backend` with `npm run dev`.
4. Start the admin panel from `admin` with `npm run dev` on `http://localhost:3000`.
5. Use `GET /` and `GET /api/health` to verify the API is running on `http://localhost:5000`.
6. Build the remaining apps following `docs/ROADMAP.md`.

## Notes

- The coding guide targets Addis Ababa, Ethiopia and assumes Telebirr, Firebase OTP, OpenStreetMap, Nominatim, and OSRM integrations.
- This documentation does not claim unimplemented features are complete. Planned items are called out explicitly to avoid drift between docs and code.
