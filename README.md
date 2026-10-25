# ProjectFlow — Full-Stack Project Management

ProjectFlow is a responsive project-management application built with **Next.js + TypeScript** on the frontend and **Express + TypeScript + MongoDB/Mongoose** on the backend. This repository combines the frontend and API into one deployable codebase while keeping separate package manifests so the frontend can deploy on Vercel and the backend on Render.

**Suggested repository name:** `projectflow-fullstack`  
**Project name:** ProjectFlow

## Features

- Authentication: registration, login/logout, current user, email verification, resend verification, password reset, and password change.
- Projects: create, list, update, delete, project membership, and member role changes.
- Tasks: project task lists, task details, status/assignee updates, attachment uploads (up to five files per task), and subtasks.
- Notes: project notes with create/read/update/delete workflows.
- Authorization: project membership checks and role-gated write operations.
- Responsive Next.js UI: dashboard, project overview, tasks board, team members, notes, settings, auth and recovery screens.
- One typed API client in `frontend/lib/api.ts`; the backend's TypeScript source compiles into `backend/dist` for production.

## Repository structure

```text
projectflow-fullstack/
├── backend/
│   ├── src/
│   │   ├── controllers/       # API business logic
│   │   ├── db/                # MongoDB connection
│   │   ├── middlewares/       # Auth, validation, uploads, errors
│   │   ├── models/            # Mongoose schemas and methods
│   │   ├── routes/            # Express API routes
│   │   ├── types/             # Express request type augmentation
│   │   ├── utils/             # Responses, errors, mail, constants
│   │   └── index.ts            # TypeScript entry point
│   ├── public/images/          # Local upload location (development)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # Shared UI components
│   ├── lib/                    # API client, auth context, types
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Requirements

- Node.js **20.9 or newer**.
- npm.
- MongoDB (local or MongoDB Atlas).
- SMTP credentials for real email delivery (verification and password recovery). Development registration still works without SMTP; the API logs an email preview instead.

## Run locally

Open two terminals from the repository root.

### 1. Start the API

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Update `backend/.env` with a working `MONGO_URI` and unique random token secrets. The API defaults to port `8000`; the health endpoint is `http://localhost:8000/api/v1/healthcheck`.

For PowerShell, use `Copy-Item .env.example .env` instead of `cp` if needed.

### 2. Start the frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend environment variable should be:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

The app requires a reachable API and MongoDB; project and task data are loaded from the API rather than seeded into fake frontend data.

## Backend environment variables

Copy `backend/.env.example` to `backend/.env` for local development. Configure these values in Render for production:

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Production | Set to `production` on Render. |
| `PORT` | Render provides this | The API listens on `process.env.PORT` or `8000` locally. |
| `MONGO_URI` | Yes | MongoDB Atlas or other reachable MongoDB connection string. |
| `ACCESS_TOKEN_SECRET` | Yes | Long, random secret for access JWTs. |
| `ACCESS_TOKEN_EXPIRY` | Recommended | Defaults to `15m`. |
| `REFRESH_TOKEN_SECRET` | Yes | Different long, random secret for refresh JWTs. |
| `REFRESH_TOKEN_EXPIRY` | Recommended | Defaults to `7d`. |
| `FRONTEND_URL` | Yes for email links | The deployed frontend origin, e.g. `https://your-app.vercel.app`. No trailing slash. |
| `CORS_ORIGIN` | Yes | Comma-separated frontend origins allowed to call the API. Include every production/custom domain you use. |
| `SERVER_URL` | Recommended | Public API origin, e.g. `https://your-api.onrender.com`, used to form upload URLs. |
| `FORGOT_PASSWORD_REDIRECT_URL` | Yes for recovery email | The frontend route, e.g. `https://your-app.vercel.app/reset-password`. |
| `MAILTRAP_SMTP_HOST` | For production email | SMTP hostname from your mail provider. |
| `MAILTRAP_SMTP_PORT` | For production email | Usually `587` or `465`, as given by the provider. |
| `MAILTRAP_SMTP_USER` | For production email | SMTP username. |
| `MAILTRAP_SMTP_PASS` | For production email | SMTP password. Keep this secret. |
| `MAIL_FROM` | Optional | Sender label/address approved by your provider. |

Do not commit `.env`, `.env.local`, database credentials, SMTP passwords, or token secrets. Use different access and refresh secrets in production, and do not reuse the example placeholder values.

## Deploy the backend to Render

