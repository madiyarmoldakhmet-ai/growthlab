# GrowthLab

GrowthLab is a local MVP for managing outreach contacts, campaigns, WhatsApp messages, Gmail replies, and AI-assisted lead handling.

GitHub repository: https://github.com/LibDesee/GrowthLab

## What Is Ready

- `backend/` is a runnable NestJS API.
- The backend uses Fastify, including multipart uploads through `@fastify/multipart`.
- `frontend/` is a runnable Next.js app.
- `backend/prisma/` contains the PostgreSQL schema and initial migration.
- Contacts and campaigns are persisted through Prisma/PostgreSQL.
- Gmail, WhatsApp, and AI modules are wired into the backend app.
- `docs/` contains architecture, API, database, Gmail, and roadmap notes.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 15+
- Git

## Environment

Copy the example files before running locally:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
```

Set real values only in local `.env` files. Do not commit API keys, OAuth client secrets, refresh tokens, access tokens, or downloaded Google credential JSON files.

Important backend variables:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/growthlab?schema=public"
HOST=0.0.0.0
DATABASE_CONNECT_ON_START=false
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN_SECONDS=86400
ADMIN_EMAIL="admin@growthlab.local"
ADMIN_PASSWORD="change-this-password"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
OPENAI_BASE_URL="https://api.openai.com/v1"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3001/gmail/oauth/callback"
GOOGLE_REFRESH_TOKEN=""
WHATSAPP_AUTH_DIR="./storage/whatsapp/auth"
UPLOAD_MAX_BYTES=5242880
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Install

Backend:

```powershell
cd backend
npm install
npm run prisma:generate
```

Frontend:

```powershell
cd frontend
npm install
```

From the repository root you can also run:

```powershell
npm run build
npm run dev:backend
npm run dev:frontend
```

## Database

Create a PostgreSQL database named `growthlab`, then run:

```powershell
cd backend
npm run prisma:migrate
```

For production-style migration application:

```powershell
npx prisma migrate deploy
```

The current contacts/campaigns controllers use a temporary local user scope (`legacy@growthlab.local`) until JWT user scoping is passed through those controllers.

## Run

Backend:

```powershell
cd backend
npm run start:dev
```

The API runs on http://localhost:3001.

Frontend:

```powershell
cd frontend
npm run dev
```

The app runs on http://localhost:3000.

## Checks

Backend:

```powershell
cd backend
npm run build
npm run prisma:generate
```

Frontend:

```powershell
cd frontend
npm run build
npm run lint
```

## Main Endpoints

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/admin`
- `GET /contacts`
- `POST /contacts`
- `POST /contacts/import/csv`
- `POST /contacts/import/excel`
- `GET /campaigns`
- `POST /campaigns`
- `POST /whatsapp/connect`
- `GET /whatsapp/status`
- `POST /whatsapp/messages`
- `PUT /gmail/oauth`
- `POST /gmail/send`
- `POST /gmail/sync-replies`

## Notes

- Gmail setup details are in `docs/GMAIL.md`.
- The frontend screens currently use local UI state and sample data; backend API integration can be added on top of `frontend/lib/api.ts`.
- WhatsApp auth files are written under `WHATSAPP_AUTH_DIR` and must not be committed.
- Upload endpoints expect `multipart/form-data` with a `file` field.
- Real secrets should be rotated if they were ever pasted into chat or logs.
