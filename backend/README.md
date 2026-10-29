# SafeSMS Backend

Fastify + Prisma + Postgres API.

## Dev

```bash
# from repo root
docker compose up -d postgres

cd backend
cp .env.example .env
npm install
npm run prisma:migrate   # creates tables + generates client
npm run seed             # loads demo data
npm run dev              # http://localhost:4000
```

Seeded credentials (password `password123` for all):

| Role     | Email                | Notes                          |
|----------|----------------------|--------------------------------|
| Admin    | admin@safesms.io     | Moderation queue               |
| Company  | acme@safesms.io      | "Acme Bank" — approved         |
| Company  | scammer@safesms.io   | "Fake Bank" — pending          |
| Consumer | alice@safesms.io     | phone +15551110001 — has inbox |
| Consumer | bob@safesms.io       | phone +15551110002 — empty     |

## API

All responses use `{ error: { code, message, details? } }` on failure.

### Auth

| Method | Path            | Auth         | Description |
|--------|-----------------|--------------|-------------|
| POST   | /auth/register  | public       | Register a CONSUMER or COMPANY (ADMIN not allowed) |
| POST   | /auth/login     | public       | Returns `{ user, token }` |
| GET    | /auth/me        | bearer       | Returns the current token's user |

### Company (role: COMPANY)

| Method | Path                                        | Description |
|--------|---------------------------------------------|-------------|
| GET    | /companies                                  | List companies owned by the caller |
| POST   | /companies                                  | Register a new company (goes PENDING) |
| GET    | /companies/:companyId/sender-ids            | List sender IDs |
| POST   | /companies/:companyId/sender-ids            | Submit a sender ID for approval |
| GET    | /companies/:companyId/templates             | List message templates |
| POST   | /companies/:companyId/templates             | Submit a template `{ senderIdId, body }` |
| POST   | /messages/send                              | Send an approved SMS `{ companyId, senderIdId, templateId, recipientPhone, variables? }` |

### Admin (role: ADMIN)

| Method | Path                                   | Description |
|--------|----------------------------------------|-------------|
| GET    | /admin/pending                         | All pending companies / senders / templates |
| POST   | /admin/companies/:id/decision          | `{ decision: "APPROVE" \| "REJECT", note? }` |
| POST   | /admin/sender-ids/:id/decision         | Approve/reject a sender ID |
| POST   | /admin/templates/:id/decision          | Approve/reject a template |
| POST   | /messages/simulate-unverified          | Demo: inject a blocked spoof SMS into a consumer's inbox |

### Consumer (role: CONSUMER)

| Method | Path        | Description |
|--------|-------------|-------------|
| GET    | /inbox      | List of SMS with verified/blocked status |

## Tests

```bash
npm test          # full suite (needs Postgres)
npm run test:unit # pure unit tests, no database needed
```

Tests use an ephemeral Postgres schema (`TEST_DATABASE_URL`) so they don't touch your dev DB.

## Trust model

Three checks must all pass before an SMS delivers as verified:

1. `Company.status == APPROVED`
2. `SenderId.status == APPROVED`
3. `MessageTemplate.status == APPROVED`

Any failure throws a 403 and — in the simulated-unverified path — lands as a
`BLOCKED_UNKNOWN_SENDER` row in the consumer's inbox so they see the spoof
attempt instead of falling for it.

Template **variables** are restricted too, because admins approve a template's
shape, not every value poured into it. Each value must be at most 64 characters,
single-line, free of `{{ }}`, and must not contain a link or domain. Anything
that needs a link belongs in the approved template body itself. Otherwise an
approved `"Your code is {{code}}"` could carry `"expired, verify at http://…"`.

Inbox rows show a `companyName` only for verified deliveries, so a spoof that
reuses a real brand's sender ID can't borrow that brand's name.