1. Push this repository to GitHub. A good repository name is **`projectflow-fullstack`**.
2. In Render, create a **Web Service** from that repository.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `npm install && npm run build`.
5. Set **Start Command** to `npm start`.
6. Choose a supported Node runtime (20 or newer) and add the environment variables listed above.
7. Set `CORS_ORIGIN` to your exact Vercel URL. During the first deployment you can use the expected Vercel URL, then confirm and update it after the frontend goes live.
8. Deploy and test `https://YOUR-RENDER-SERVICE.onrender.com/api/v1/healthcheck` before connecting the frontend.

The backend build compiles `backend/src/**/*.ts` to `backend/dist/**/*.js`. Render runs the compiled JavaScript; the source code under `backend/src` is TypeScript.

## Deploy the frontend to Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend` and use the Next.js framework preset.
3. Set the production environment variable:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
   ```

4. Deploy. Add the final Vercel origin to the Render `CORS_ORIGIN` value and set the Render `FRONTEND_URL` and `FORGOT_PASSWORD_REDIRECT_URL` to that deployed frontend URL.
5. Redeploy the backend after changing its environment variables. Redeploy the frontend if `NEXT_PUBLIC_API_BASE_URL` changes because Next.js embeds public environment values during the build.
6. Test registration/login, create a project, add a project member, create/update a task, create a subtask, add a note, and exercise sign-out/password recovery.

If you later add a custom frontend domain, include that origin in `CORS_ORIGIN` and set `FRONTEND_URL` to the canonical domain. `CORS_ORIGIN` is a comma-separated list, for example `https://your-app.vercel.app,https://app.yourdomain.com`.

## API routes

All routes are prefixed with `/api/v1`.

| Area | Endpoints | Authentication |
|---|---|---|
| Health | `GET /healthcheck` | Public |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/current-user` | Mixed; protected routes require a token |
| Email and password | `GET /auth/verify-email/:verificationToken`, `POST /auth/resend-email-verification`, `POST /auth/forgot-password`, `POST /auth/reset-password/:resetToken`, `POST /auth/change-password`, `POST /auth/refresh-token` | Mixed |
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/:projectId` | Authenticated; project roles apply |
| Members | `GET/POST /projects/:projectId/members`, `PUT/DELETE /projects/:projectId/members/:userId` | Authenticated; admin role for writes |
| Tasks | `GET/POST /tasks/:projectId`, `GET/PUT/DELETE /tasks/:projectId/t/:taskId` | Authenticated; project roles apply |
| Subtasks | `POST /tasks/:projectId/t/:taskId/subtasks`, `PUT/DELETE /tasks/:projectId/st/:subTaskId` | Authenticated; project roles apply |
| Notes | `GET/POST /notes/:projectId`, `GET/PUT/DELETE /notes/:projectId/n/:noteId` | Authenticated; project roles apply |

The API returns a consistent envelope: `{ statusCode, success, message, data }`. Errors include `success: false` and a human-readable `message`. Task statuses are canonically `todo`, `in_progress`, and `done`.

## Important operational notes

- **Email:** production email verification and password recovery require working SMTP environment variables. During local development, missing SMTP settings produce an email preview in the backend console; configure SMTP before relying on email links in production.
- **Uploads:** task attachment uploads accept up to five images/PDF/text files (5 MB each) through multipart form data with field name `attachments`. The included deployment supports local disk storage for development. Render's ordinary filesystem is ephemeral; for durable production attachments, connect object storage (such as S3 or Cloudinary) or configure a persistent disk and adjust the upload middleware before depending on attachments across deploys/restarts.
- **Token storage:** the frontend currently keeps bearer access and refresh tokens in browser `localStorage` to support API calls across separate Vercel and Render origins. This is functional for the current project but increases impact if the frontend ever has an XSS vulnerability. For a security-hardened public service, move session management to a same-site, `httpOnly` cookie/BFF architecture and add CSRF protection where applicable.
- **CORS and HTTPS:** use HTTPS in production and configure the exact frontend origins in Render. Never use `*` with credentialed CORS.
- **Existing database migrations:** this project keeps Mongoose schemas in TypeScript. If connecting an existing MongoDB database, review any old unique indexes before launch; MongoDB does not automatically remove obsolete indexes when schema declarations change.
- **Verification:** all TypeScript/TSX files passed a syntax-transpilation check in the build environment. A dependency-aware `tsc` check and production builds could not be completed here because the required npm packages were not installed and npm registry installation timed out. Before merging or deploying, run `npm install`, `npm run typecheck`, and `npm run build` in `backend`, then run `npm install` and `npm run build` in `frontend`. Do not treat source packaging alone as proof of a successful cloud deployment.

## Useful scripts

Backend (`cd backend`):

```bash
npm run dev        # Run TypeScript source with reload
npm run typecheck  # Type-check without emitting
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled production server
```

Frontend (`cd frontend`):

```bash
npm run dev
npm run lint
npm run build
npm start
```
