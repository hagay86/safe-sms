# SafeSMS

SafeSMS eliminates SMS fraud by only delivering messages from companies whose sender IDs and message templates have been reviewed and approved. Consumers see a verified inbox; unverified messages are flagged.

## Architecture

```
safe-sms/
├── backend/   # Node + TypeScript + Fastify + Prisma + Postgres
└── mobile/    # React Native (Expo) + TypeScript
```

Three trust checkpoints:

1. **Identity** — a Company must register and be approved by an admin.
2. **Channel** — each Sender ID (brand name / short code) must be approved.
3. **Content** — each Message Template must be approved before SMS matching it can be delivered.

Roles: `CONSUMER` (inbox), `COMPANY` (register, submit), `ADMIN` (moderate).

## Quick start

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run seed        # creates admin@safesms.io / password123 + demo data
npm run dev         # http://localhost:4000

# 3. Mobile
cd ../mobile
cp .env.example .env   # point EXPO_PUBLIC_API_URL at the backend
npm install
npm run start
```

Run tests:

```bash
cd backend && npm test
```

## API surface

See [`backend/README.md`](backend/README.md) for the full endpoint list.

## License

MIT
