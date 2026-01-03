# Mizan - Runbook

How to run locally, deploy, and debug.

---

## Prerequisites

- Node.js 18+
- npm
- Supabase account
- Vercel account (for deployment)

---

## Environment Variables

### Required for Phase 0/1

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional (Phase 7 only)

```bash
# Only needed for admin operations like password resets
# DO NOT add for Phase 0-6
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ **Never prefix service role key with NEXT_PUBLIC_**

### Logging

```bash
LOG_LEVEL=debug  # Options: debug, info, warn, error
```

---

## Local Development

### 1. Install Dependencies

```bash
cd Mizan
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Run Database Migrations

In Supabase SQL Editor, run in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_functions_triggers.sql`

### 4. Disable Email Confirmation (REQUIRED)

In Supabase Dashboard:

1. Go to **Authentication** (sidebar)
2. Click **Emails** under NOTIFICATIONS
3. Click **"Confirm sign up"** (first option under Authentication section)
4. Toggle **OFF** "Enable email confirmations"
5. Click **Save**

> ⚠️ This allows users to sign up without email verification (per founder requirement)

### 5. Start Dev Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## How to Debug with Correlation ID

### 1. Find the Correlation ID

When an error occurs, the client receives:
```json
{
  "message": "A user-friendly error message",
  "correlationId": "abc12345-..."
}
```

### 2. Search Server Logs

In development (console):
```bash
# Look for logs with the correlation ID
# Format: [LEVEL] timestamp | message | cid:abc12345
```

In production (Vercel logs):
```bash
# Search for the correlation ID in JSON logs
# { "context": { "correlationId": "abc12345-..." } }
```

### 3. Trace the Request

Correlation ID appears in all log entries for a request:
- Action start
- Supabase calls
- Validation errors
- Final success/failure

### 4. Example Debug Session

```
[INFO] 2026-01-03T15:00:00Z | signUp action started | cid:abc12345
[DEBUG] 2026-01-03T15:00:00Z | Input validated | cid:abc12345
[ERROR] 2026-01-03T15:00:01Z | Supabase auth signUp failed | cid:abc12345
  Error: User already exists
```

---

## RLS Verification Checklist

After running migrations, verify RLS in Supabase SQL Editor:

### Test 1: Cross-Workspace Isolation

```sql
-- As User A, create a workspace
-- Then switch to User B's context and try to read it:

-- This should return 0 rows (User B cannot see User A's workspace)
SELECT * FROM workspaces WHERE id = 'user-a-workspace-id';
```

### Test 2: SUPPORT_ADMIN Cannot Access Financial Tables

```sql
-- First, add a user as SUPPORT_ADMIN:
INSERT INTO app_admins (user_id, role) VALUES ('user-id', 'SUPPORT_ADMIN');

-- Then, as that user, try to access financial tables:
-- All of these should return 0 rows or permission denied:

SELECT * FROM transactions;       -- Should fail/return empty
SELECT * FROM provision_ledger;   -- Should fail/return empty
SELECT * FROM accounts;           -- Should fail/return empty
SELECT * FROM monthly_budgets;    -- Should fail/return empty
SELECT * FROM provisions;         -- Should fail/return empty
```

### Test 3: SUPPORT_ADMIN Can Access Support Views

```sql
-- As SUPPORT_ADMIN, these should work:
SELECT * FROM get_support_workspaces();  -- Returns workspace metadata
SELECT * FROM get_support_users();       -- Returns user metadata
```

### Test 4: Workspace Membership Required

```sql
-- As a user who is NOT a member of workspace X:
SELECT * FROM accounts WHERE workspace_id = 'workspace-x-id';
-- Should return 0 rows
```

---

## Vercel Deployment

### 1. Connect Repository

Link GitHub repo to Vercel.

### 2. Configure Environment Variables

In Vercel project settings, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LOG_LEVEL=info`

Do NOT add `SUPABASE_SERVICE_ROLE_KEY` until Phase 7.

### 3. Deploy

```bash
vercel --prod
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid login credentials" | Check email/password, verify user exists |
| "Permission denied" from Supabase | Check RLS policies, verify workspace membership |
| Session not persisting | Check middleware is running, verify env vars |
| Logs not showing | Set LOG_LEVEL=debug in .env.local |
## Verification Update (2026-01-03)

- Verified account edit, reconciliation, UI polish, transfer double‑entry, and filters.
- Updated documentation files: ARCHITECTURE.md, RUNBOOK.md, LOGS.md.

