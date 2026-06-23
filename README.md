# GrowthLab

GrowthLab is an outreach workspace for contacts, campaigns, WhatsApp messages, Gmail replies, and AI-assisted lead handling.

GitHub repository: https://github.com/LibDesee/GrowthLab

## Current Project State

- `frontend/` contains a runnable Next.js app with dashboard, contacts, and campaigns screens.
- `backend/` contains NestJS-style modules, Prisma schema, and migrations, but the backend package scaffold is not present yet.
- `docs/` contains architecture, API, database, and roadmap notes.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 15+ for backend database work
- Git

## Environment Variables

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

`NEXT_PUBLIC_API_URL` is used by `frontend/lib/api.ts`.

### Backend

The backend source currently references these variables:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/growthlab
JWT_SECRET=change-me
JWT_EXPIRES_IN_SECONDS=86400
ADMIN_EMAIL=admin@growthlab.local
ADMIN_PASSWORD=admin
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
WHATSAPP_AUTH_DIR=storage/whatsapp/auth
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=http://localhost:3001/gmail/oauth/callback
```

Do not commit real API keys or OAuth secrets.

## Install Dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend:

The backend still needs its package scaffold before dependencies can be installed. Once `backend/package.json`, TypeScript config, and a Nest entrypoint are added, install from the backend folder:

```bash
cd backend
npm install
```

## Run Frontend

```bash
cd frontend
copy .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Useful frontend commands:

```bash
npm run build
npm run start
npm run lint
```

## Prisma

Prisma files live in `backend/prisma`.

After the backend package scaffold is added and dependencies include `prisma` and `@prisma/client`, run:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

For production-style migration application:

```bash
npx prisma migrate deploy
```

## Run Backend

The backend launch command depends on the missing backend package scaffold. The intended local flow is:

```bash
cd backend
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Before this works, add the backend runtime files and scripts, for example:

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/nest-cli.json`
- `backend/src/main.ts`
- root `AppModule` wiring the existing modules

## Documentation

- `docs/ARCHITECTURE.md` - target architecture and module boundaries.
- `docs/API.md` - target HTTP API shape.
- `docs/DATABASE.md` - database model and migration notes.
- `docs/ROADMAP.md` - delivery phases and MVP scope.

## First-Time Developer Checklist

1. Clone the repository.
2. Install frontend dependencies with `cd frontend && npm install`.
3. Create `frontend/.env.local` from `frontend/.env.example`.
4. Run `npm run dev` from `frontend`.
5. Review backend scaffold gaps in this README before trying to start the API.
6. Configure PostgreSQL and `DATABASE_URL` before running Prisma.
