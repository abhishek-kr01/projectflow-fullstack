# ProjectFlow

ProjectFlow is a full-stack project management and team collaboration application. It combines project organization, task tracking, project notes, team chat, presence, and in-app notifications in a responsive workspace.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Application architecture](#application-architecture)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment configuration](#environment-configuration)
- [Run locally](#run-locally)
- [Application routes](#application-routes)
- [Backend API reference](#backend-api-reference)
- [Roles and permissions](#roles-and-permissions)
- [Realtime behavior](#realtime-behavior)
- [Email configuration](#email-configuration)
- [Task attachments](#task-attachments)
- [Testing and verification](#testing-and-verification)
- [Deploy the backend to Render](#deploy-the-backend-to-render)
- [Deploy the frontend to Vercel](#deploy-the-frontend-to-vercel)
- [Troubleshooting](#troubleshooting)
- [Current limitations](#current-limitations)

## Features

### Authentication and account management

- User registration and login.
- JWT access and refresh token handling.
- Email verification and verification resend flow.
- Forgot-password and reset-password flows.
- Change-password and logout endpoints.
- Protected application routes and authenticated API requests.

Email flows require a working SMTP configuration. See [Email configuration](#email-configuration).

### Projects and team management

- Create and view projects.
- Edit or delete projects according to the configured role permissions.
- Add existing users to a project.
- View project members and their roles.
- Update member roles or remove members according to authorization rules.
- Check project membership on protected operations.

### Tasks and subtasks

- Create, list, view, update, and delete tasks according to the role policy.
- Assign tasks to project members.
- Track task status using `todo`, `in_progress`, and `done`.
- Create and update subtasks.
- Attach files while creating tasks.
- Receive project events when tasks or subtasks change.

### Project notes

- Create, list, view, and update notes in a project.
- Delete notes according to the configured permission rules.
- Refresh connected project views when a note changes.

### Project chat

- Persistent messages stored in MongoDB.
- Reply to a message in the same project conversation.
- Mention project members using `@username`.
- Edit or delete messages according to the message-author and project-role rules.
- Delivery and read receipts with single, double, and read ticks in the UI.
- Live messages and receipt updates through the project event stream.

### Notifications and presence

- Notification bell and a dedicated notification inbox.
- Unread count and notification list.
- Mark one notification as read, mark all as read, and delete notifications.
- Notifications for supported project, task, chat, notes, membership, and assignment events.
- Online/offline indicators and last-seen information based on browser-session heartbeats.
- Live event delivery to connected browsers without manual refresh while the realtime connection is healthy.

### Responsive interface

- Public landing page and authentication pages.
- Workspace dashboard and task tracker.
- Project overview, tasks, members, notes, and chat pages.
- Account settings and notification inbox.
- Responsive layouts for desktop and smaller screens.

## Technology stack

| Area | Technology | Purpose |
|---|---|---|
| Frontend framework | Next.js App Router | Pages, layouts, routing, and frontend build |
| UI | React | Interactive components and local UI state |
| Frontend language | TypeScript | Type checking and maintainable interfaces |
| Styling | Tailwind CSS | Responsive layouts and UI styling |
| Backend runtime | Node.js | Runs the API server |
| Backend framework | Express 5 | HTTP routes, middleware, and controllers |
| Backend language | TypeScript | Typed backend services and request handling |
| Database | MongoDB | Persistent application data |
| Database layer | Mongoose | Schemas, models, queries, and population |
| Authentication | JSON Web Tokens (JWT) | Authenticated API requests and stream-token flow |
| Realtime transport | Server-Sent Events (SSE) | Server-to-browser events over HTTP |
| Email | Nodemailer over SMTP | Verification and password-reset emails |
| Validation | express-validator | Request validation on supported endpoints |
| Uploads | Multer | Multipart task attachment handling |
| Icons | lucide-react | Frontend icons |

## Application architecture

The frontend and backend are separate applications and can be run and deployed independently.

### Backend request flow

A typical API operation follows this sequence:

1. A route maps the HTTP method and URL to middleware and a controller.
2. Authentication middleware verifies the user where required.
3. Validation middleware checks request input on routes that define validators.
4. Project authorization checks membership and the role allowed to perform the operation.
5. The controller handles HTTP-specific input and response formatting.
6. A service implements business rules and performs data operations.
7. Mongoose models read or write MongoDB records.
8. For supported changes, the service publishes an event and/or creates notifications.
9. The API returns a JSON response using the shared response/error conventions.

### Realtime flow

ProjectFlow uses ordinary HTTP APIs for commands such as creating a message or changing task status. The backend persists the change first, then publishes an in-process event to connected SSE clients. The frontend receives the event and updates the relevant state or reloads the affected data.

Two stream scopes are used:

- **Project stream:** task, note, member, chat, receipt, and other project-scoped events.
- **User notification stream:** notifications for the currently authenticated user, regardless of the project page currently open.

A short-lived realtime stream token is requested through the authenticated API and used to authorize browser event streams. Project access is checked by the backend before a project stream is opened.

### Why SSE is used

Server-Sent Events are a browser-supported way for the server to stream events to a client over HTTP. The browser uses `EventSource` to receive server events, while writes continue to use regular HTTP requests. This keeps the current architecture straightforward for task updates, notifications, message events, and presence refreshes.

SSE is one-way from server to browser. The browser sends chat messages, receipt updates, and presence heartbeats through normal API requests.

## Project structure

```text
projectflow-fullstack/
├── backend/
│   ├── public/images/              # Local task-upload directory
│   ├── src/
│   │   ├── controllers/            # HTTP request/response orchestration
│   │   ├── db/                     # MongoDB connection
│   │   ├── middlewares/            # Authentication, stream auth, upload, validation, errors
│   │   ├── models/                 # Mongoose schemas and models
│   │   ├── routes/                 # API route definitions
│   │   ├── services/               # Business logic and data operations
│   │   ├── types/                  # Express and backend TypeScript types
│   │   ├── utils/                  # API responses, errors, mail, SSE, and shared helpers
│   │   ├── validators/             # Request validation rules
│   │   ├── app.ts                  # Express app and route mounting
│   │   └── index.ts                # Environment loading, DB connection, server startup
│   ├── tests/                      # Focused backend tests
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                        # Next.js pages and layouts
│   ├── components/                 # Shared UI, auth, and dashboard components
│   ├── lib/                        # API client, auth context, types, SSE helpers
│   ├── public/                     # Static frontend assets
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
└── README.md
```

### Backend layer responsibilities

| Layer | Responsibility |
|---|---|
| `routes/` | Define endpoints and connect middleware/controllers |
| `controllers/` | Parse HTTP input, call services, and return responses |
| `services/` | Apply business rules, data changes, authorization-related workflows, and event publication |
| `models/` | Define MongoDB document structure and indexes |
| `middlewares/` | Authentication, stream-token authentication, validation, uploads, and error handling |
| `validators/` | Validate supported request bodies and parameters |
| `utils/` | Shared low-level helpers such as API errors, API responses, mail and SSE handling |

## Prerequisites

- **Node.js 20.9 or newer**.
- npm, which is included with Node.js.
- MongoDB running locally or a MongoDB Atlas database.
- SMTP credentials if you want to send real verification and password-reset emails.
- A modern browser for the Next.js frontend and SSE functionality.

Check your installed versions:

```bash
node --version
npm --version
```

## Environment configuration

The repository contains example environment files. Copy them to local environment files and replace placeholders with your actual values. Do not put real keys in frontend environment variables.

### Backend environment: `backend/.env`

Create the file from `backend/.env.example`.

**Windows PowerShell**

```powershell
cd backend
Copy-Item .env.example .env
```

**macOS/Linux**

```bash
cd backend
cp .env.example .env
```

Configure these values:

| Variable | Required/use | Description |
|---|---|---|
| `NODE_ENV` | Recommended | `development` locally; use `production` on the hosted backend |
| `PORT` | Optional | API port; defaults to `8000` in the current configuration |
| `FRONTEND_URL` | Required for links | Base URL used in links sent to users; local value is `http://localhost:3000` |
| `CORS_ORIGIN` | Required | Exact browser origin(s) permitted to call the API, separated by commas if more than one |
| `SERVER_URL` | Required for links | Base URL of the backend API/server |
| `MONGO_URI` | Required | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | Required | Long, random secret used to sign access tokens |
| `ACCESS_TOKEN_EXPIRY` | Required/configurable | Access-token lifetime, for example `15m` |
| `REFRESH_TOKEN_SECRET` | Required | A different long, random secret for refresh tokens |
| `REFRESH_TOKEN_EXPIRY` | Required/configurable | Refresh-token lifetime, for example `7d` |
| `REALTIME_TOKEN_SECRET` | Recommended | Dedicated secret used to sign short-lived realtime stream tokens |
| `FORGOT_PASSWORD_REDIRECT_URL` | Required for reset links | Frontend route that receives password-reset tokens |
| `MAILTRAP_SMTP_HOST` | Optional until email is tested | SMTP server hostname; the variable name is retained by the current project |
| `MAILTRAP_SMTP_PORT` | Optional until email is tested | SMTP port, commonly `587` for STARTTLS where supported |
| `MAILTRAP_SMTP_USER` | Optional until email is tested | SMTP username |
| `MAILTRAP_SMTP_PASS` | Optional until email is tested | SMTP password or SMTP credential |
| `MAIL_FROM` | Required for email sending | Sender display name and email address |

Example local values (replace secrets and SMTP values with your own):

```env
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
SERVER_URL=http://localhost:8000
MONGO_URI=mongodb://127.0.0.1:27017/projectflow
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
REFRESH_TOKEN_EXPIRY=7d
REALTIME_TOKEN_SECRET=replace-with-another-long-random-secret
FORGOT_PASSWORD_REDIRECT_URL=http://localhost:3000/reset-password
MAILTRAP_SMTP_HOST=
MAILTRAP_SMTP_PORT=587
MAILTRAP_SMTP_USER=
MAILTRAP_SMTP_PASS=
MAIL_FROM=ProjectFlow <no-reply@example.com>
```

Use three different random values for the access-token, refresh-token, and realtime-token secrets. The strings in this example are placeholders and must not be used as production secrets. Keep local `.env` files out of version control.

### Frontend environment: `frontend/.env.local`

Create the file from `frontend/.env.example`.

**Windows PowerShell**

```powershell
cd frontend
Copy-Item .env.example .env.local
```

**macOS/Linux**

```bash
cd frontend
cp .env.example .env.local
```

Set the full API URL, including the versioned route prefix:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Any environment variable beginning with `NEXT_PUBLIC_` is exposed to browser code. Only put public configuration values there; never put MongoDB credentials, SMTP passwords, or signing secrets in frontend variables.

## Run locally

Run the backend and frontend in separate terminals.

### 1. Install and start the backend

From the repository root:

```powershell
cd backend
npm ci
npm run dev
```

If you have not created `backend/.env`, copy `.env.example` first and configure MongoDB and the token secrets. `npm ci` uses the backend lockfile to install the recorded dependency versions.

Expected startup behavior includes a successful MongoDB connection and the API listening on the configured port.

Check the health endpoint:

`http://localhost:8000/api/v1/healthcheck`

The root API path also returns basic service information at `http://localhost:8000/`.

### 2. Install and start the frontend

Open another terminal from the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

If you have not created `frontend/.env.local`, copy `.env.example` first and set `NEXT_PUBLIC_API_BASE_URL`.

Open the app at `http://localhost:3000`.

### 3. First use

1. Register a user using `/register`.
2. If email verification is enabled and SMTP is configured, use the verification link received by email. If email is not configured, email-based flows cannot be fully tested through a real inbox.
3. Log in at `/login`.
4. Create a project and add another registered user as a project member.
5. Open the project pages to test tasks, notes, members, chat, and notifications.
6. For realtime behavior, open the same project using two different browser sessions signed in as different project members.

## Application routes

| Route | Page |
|---|---|
| `/` | Landing page |
| `/login` | Sign in |
| `/register` | Account registration |
| `/forgot-password` | Request password reset |
| `/reset-password/[token]` | Set a new password using a reset token |
| `/verify-email/[token]` | Verify an email address |
| `/dashboard` | Workspace overview |
| `/projects` | Project list |
| `/projects/[projectId]` | Project overview |
| `/projects/[projectId]/tasks` | Project task board |
| `/projects/[projectId]/members` | Project members and roles |
| `/projects/[projectId]/notes` | Project notes |
| `/projects/[projectId]/chat` | Project conversation |
| `/tasks` | Task tracker |
| `/notifications` | Notification inbox |
| `/settings` | Account settings |

## Backend API reference

Local base URL:

`http://localhost:8000/api/v1`

All routes below are relative to that base URL. Routes marked as authenticated require the appropriate access token. Project endpoints additionally check project membership and role permissions.

### Health check

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/healthcheck` | Check API health |

### Authentication — `/auth`

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create a user account |
| `POST` | `/auth/login` | Authenticate a user |
| `GET` | `/auth/verify-email/:verificationToken` | Verify an email token |
| `POST` | `/auth/refresh-token` | Request a refreshed access token using the configured refresh flow |
| `POST` | `/auth/forgot-password` | Request a password-reset email |
| `POST` | `/auth/reset-password/:resetToken` | Reset password using a token |
| `POST` | `/auth/logout` | Log out an authenticated user |
| `POST` | `/auth/current-user` | Get the current user |
| `POST` | `/auth/change-password` | Change the current user's password |
| `POST` | `/auth/resend-email-verification` | Resend verification email |

### Projects and members — `/projects`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/projects` | List projects available to the user |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects/:projectId` | Fetch project details |
| `PUT` | `/projects/:projectId` | Update project details, subject to the configured role policy |
| `DELETE` | `/projects/:projectId` | Delete a project, subject to the configured role policy |
| `GET` | `/projects/:projectId/members` | List project members |
| `POST` | `/projects/:projectId/members` | Add registered users to a project |
| `PUT` | `/projects/:projectId/members/:userId` | Update a member role |
| `DELETE` | `/projects/:projectId/members/:userId` | Remove a member |

### Tasks and subtasks — `/tasks`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/tasks/:projectId` | List project tasks |
| `POST` | `/tasks/:projectId` | Create a task and optionally upload attachments |
| `GET` | `/tasks/:projectId/t/:taskId` | Fetch task details |
| `PUT` | `/tasks/:projectId/t/:taskId` | Update an allowed task field; members are restricted to status-only updates by the task policy |
| `DELETE` | `/tasks/:projectId/t/:taskId` | Delete a task, subject to the configured role policy |
| `POST` | `/tasks/:projectId/t/:taskId/subtasks` | Create a subtask |
| `PUT` | `/tasks/:projectId/st/:subTaskId` | Update a subtask |
| `DELETE` | `/tasks/:projectId/st/:subTaskId` | Delete a subtask, subject to the configured role policy |

Task status values used by the backend are `todo`, `in_progress`, and `done`.

### Project notes — `/notes`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/notes/:projectId` | List notes in a project |
| `POST` | `/notes/:projectId` | Create a note |
| `GET` | `/notes/:projectId/n/:noteId` | Get one note |
| `PUT` | `/notes/:projectId/n/:noteId` | Update a note |
| `DELETE` | `/notes/:projectId/n/:noteId` | Delete a note, subject to the configured role policy |

### Project messages — `/messages`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/messages/:projectId` | List project chat messages; supports the implemented query filters such as task context and limit |
| `POST` | `/messages/:projectId` | Send a message; supports reply and mention data |
| `POST` | `/messages/:projectId/receipts` | Update delivered/read receipts for messages |
| `PUT` | `/messages/:projectId/:messageId` | Edit a message according to author/role permissions |
| `DELETE` | `/messages/:projectId/:messageId` | Delete a message according to author/role permissions |

### Realtime and presence — `/realtime`

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/realtime/stream-token` | Issue a short-lived token for a specific realtime stream scope |
| `GET` | `/realtime/users/notifications/events` | SSE stream for the authenticated user's notification events |
| `POST` | `/realtime/presence` | Send a browser-session presence heartbeat or mark that session offline |
| `GET` | `/realtime/:projectId/presence` | Get presence information for project members |
| `GET` | `/realtime/:projectId/events` | Open a project-scoped SSE event stream |

### Notifications — `/notifications`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/notifications` | List the current user's notifications |
| `PATCH` | `/notifications/read-all` | Mark all notifications as read |
| `PATCH` | `/notifications/projects/:projectId/messages/read` | Mark project chat notifications as read |
| `PATCH` | `/notifications/:notificationId/read` | Mark one notification as read |
| `DELETE` | `/notifications/:notificationId` | Delete one notification |

The route source files under `backend/src/routes/` remain the source of truth for exact request schemas, optional parameters, and response payloads.

## Roles and permissions

The application defines these project roles:

| Role | General purpose |
|---|---|
| `admin` | Administrative operations allowed by the application policy |
| `project_admin` | Project-level management operations allowed by the application policy |
| `member` | Collaborates on projects and performs permitted task and collaboration actions |

The backend enforces permissions; frontend visibility is not a substitute for server-side authorization. Under the current task policy, a member can submit a status-only task update using one of `todo`, `in_progress`, or `done`. Members cannot use that status operation to change task title, assignee, or other management fields. Project and task create/delete operations have more restrictive role requirements defined in the route middleware and task policy service.

When updating roles or permission rules, check both `backend/src/middlewares/auth.middleware.ts`, `backend/src/services/task-policy.service.ts`, and the corresponding frontend UI controls.

## Realtime behavior

### Project events

The project layout owns the project event stream and shares connection state/events with child tabs. This avoids opening a separate project SSE stream from every tab. Supported project events include message changes and receipts, task/subtask changes, note changes, member changes, and other project updates published by the backend.

### Notification events

The workspace dashboard shell owns a user-level notification stream. When a notification is created for the current user, the frontend can update the bell badge and notification inbox while connected.

### Message receipts

- A single tick indicates that the message was saved successfully.
- Double ticks indicate delivery to the relevant other participants according to the current receipt implementation.
- Blue ticks indicate that the relevant recipients have been marked as having read the message.

Read receipts show application-level read state; they cannot prove that a person actually read or understood the message.

### Presence

The browser periodically sends a presence heartbeat. The backend tracks active browser sessions and infers offline status when a session stops reporting. This is a session-based estimate, not a guarantee that a person is actively looking at the application.

### Realtime deployment notes

The current realtime event bus and presence registry are process-local. Live updates are designed for a single backend process. If the backend runs multiple instances, a shared event broker and shared presence store are needed to synchronize events and status across instances. SSE reconnection also cannot recover every event that happened while a browser was disconnected; the frontend should refetch persisted data on reconnect where necessary.

## Email configuration

Email verification and password recovery use Nodemailer and the SMTP settings in `backend/.env`. The variable names currently use the `MAILTRAP_SMTP_*` prefix, but they represent ordinary SMTP configuration values for the chosen provider.

1. Create or use an SMTP-enabled email account/provider.
2. Configure host, port, username, password, and sender in `backend/.env`.
3. Ensure the sender address is accepted by the provider.
4. Register a test user and check the destination mailbox and spam folder.
5. Test the verification link and forgot-password/reset flow.

For a hosted deployment, configure the frontend URL and `FORGOT_PASSWORD_REDIRECT_URL` with the deployed frontend origin. Email delivery timing depends on the SMTP provider and recipient mail system. Email sending is separate from in-app SSE notifications.

## Task attachments

Task creation accepts multipart uploads through Multer. The current application uses the backend's local `public/images` directory for uploaded files. This is appropriate for local development, but a hosted service may have an ephemeral filesystem. If uploaded files must persist across service restarts or redeployments, configure durable file storage and update the upload/read flow accordingly.

## Testing and verification

Run commands from the relevant package directory.

### Backend scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run the API in development mode with `tsx watch` |
| `npm run typecheck` | Type-check the backend without emitting output |
| `npm test` | Run the configured focused event/SSE/token/task-policy tests |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm start` | Run the compiled backend |

Commands:

```bash
cd backend
npm run typecheck
npm test
npm run build
```

### Frontend scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run the Next.js development server |
| `npm run typecheck` | Type-check TypeScript files |
| `npm run lint` | Run ESLint |
| `npm run build` | Build the Next.js application |
| `npm start` | Serve the built Next.js application |

Commands:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

### Manual two-user test

Use two different browser profiles or one normal window plus an incognito window. Sign in as two different users who belong to the same project.

1. Send a project chat message and confirm it appears in the other session without a manual refresh.
2. Reply to a message and mention a project member.
3. Check message delivery/read ticks by receiving and opening the conversation in the other session.
4. Change a task status as a member and check that the other session receives the update.
5. Create or edit a project note and check the connected project view.
6. Trigger a task assignment or mention and check the notification bell/inbox.
7. Open the Members page and compare online/offline status while both browser sessions are connected.
8. Stop one browser session and wait for the presence timeout; confirm the user eventually becomes offline.

## Deploy the backend to Render

The backend and frontend can be deployed separately. Deploying does not remove the need to configure MongoDB access, CORS, token secrets, SMTP, and file storage.

1. Ensure the code has been pushed to your Git hosting provider.
2. Create a Render Web Service and connect the repository.
3. Set the **Root Directory** to `backend`.
4. Set the **Build Command** to:

   ```bash
   npm ci && npm run build
   ```

5. Set the **Start Command** to:

   ```bash
   npm start
   ```

6. Configure the backend environment variables in Render. Use the Render backend URL for `SERVER_URL` and the deployed frontend URL for `FRONTEND_URL`, `CORS_ORIGIN`, and `FORGOT_PASSWORD_REDIRECT_URL` as appropriate.
7. Add the MongoDB Atlas connection string as `MONGO_URI`. Confirm Atlas network access permits the backend to connect.
8. Generate distinct, long random values for `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and `REALTIME_TOKEN_SECRET`.
9. Add SMTP credentials if email verification or password recovery needs to work on the hosted environment.
10. After deployment, open `https://YOUR-API-DOMAIN/api/v1/healthcheck` and confirm the health response succeeds.

For CORS, use the exact origin including scheme, for example `https://your-app.vercel.app`. Do not add a trailing slash. If you want more than one allowed frontend origin, separate the exact origins with commas. Review CORS rules carefully before allowing preview domains.

## Deploy the frontend to Vercel

1. Import the repository into Vercel.
2. Set the **Root Directory** to `frontend`.
3. Add the environment variable:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://YOUR-API-DOMAIN/api/v1
   ```

4. Deploy the frontend.
5. Copy the actual Vercel frontend origin into the backend's `CORS_ORIGIN` and `FRONTEND_URL` configuration, and set the password-reset redirect URL to the frontend's reset route.
6. Redeploy/restart the backend after changing its environment variables.
7. Test registration, login, refresh token behavior, project membership, tasks, chat, notifications, presence, and email links on the deployed domains.

Use your real Render and Vercel URLs in place of the examples. `NEXT_PUBLIC_API_BASE_URL` is public browser configuration and must not contain secrets.

## Troubleshooting

### Browser reports a CORS error

- Confirm `CORS_ORIGIN` in the backend's actual `.env` or hosted environment configuration matches the frontend origin exactly.
- Use `http://localhost:3000` locally, not a different hostname or port unless it is explicitly allowed.
- If using both localhost and `127.0.0.1`, add both origins as a comma-separated list.
- Restart the backend after changing its environment variables.
- Confirm `NEXT_PUBLIC_API_BASE_URL` points to the backend API with `/api/v1` included.

### Chat or notifications remain on “Connecting”

- Confirm the backend is running and the frontend API base URL is correct.
- Check the browser Network tab for the stream-token request and the SSE requests under `/api/v1/realtime/`.
- Check the backend terminal for authentication, token-expiry, or project-membership errors.
- Confirm `REALTIME_TOKEN_SECRET` is configured consistently for the running backend.
- Verify the logged-in user still belongs to the project.
- Inspect proxy/hosting behavior if the stream connects locally but not on the deployed service; SSE requires a streaming response rather than a buffered response.

### MongoDB connection fails

- Verify `MONGO_URI` is valid and the database user password is correct.
- Confirm MongoDB is running locally or Atlas network access permits the deployed backend.
- URL-encode special characters in MongoDB usernames/passwords when required by the connection string.

### Email does not arrive

- Check SMTP host, port, username, password, and sender configuration.
- Verify the provider allows the sender address and the account is not in test-only mode.
- Check the inbox's spam/junk folder and provider logs.
- Confirm `FRONTEND_URL` and `FORGOT_PASSWORD_REDIRECT_URL` use the correct frontend origin.

### Task attachments disappear after deployment

The current upload location is local disk. Use persistent/object storage and update the application to use it before relying on uploads across restarts or redeployments.

### A user appears online after closing the browser

Presence is heartbeat based and may take time to expire. Multiple tabs/sessions can keep the same user online until all active sessions stop sending heartbeats or are explicitly removed.

### Local development uses stale code or environment values

- Stop and restart the affected development server after changing package files or environment variables.
- Check the `.env` file in the correct package folder.
- Confirm the terminal is running from `backend` or `frontend`, as appropriate.
- Reinstall dependencies with `npm ci` if the lockfile is available and the installed tree is out of sync.

## Current limitations

- Realtime event publication and presence are process-local. Multiple backend instances need shared event and presence infrastructure.
- SSE is one-way server-to-browser communication; client actions use HTTP APIs.
- A disconnected browser can miss live events; persisted data should be fetched again after reconnecting.
- Task attachments currently use local disk; durable cloud storage is not configured by default.
- SMTP settings must be provided to test real email flows.
- Email background queues, external email-provider webhook processing, and cross-instance Redis Pub/Sub are not configured by default.
- A successful local build and manual feature test should be completed before relying on a deployment; configure the environment variables for the target hosting services.

---

For an implementation detail not covered here, inspect the matching route, controller, service, model, validator, or frontend module. The source code is the definitive reference for exact payload schemas and behavior.
