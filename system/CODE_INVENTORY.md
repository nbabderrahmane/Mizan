# Mizan - Code Inventory

File map with purpose, dependencies, and tables touched.

---

## Database Schema Summary

**Total: 16 tables**

| Location | Tables Created |
|----------|----------------|
| `001_initial_schema.sql` | 15 tables (profiles, app_admins, workspaces, workspace_members, accounts, categories, subcategories, monthly_budgets, provisions, provision_ledger, transactions, notifications, invites, audit_logs, fx_rates) |
| `003_functions_triggers.sql` | 1 table (rate_limits) |

---

## Project Structure

```
Mizan/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/               # Auth pages and actions
│   │   ├── onboarding/         # First-time user flows
│   │   └── (app)/w/[workspaceId]/  # Workspace pages
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   └── layout/             # Layout components
│   └── lib/
│       ├── supabase/           # Supabase clients
│       ├── actions/            # Server actions
│       └── validations/        # Zod schemas
├── supabase/migrations/        # SQL migrations
└── system/                     # Documentation vault
```

---

## Key Files

### Supabase Clients

| File | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser client (uses NEXT_PUBLIC_* vars) |
| `src/lib/supabase/server.ts` | Server client + service role |
| `src/lib/supabase/middleware.ts` | Session refresh |

### Auth

| File | Tables Touched |
|------|----------------|
| `src/app/auth/actions.ts` | profiles (via trigger), rate_limits |
| `src/app/auth/sign-up/page.tsx` | - |
| `src/app/auth/sign-in/page.tsx` | - |

### Workspace

| File | Tables Touched |
|------|----------------|
| `src/lib/actions/workspace.ts` | workspaces, workspace_members, audit_logs |
| `src/app/onboarding/create-workspace/page.tsx` | - |
| `src/app/(app)/w/[workspaceId]/layout.tsx` | workspaces, workspace_members |
| `src/app/(app)/w/[workspaceId]/dashboard/page.tsx` | workspaces |

### Utilities

| File | Purpose |
|------|---------|
| `src/lib/logger.ts` | Structured logging with correlation ID |
| `src/lib/utils.ts` | Tailwind class merging |
| `src/middleware.ts` | Route protection |

---

## Tables by Domain

### Non-Financial (accessible to SUPPORT_ADMIN via views)
- `profiles`, `app_admins`, `workspaces`, `workspace_members`
- `categories`, `subcategories`, `notifications`, `invites`
- `fx_rates`, `rate_limits`

### Financial (blocked from SUPPORT_ADMIN)
- `accounts` (opening_balance)
- `monthly_budgets` (planned_amount)
- `provisions` (funding_amount_per_period)
- `provision_ledger` (amount)
- `transactions` (all amount columns)

### Audit (partial financial)
- `audit_logs` (payload_sensitive contains amounts)
