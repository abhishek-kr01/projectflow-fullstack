# ProjectFlow — Full-Stack Project Management

ProjectFlow is a responsive team project-management application with projects, tasks, subtasks, team members, notes, project chat, notifications, presence, and live updates. The repository is a monorepo with a **Next.js + TypeScript frontend** and an **Express + TypeScript API** backed by **MongoDB/Mongoose**.

> **Project status:** active MVP / production-hardening in progress. The codebase includes the main workflows, but a complete dependency-installed production build and full end-to-end test suite must pass in your environment before describing the application as production-certified. Read [Testing and known limitations](#testing-and-known-limitations).

---

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [Frontend routes](#frontend-routes)
- [API reference](#api-reference)
- [Authentication and authorization](#authentication-and-authorization)
- [Realtime, chat, presence, and notifications](#realtime-chat-presence-and-notifications)
- [Email and password recovery](#email-and-password-recovery)
- [File uploads](#file-uploads)
- [Testing and known limitations](#testing-and-known-limitations)
- [Deploy to Render and Vercel](#deploy-to-render-and-vercel)
- [Troubleshooting](#troubleshooting)

## Features

### Workspace and projects

- Public responsive landing page with navigation, product overview, features, workflow, FAQ, calls to action, and footer.
- Authenticated workspace dashboard and global task tracker.
- Create, list, view, update, and delete projects.
- Add existing registered users to projects and manage their project roles.
- Project overview, project members, notes, tasks, and chat tabs.

### Tasks and subtasks

- Create and list project tasks.
- Update task details, status, and assignee according to role permissions.
- Delete tasks subject to server-side authorization.
- Create, update, and delete subtasks.
- Task status values are `todo`, `in_progress`, and `done`.
- Members can update the status of an assigned task, but cannot use that permission to change task title, description, or assignment. Administrative task operations are role-restricted.
- Task attachments are accepted via multipart form data; see [File uploads](#file-uploads).

### Collaboration

- Project-wide chat with persisted message history.
- Reply-to-message support and `@username` mentions.
- Message delivery/read receipts and online/offline presence indicators.
- Project notes with create, read, update, and delete operations.
- In-app notification bell, unread count, dropdown, and `/notifications` inbox.
- Notifications for relevant project, member, task/subtask, note, and chat activity.
- Live UI updates over authenticated Server-Sent Events (SSE).

### Account and security features

- Registration and login/logout.
- Current-user/session retrieval and access-token refresh.
- Email verification and resend verification flow.
- Forgot-password and reset-password flows.
- Change-password endpoint.
- Request validation, centralized API errors, project membership checks, and protected routes.

---

## Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js App Router, React, TypeScript | Pages, UI, routing, authenticated workspace |
| Styling | Tailwind CSS 4 | Responsive design and reusable visual styling |
| Icons | Lucide React | Interface icons |
| API | Node.js, Express 5, TypeScript | REST endpoints and SSE streams |
| Database | MongoDB, Mongoose | Users, projects, memberships, tasks, notes, messages, notifications |
| Auth | JWT, bcrypt, HTTP cookies where used by the API | Authentication and session refresh |
| Live transport | SSE (`EventSource`) + normal HTTP APIs | Server-to-browser event delivery; client writes remain HTTP requests |
| Email | Nodemailer via SMTP | Verification and password-recovery emails |
| Frontend hosting | Vercel | Next.js deployment |
| Backend hosting | Render | Express service deployment |

The application does not currently require a managed realtime service such as Pusher or Ably. Its current realtime fan-out is process-local; see the limitations below before running multiple API instances.

## Architecture

The backend follows a layered structure. Route files declare endpoints and middleware; controllers orchestrate HTTP requests/responses; services implement business rules and persistence workflows; Mongoose models define persisted data.

```text
Browser / Next.js
   |
   | REST requests (JSON / multipart)
   v
Express routes
   |
   v
Authentication / validation / project-access middleware
   |
   v
Controllers
   |
   v
Services -----------------------> MongoDB / Mongoose
   |
   +---- publish domain events --> in-process event bus
                                    |
                                    v
                              SSE controller/stream
                                    |
                                    v
                             Connected browsers
```

- **REST APIs** handle reads and writes.
- **MongoDB** is the persistent source of truth for application data.
- **SSE** pushes events to connected browsers without a manual page refresh.
- **The event bus is in-memory** in the current implementation. It is suitable for a single backend process; horizontal scaling requires a shared broker and shared presence storage.
- **Email is sent through SMTP**. A queue such as BullMQ is not currently part of this repository.

### Backend source layout

```text
backend/src/
├── controllers/    # HTTP request/response handlers
├── db/             # MongoDB connection
├── middlewares/    # Authentication, validation, uploads, error handling, SSE auth
├── models/         # Mongoose schemas
├── routes/         # Route declarations and middleware wiring
├── services/       # Business logic, access policy, notifications, presence, realtime
├── types/          # Express request type augmentation
├── utils/          # API response/error, mail, SSE helpers, constants
├── validators/     # Request validation rules
├── app.ts          # Express middleware and route registration
└── index.ts        # Environment loading, database startup, server lifecycle
```

### Frontend source layout

```text
frontend/
├── app/            # Next.js routes (public landing page at /)
│   └── (workspace)/
│       ├── dashboard/
│       ├── notifications/
│       ├── projects/
│       ├── tasks/
│       └── settings/
├── components/     # Auth shell, workspace shell, shared UI
├── lib/            # API client, auth context, types, authenticated SSE, project realtime bridge
└── public/         # Static assets, if any
```

---

## Requirements

- Node.js **20.9 or newer** (Node 22 LTS is a good choice).
- npm.
- MongoDB running locally or a MongoDB Atlas database.
- SMTP credentials for real verification and password-recovery email delivery.
- Git for version control.

Use a separate terminal for the backend and frontend.

## Run locally

### 1. Get the code

Clone your repository or extract your project folder, then open PowerShell/terminal in the repository root.

### 2. Configure and start the backend

PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
npm ci
```

macOS/Linux:

```bash
cd backend
cp .env.example .env
npm ci
```

Open `backend/.env`. At minimum, set a valid `MONGO_URI`, `ACCESS_TOKEN_SECRET`, and `REFRESH_TOKEN_SECRET`; set a separate `REALTIME_TOKEN_SECRET` as well. Use long, unique random secrets—do not leave the example values in place.

Start the API:

```bash
npm run dev
```

The API uses port `8000` locally by default. Confirm health at:

`http://localhost:8000/api/v1/healthcheck`

A successful response should indicate that the API is healthy. Database connectivity is logged by the backend when it starts.

### 3. Configure and start the frontend

Open a second terminal at the repository root.

PowerShell:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
```

macOS/Linux:

```bash
cd frontend
cp .env.example .env.local
npm ci
```

Set the API URL in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. Basic local smoke test

1. Open the landing page and register a user.
2. Verify email behavior using configured SMTP or the local email-preview logs.
3. Log in and create a project.
4. Register a second user in a separate browser profile, then add that user to the project.
5. Create a task and assign it to the second user.
6. Log in as the member and verify that they can change the assigned task status but not edit restricted task fields.
7. Open the project in two browser sessions and test chat, replies, mentions, receipts, online presence, notes, and notifications.
8. Test logout and password recovery.

---

## Environment variables

### Backend — `backend/.env`

Start from `backend/.env.example`.

| Variable | Required | Purpose / notes |
|---|---|---|
| `NODE_ENV` | Recommended | Use `development` locally and `production` on Render. |
| `PORT` | Local default | Local default is `8000`; Render sets a service port. |
| `MONGO_URI` | Yes | MongoDB connection string, local or Atlas. |
| `ACCESS_TOKEN_SECRET` | Yes | Random secret used to sign access tokens. |
| `ACCESS_TOKEN_EXPIRY` | Recommended | Access token lifetime; example is `15m`. |
| `REFRESH_TOKEN_SECRET` | Yes | Different random secret for refresh tokens. |
| `REFRESH_TOKEN_EXPIRY` | Recommended | Refresh token lifetime; example is `7d`. |
| `REALTIME_TOKEN_SECRET` | Strongly recommended | Dedicated secret for short-lived, scope-limited SSE stream tokens. The implementation may fall back to the access secret for compatibility, but production should set a separate value. |
| `FRONTEND_URL` | Production | Canonical frontend origin, such as `https://your-app.vercel.app`; no trailing slash. |
| `CORS_ORIGIN` | Yes for browser use | Comma-separated list of exact allowed frontend origins. Example: `http://localhost:3000`. Do not use `*` with credentialed CORS. |
| `SERVER_URL` | Recommended | Public API origin, such as `https://your-api.onrender.com`; used when constructing public file URLs. |
| `FORGOT_PASSWORD_REDIRECT_URL` | Email recovery | Frontend reset route base, such as `http://localhost:3000/reset-password`. |
| `MAILTRAP_SMTP_HOST` | For email delivery | SMTP hostname from the configured provider. Despite the variable name, use the SMTP values for the provider you configure. |
| `MAILTRAP_SMTP_PORT` | For email delivery | SMTP port from your provider, commonly `587` or `465`. |
| `MAILTRAP_SMTP_USER` | For email delivery | SMTP username. |
| `MAILTRAP_SMTP_PASS` | For email delivery | SMTP password. Keep secret. |
| `MAIL_FROM` | Recommended for email | Sender name/address accepted by your SMTP provider. |

Example local configuration (replace placeholder values with real values):

```env
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
SERVER_URL=http://localhost:8000
MONGO_URI=mongodb://127.0.0.1:27017/projectflow
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
REFRESH_TOKEN_EXPIRY=7d
REALTIME_TOKEN_SECRET=replace-with-a-third-long-random-secret
FORGOT_PASSWORD_REDIRECT_URL=http://localhost:3000/reset-password
MAILTRAP_SMTP_HOST=
MAILTRAP_SMTP_PORT=587
MAILTRAP_SMTP_USER=
MAILTRAP_SMTP_PASS=
MAIL_FROM=ProjectFlow <no-reply@example.com>
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Only put public, browser-safe values in variables prefixed by `NEXT_PUBLIC_`. Never put database URIs, token secrets, SMTP passwords, or provider API keys in frontend environment variables.

### Environment and secrets checklist

- Do not commit `.env`, `.env.local`, passwords, access tokens, or private API keys.
- `.env.example` files may be committed because they contain placeholders only.
- Use different access, refresh, and realtime signing secrets in production.
- Use HTTPS domains in production and configure exact origins in `CORS_ORIGIN`.
- After changing a Vercel `NEXT_PUBLIC_` variable, rebuild/redeploy the frontend.

---

## Frontend routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Public landing page | Public |
| `/login` | Sign in | Public |
| `/register` | Create account | Public |
| `/forgot-password` | Request password reset | Public |
| `/reset-password/[token]` | Set a new password using reset token | Public with valid token |
| `/verify-email/[token]` | Verify email | Public with valid token |
| `/dashboard` | Workspace overview | Authenticated |
| `/notifications` | Notification inbox and unread management | Authenticated |
| `/projects` | Browse projects | Authenticated |
| `/projects/[projectId]` | Project overview | Authenticated project member |
| `/projects/[projectId]/tasks` | Project Kanban/task list | Authenticated project member |
| `/projects/[projectId]/members` | Project members and roles | Authenticated project member; write actions role-restricted |
| `/projects/[projectId]/notes` | Project notes | Authenticated project member |
| `/projects/[projectId]/chat` | Project chat | Authenticated project member |
| `/tasks` | Cross-project task tracker | Authenticated |
| `/settings` | Account settings | Authenticated |

---

## API reference

Base URL: `http://localhost:8000/api/v1` locally. Production base URL is your Render service origin followed by `/api/v1`.

The API uses JSON responses with a consistent response envelope where applicable:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Request completed.",
  "data": {}
}
```

The exact `data` shape depends on the endpoint. Error responses set `success` to `false` and include a message.

### Health

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/healthcheck` | No | API health check |

### Authentication and account

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Register an account |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/logout` | Logout (authenticated) |
| `POST` | `/auth/current-user` | Get current user (authenticated) |
| `POST` | `/auth/refresh-token` | Refresh access token using configured refresh mechanism |
| `GET` | `/auth/verify-email/:verificationToken` | Verify email |
| `POST` | `/auth/resend-email-verification` | Resend verification email (authenticated) |
| `POST` | `/auth/forgot-password` | Request password-reset email |
| `POST` | `/auth/reset-password/:resetToken` | Reset password |
| `POST` | `/auth/change-password` | Change password (authenticated) |

### Projects and members

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/projects` | List the current user's projects |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects/:projectId` | Get a project the user can access |
| `PUT` | `/projects/:projectId` | Update project details; role-restricted |
| `DELETE` | `/projects/:projectId` | Delete a project; role-restricted |
| `GET` | `/projects/:projectId/members` | List project members |
| `POST` | `/projects/:projectId/members` | Add a registered user to the project; admin-restricted |
| `PUT` | `/projects/:projectId/members/:userId` | Update member role; admin-restricted |
| `DELETE` | `/projects/:projectId/members/:userId` | Remove a member; admin-restricted |

### Tasks and subtasks

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/tasks/:projectId` | List project tasks |
| `POST` | `/tasks/:projectId` | Create a task; task management roles required |
| `GET` | `/tasks/:projectId/t/:taskId` | Get task details |
| `PUT` | `/tasks/:projectId/t/:taskId` | Update task; a member can update status only for an assigned task |
| `DELETE` | `/tasks/:projectId/t/:taskId` | Delete task; role-restricted |
| `POST` | `/tasks/:projectId/t/:taskId/subtasks` | Create subtask |
| `PUT` | `/tasks/:projectId/st/:subTaskId` | Update subtask subject to server policy |
| `DELETE` | `/tasks/:projectId/st/:subTaskId` | Delete subtask; role-restricted |

Task creation accepts normal JSON. When attachments are included, the endpoint uses multipart form data with field name `attachments`.

### Notes

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/notes/:projectId` | List project notes |
| `POST` | `/notes/:projectId` | Create a note |
| `GET` | `/notes/:projectId/n/:noteId` | Get a note |
| `PUT` | `/notes/:projectId/n/:noteId` | Update a note subject to authorization |
| `DELETE` | `/notes/:projectId/n/:noteId` | Delete a note; role-restricted |

### Messages and receipts

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/messages/:projectId` | List project chat messages |
| `POST` | `/messages/:projectId` | Create a message; supports reply reference and mentions |
| `PUT` | `/messages/:projectId/:messageId` | Update a message subject to authorization |
| `DELETE` | `/messages/:projectId/:messageId` | Delete a message subject to authorization |
| `POST` | `/messages/:projectId/receipts` | Update message delivery/read receipts |

### Notifications

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/notifications` | List the current user's notifications |
| `PATCH` | `/notifications/read-all` | Mark all current user's notifications read |
| `PATCH` | `/notifications/projects/:projectId/messages/read` | Mark message notifications for a project read |
| `PATCH` | `/notifications/:notificationId/read` | Mark a notification read |
| `DELETE` | `/notifications/:notificationId` | Delete a notification owned by the current user |

### Realtime and presence

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/realtime/stream-token` | Mint a short-lived, scope-limited token for an SSE stream (authenticated) |
| `GET` | `/realtime/:projectId/events` | Stream project events; current project membership is validated |
| `GET` | `/realtime/users/notifications/events` | Stream user-specific notification events |
| `POST` | `/realtime/presence` | Create/update a browser-tab presence heartbeat or close a session |
| `GET` | `/realtime/:projectId/presence` | Fetch project member presence |

---

## Authentication and authorization

- Protected API routes use JWT authentication middleware.
- Project-scoped endpoints validate that the authenticated user belongs to the project.
- Roles include admin, project admin, and member; exact write permissions are enforced server-side.
- A regular project member can move the status of an assigned task, but cannot use the status permission to edit its title, description, or assignee.
- Members should only edit their own messages/notes where the configured service policy allows it; privileged roles have broader management permissions.
- SSE uses a short-lived, scope-limited token because native browser `EventSource` cannot set a custom bearer `Authorization` header. The backend validates token scope and current membership when opening a project stream.
- Never place long-lived access tokens in URLs. Avoid logging complete SSE request URLs because they contain short-lived stream tokens.

Review every authorization change in both frontend visibility rules and backend service/middleware policy. Hiding a button is not a substitute for server-side authorization.

---

## Realtime, chat, presence, and notifications

### How realtime works

1. The frontend calls the authenticated `POST /realtime/stream-token` endpoint.
2. The backend returns a short-lived token limited to the requested stream scope (and project where appropriate).
3. The frontend opens an `EventSource` connection with that stream token.
4. The backend validates token scope, user identity, and project membership.
5. When a relevant change is committed, the backend publishes an event to its in-process event bus.
6. The SSE controller writes the event to connected browsers; frontend subscribers update the UI or reload affected data.
7. Keep-alive heartbeats help maintain the connection, and the frontend reconnects with a fresh token when required.

Project SSE is centralized in the project layout and shared through `frontend/lib/project-realtime.ts`, avoiding separate project event streams per tab. The user-wide notification stream is handled by the workspace shell.

### Project chat

- Messages are persisted in MongoDB.
- Project members receive new messages live while connected.
- Reply references must point to a message in the same project conversation.
- Mention targets must be valid members of that project.
- Message receipt state tracks delivered/read recipients; in a multi-member project, the all-delivered/all-read state can remain pending while a relevant member is offline or has not opened the chat.
- Opening the project chat marks the project's older message notifications as read. If a user is actively viewing that project's chat, new messages do not create redundant bell entries for that same chat; notification behavior for other events/projects remains enabled.

### Presence

Presence uses heartbeats from browser tabs/sessions. Multiple tabs should not mark a user offline while another tab is still active. A stale session is expired after the configured timeout/sweep interval, so online/offline is an approximation of active application sessions—not proof that a person is looking at the screen.

### Notification inbox

Notifications are persisted in MongoDB and the header bell receives live user-specific notification events. The `/notifications` page provides the full inbox. Notification actions should be tested with at least two accounts because a user's own action is generally not intended to create a notification for that same user.

### Current realtime scale limit

The event bus and presence registry are process-local. This supports a single API process. If multiple Render instances are introduced, they will not automatically share local events or presence; add a shared broker/store (for example Redis Pub/Sub plus shared presence/TTL storage) or an appropriate Socket.IO adapter before horizontally scaling.

---

## Email and password recovery

The backend sends email via Nodemailer and SMTP. Configure `MAILTRAP_SMTP_HOST`, `MAILTRAP_SMTP_PORT`, `MAILTRAP_SMTP_USER`, `MAILTRAP_SMTP_PASS`, and a valid `MAIL_FROM` for a real provider. The variable names are retained from the current project configuration; the values must match the SMTP provider you actually use.

- Local development without working SMTP may log an email preview rather than deliver a real email.
- Production verification/reset links must use the correct public frontend URLs.
- Verify sender/domain authentication with your provider before public release.
- Use random, expiring, single-use verification/reset tokens and ensure they are invalidated after use.
- Email delivery is not guaranteed to be instantaneous. For durable retries/high-volume sends, a background queue (e.g. BullMQ + Redis) is a future enhancement; it is not currently included as an active queue in this repository.
- Provider webhooks for delivered/bounced/complained events are also a future integration; they are not the same as the app's internal domain events.

---

## File uploads

Task attachment uploads use multipart form data with field name `attachments`, with up to five attachments accepted by the current route/middleware configuration. The current application stores uploads on the backend filesystem for local development.

**Before relying on attachments in production, configure durable object storage** (for example S3 or Cloudinary) or a properly configured persistent disk. Render's ordinary local filesystem should be treated as ephemeral across deploys/restarts. Protect upload routes, validate file type/size server-side, and avoid exposing private attachments through an unprotected public static directory.

---

## Useful scripts

### Backend (`cd backend`)

```bash
npm run dev        # Run TypeScript source with tsx watch
npm run typecheck  # TypeScript typecheck without emitting
npm test           # Focused realtime/SSE/token/task-policy tests
npm run build      # Compile TypeScript to backend/dist
npm start          # Run compiled production server
```

### Frontend (`cd frontend`)

```bash
npm run dev        # Next.js development server
npm run typecheck  # TypeScript typecheck
npm run lint       # ESLint
npm run build      # Next.js production build
npm start          # Run production server after build
```

Use the package-local lockfiles and `npm ci` for reproducible installs. If you deliberately change dependencies, run `npm install` in that package and commit the updated corresponding lockfile.

## Testing and known limitations

Before a release, run checks from both package directories.

Backend:

```bash
cd backend
npm ci
npm run typecheck
npm test
npm run build
```

Frontend (new terminal):

```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm run build
```

Then perform a two-browser manual test:

1. Register/login as two users and add both to the same project.
2. Change an assigned task's status and ensure permissions reject unauthorized task-field edits.
3. Send chat messages; test reply references and `@mentions`.
4. Check delivered/read ticks and online/offline indicators.
5. Verify the other user's bell and `/notifications` inbox update without page refresh.
6. Open chat and confirm redundant same-project message notifications are suppressed.
7. Create/update notes, add/remove members, and verify project access is revoked correctly after removal.
8. Test email verification, resend verification, forgot-password and reset-password with real SMTP credentials.
9. Test refresh token expiry, stream-token expiry/reconnection, CORS, logout, mobile UI and keyboard accessibility.

Known limitations to address before a public launch:

- Full production parity with Jira is not claimed; this is a full-stack MVP.
- The in-process realtime event bus and presence registry do not coordinate multiple backend instances.
- Local filesystem uploads are not durable on ephemeral hosts.
- Frontend bearer tokens stored in `localStorage` increase the impact of XSS. Consider a hardened same-site `httpOnly` cookie/BFF session architecture with CSRF protections as appropriate.
- Native SSE uses a short-lived token in the connection URL. Keep the TTL short, never log full URLs, verify stream scope, and consider a hardened cookie/BFF stream-auth strategy for public production.
- No active Redis-backed queue/cache or transactional outbox is included. Add these only when the desired reliability/scale requirements call for them, and design idempotency/retry behavior.
- Ensure production secrets, email sender/domain, CORS origins, database indexes, and file storage are configured and tested.

Do not declare the system production-ready solely because the frontend renders or the backend health endpoint responds. Run the package builds and verify the real user workflows above.

---

## Deploy to Render and Vercel

The frontend and backend live in the same GitHub repository but deploy as separate services.

### Deploy the backend to Render

1. Push the repository to GitHub.
2. In Render, create a **Web Service** from the repository.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to:

   ```bash
   npm ci && npm run build
   ```

5. Set **Start Command** to:

   ```bash
   npm start
   ```

6. Use Node.js 20.9+.
7. Configure all production environment variables from the backend table. Use MongoDB Atlas or another database reachable by Render.
8. Set `CORS_ORIGIN` to the exact deployed Vercel origin (no trailing slash), `FRONTEND_URL` to the frontend origin, `SERVER_URL` to the Render API origin, and `FORGOT_PASSWORD_REDIRECT_URL` to the frontend reset-password base URL.
9. Deploy and check `https://YOUR-RENDER-SERVICE.onrender.com/api/v1/healthcheck`.
10. Review Render logs for MongoDB, SMTP, token-secret, upload, and CORS configuration errors.

### Deploy the frontend to Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend` and use the Next.js preset.
3. Add the production environment variable:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
   ```

4. Deploy the frontend.
5. Copy the real Vercel origin and update Render's `CORS_ORIGIN` and `FRONTEND_URL`. Configure `FORGOT_PASSWORD_REDIRECT_URL` with the frontend's `/reset-password` base path.
6. Redeploy the backend after changing Render environment variables. Redeploy the frontend after changing `NEXT_PUBLIC_API_BASE_URL`.
7. Test the health endpoint and the registration, login, project creation, member permissions, task updates, notes, chat, notifications, password recovery, and logout flows against the deployed services.

If using both preview and production Vercel domains, add only the exact origins you intend to allow to `CORS_ORIGIN`. For credentialed CORS, do not use wildcard `*`.

---

## Troubleshooting

### Frontend shows “Cannot reach API” or browser console reports CORS

- Confirm the backend is running and `http://localhost:8000/api/v1/healthcheck` responds.
- Confirm `frontend/.env.local` has `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`.
- Confirm `backend/.env` has `CORS_ORIGIN=http://localhost:3000` (comma-separated exact origins are supported).
- Restart the backend after modifying `backend/.env`; restart Next.js after modifying `frontend/.env.local`.
- Use the same hostname consistently: `localhost` and `127.0.0.1` are different browser origins.

### Chat shows “Connecting” forever

- Inspect the browser Network tab for the `POST /api/v1/realtime/stream-token` request and the corresponding SSE request.
- Confirm access token, `REALTIME_TOKEN_SECRET`, stream scope and current project membership are valid.
- Inspect backend logs for stream-token validation and authorization errors.
- Confirm the deployed proxy/host allows long-lived SSE responses and is not buffering them.
- Use a fresh login after changing token-secret configuration.

### Live updates do not appear in another browser

- Make sure both users are project members and are connected to the same backend instance.
- Confirm the event-producing API request succeeded.
- Confirm the SSE stream is open (not pending a failed connection) and reconnects after expiry.
- If deploying multiple backend instances, local in-memory events will not propagate between them until a shared event broker is implemented.

### Email links do not arrive

- Verify SMTP values and sender address with the provider.
- Check spam/junk and provider logs.
- Confirm `FRONTEND_URL` and `FORGOT_PASSWORD_REDIRECT_URL` use the deployed frontend domain and expected path.
- Confirm the sender domain is authenticated with the provider.

### Build or typecheck fails

- Verify Node.js is 20.9+ (`node --version`).
- Run `npm ci` separately inside `backend` and `frontend`.
- Run the failing command from its package directory and read the first actual TypeScript/ESLint error (not only the final summary).
- Avoid installing packages at the monorepo root unless a root `package.json` is intentionally introduced.
