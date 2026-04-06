# selfqueue-backend

Backend API for Self(queue).

## Current Scope

Implemented:

- Express app bootstrap
- MongoDB connection with Mongoose
- models for `User`, `Driver`, `Queue`, `Ride`, `Payment`, and `Dispute`
- FIFO queue engine in `src/services/queueEngine.js`
- Socket.io handshake and room subscription support
- `GET /` and `GET /api/health`
- queue engine tests

Not implemented yet:

- OTP auth routes
- queue CRUD and join or leave routes
- ride management routes
- Telebirr payment integration
- admin, dispute, notification, and driver API layers

## Commands

```bash
npm install
npm run dev
npm test
```

## Vercel

Deploy `Backend` as the Vercel project root. Vercel uses `src/app.js` as the Express entrypoint, while `src/server.js` remains the local long-running server for development.

The HTTP API is Vercel-compatible. Socket.IO is only started in non-Vercel environments, because Vercel Functions are not meant to host long-lived WebSocket servers.

Set these production environment variables in Vercel:

- `API_PREFIX=/api`
- `JWT_SECRET=<strong-secret>`
- `MONGO_URI=<mongodb-connection-string>` if you want a persistent database
- `CLIENT_URL=<your-admin-vercel-url>` to allow browser requests from the admin app

If the frontend is also on Vercel, set `VITE_ENABLE_REALTIME=false` for the admin app so it relies on polling instead of trying to open a Socket.IO connection that will never be served by the backend deployment.

## Environment

Use `.env.example` as the source of truth for required variables.

## Important Files

- `src/app.js`
- `src/server.js`
- `src/config/db.js`
- `src/routes/index.js`
- `src/socket/handlers.js`
- `src/services/queueEngine.js`

## Next Build Order

1. Add auth routes and JWT middleware.
2. Expose queue engine through persistent queue APIs.
3. Add rides, payments, drivers, admin, and disputes.
4. Expand tests from queue logic into route and integration coverage.
