# Mizan - Architecture

Technical decisions, tradeoffs, security notes, and pivots.

---

## Overview

Mizan is a shared budgeting web app with:
- Multi-account balances (bank/cash/savings/investments)
- Plan vs actual monthly budgeting
- Provisions (future bills funded over time)
- Multi-currency with FX conversion
- Workspace collaboration with RBAC

## Stack

```
Frontend:     Next.js 15 (App Router) + TypeScript
Styling:      Tailwind CSS + shadcn/ui
Database:     Supabase Postgres + RLS
Auth:         Supabase Auth (email + password)
Deployment:   Vercel
Validation:   Zod
Forms:        React Hook Form
Charts:       Recharts (for P&L)
```

---

## Database Schema

### Table Count: 16 Tables

**001_initial_schema.sql** creates 15 tables:

| # | Table | Purpose | Financial Data? |
|---|-------|---------|-----------------|
| 1 | `profiles` | User profiles linked to auth.users | No |
| 2 | `app_admins` | SUPPORT_ADMIN role assignments | No |
| 3 | `workspaces` | Budget workspaces | No |
| 4 | `workspace_members` | Membership + roles | No |
| 5 | `accounts` | Financial accounts | **Yes** (opening_balance) |
| 6 | `categories` | Budget categories | No |
| 7 | `subcategories` | Budget subcategories | No |
| 8 | `monthly_budgets` | Planned budget amounts | **Yes** (planned_amount) |
| 9 | `provisions` | Future bills config | **Yes** (funding_amount_per_period) |
| 10 | `provision_ledger` | Provision fund/consume entries | **Yes** (amount) |
| 11 | `transactions` | Income/expense/transfer | **Yes** (amounts, fx_rate) |
| 12 | `notifications` | In-app notifications | No |
| 13 | `invites` | Workspace invite tokens | No |
| 14 | `audit_logs` | Audit trail | Partial (payload_sensitive) |
| 15 | `fx_rates` | Cached FX rates | No |

**003_functions_triggers.sql** creates 1 additional table:

| # | Table | Purpose | Financial Data? |
|---|-------|---------|-----------------|
| 16 | `rate_limits` | Auth rate limiting | No |

### Enums (9 total)

- `workspace_role`: OWNER, MANAGER, CONTRIBUTOR, VIEWER
- `admin_role`: SUPPORT_ADMIN
- `account_type`: bank, cash, savings, investment
- `funding_mode`: PAYG, PROVISION
- `provision_cadence`: monthly, quarterly, yearly, custom_months
- `provision_status`: active, paused, archived
- `provision_entry_type`: fund, consume, adjust, release
- `transaction_type`: income, expense, transfer
- `notification_type`: invite, system

---

## Security Architecture

### Email Verification Disabled

> [!WARNING]
> **RISK**: Email verification is disabled per founder requirements.
> 
> **Impact**: Users can sign up with any email without proving ownership.
> 
> **Mitigation**: Password policies enforced, rate limiting on auth endpoints.

### Environment Variables

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | ✅ Phase 0 | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | ✅ Phase 0 | Public anon key for RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | ❌ Phase 7 | Admin ops (password resets) |

> [!CAUTION]
> **SUPABASE_SERVICE_ROLE_KEY** must NEVER be prefixed with `NEXT_PUBLIC_` and must NEVER be imported in client components. It bypasses RLS and should only be used in Edge Functions or server-side code for admin operations.

### RLS Security Model

**RBAC Roles:**
| Role | Read | Create | Update | Delete |
|------|------|--------|--------|--------|
| OWNER | All | All | All | All + workspace |
| MANAGER | All | All | All | All |
| CONTRIBUTOR | All | Transactions only | Own transactions | Own transactions |
| VIEWER | All | None | None | None |
| SUPPORT_ADMIN | Metadata only | None | None | None |

**SECURITY DEFINER Functions** (prevent RLS recursion):

```sql
is_support_admin()           -- Check if user is support admin
is_workspace_member(ws_id)   -- Check workspace membership
has_workspace_role(ws_id, roles[])  -- Check specific roles
can_manage_workspace(ws_id)  -- OWNER or MANAGER
can_contribute_to_workspace(ws_id)  -- OWNER, MANAGER, or CONTRIBUTOR
```

### SUPPORT_ADMIN Restrictions

SUPPORT_ADMIN has **NO access** to:
- `transactions` (all columns)
- `provision_ledger` (all columns)
- `accounts` (opening_balance column contains amounts)
- `monthly_budgets` (planned_amount column)
- `provisions` (funding_amount_per_period column)

SUPPORT_ADMIN **CAN access** (via SECURITY DEFINER functions):
- `get_support_workspaces()`: workspace id, name, created_at, member_count
- `get_support_users()`: user id, email, full_name, created_at

---

## Observability & Logging

### Structured Logging

All server actions use the structured logger (`src/lib/logger.ts`):

```typescript
const logger = createLogger();
logger.info('Action started', { action: 'createWorkspace', userId: user.id });
```

### Correlation ID

Every request generates a UUID correlation ID for tracing:
- Included in all log entries as `correlationId`
- Returned to client in error responses
- Enables end-to-end request tracing

### What is Logged

✅ **Always log:**
- Action name, correlation ID
- User ID, workspace ID (when available)
- Success/failure status
- Error messages and stack traces
- Duration (for timed operations)

❌ **NEVER log (enforced by sanitizeContext):**
- `password`, `token`, `accessToken`, `refreshToken`
- `apiKey`, `secret`, `anonKey`, `serviceRoleKey`
- `amount`, `balance`, `openingBalance`, `baseAmount`, `originalAmount`
- `fxRate`, `creditCard`, `ssn`

The logger's `sanitizeContext()` function automatically redacts these keys.

---

## 3-Strike Tracker

| Library/API | Attempts | Status | Fallback |
|-------------|----------|--------|----------|
| FX API | 0 | Not yet attempted | Manual rate input |

---

## Pivots & Changes

(None yet - tracking will be added as project progresses)
