# Backend Guide

## Stack
- Express 5
- TypeScript
- SQLite via `sqlite3`
- JWT authentication
- Zod request validation
- `dotenv` for environment loading at server startup

## Entry Points
- App setup: `src/app.ts`
- HTTP server: `src/server.ts`
- Database bootstrap: `src/db/index.ts`
- SQLite promise helpers: `src/db/sqlite.ts`
- JWT helpers and token typing: `src/utils/jwt.ts`

## Current Architecture
- `src/routes/`: route registration and middleware composition
- `src/controllers/`: request/response handling
- `src/services/`: database-facing business logic
- `src/middleware/`: auth, role checks, validation, error handling
- `src/schemas/`: Zod schemas
- `src/utils/`: shared helpers such as JWT utilities
- `src/errors/`: app-specific error types
- `src/db/sqlite.ts`: promise wrappers for `sqlite3` callback APIs (`dbRun`, `dbGet`, `dbAll`)

## Conventions
- Keep routes thin. Mount middleware and hand off to controllers.
- Keep controllers focused on HTTP concerns and delegation to services.
- Put SQLite query logic in services, not in routes.
- Prefer the helpers in `src/db/sqlite.ts` over writing raw `new Promise(...)` wrappers around `db.run`, `db.get`, and `db.all` in each service.
- Reuse `AuthRequest` for handlers that depend on authenticated user context.
- Prefer throwing `AppError` for expected failures instead of mixing ad hoc response handling across controllers.
- Use parameterized SQL queries only.
- Services should decide domain outcomes such as `404 not found`, `403 forbidden`, and `409 conflict`; controllers should mostly translate validated input into service calls.
- Keep controller `req.body` and `req.params` typed from Zod schema exports where practical.
- Prefer shared JWT payload types and runtime guards over `any` casts in auth code.

## Existing Behavior To Preserve
- `/auth` exposes register and login endpoints.
- `/users/me` requires auth.
- `/users` requires `ADMIN`.
- `/tasks` requires auth for all current endpoints.
- Non-admin users should only access their own tasks; admins can access all tasks.
- Task update/delete semantics currently distinguish:
- `404` when the task does not exist
- `403` when the task exists but the current non-admin user does not own it
- Auth registration currently returns `409` when the email already exists.
- Auth/login invalid credentials return `401`.
- The backend now requires `JWT_SECRET`; it no longer falls back to a default secret.

## Validation And Errors
- Auth register/login use route-level Zod validation.
- Task create uses route-level body validation.
- Task update uses route-level param validation and body validation.
- Task delete uses route-level param validation.
- When adding new write endpoints, add schema validation close to the route layer.
- Keep error handling consistent with `errorMiddleware` instead of returning inconsistent inline `500` responses.
- Prefer removing unreachable defensive branches once a service contract is clear.
- Validation errors can include structured `details`, so preserve that response shape when improving the middleware.

## Data Layer Notes
- Schema creation happens on startup in `src/db/index.ts`.
- Database path resolves to `backend/database.sqlite`.
- Be careful with schema changes because there is no migration system yet.
- Because the schema is bootstrapped at runtime instead of through migrations, structural changes should be made deliberately and tested against a fresh database.

## Commands
- Install deps: `npm install`
- Start dev server: `npm run dev`
- Reset local DB: `npm run reset-db`
- Typecheck: `npx tsc --noEmit`
- Ensure a backend `.env` provides `JWT_SECRET` before starting the server.

## Implementation Guidance
- If you add new auth-dependent endpoints, check both token parsing and role enforcement paths.
- If you change response payloads, inspect frontend pages that consume them.
- If you touch task status logic, keep allowed status values aligned with the frontend select options.
- If you add new DB reads/writes, keep the low-level SQLite interaction inside services and use the promise helpers.
- If you introduce new auth or task states, update both service-level status handling and route-level validation.
- If you add new schemas, export the inferred TypeScript types and use them in controllers.
