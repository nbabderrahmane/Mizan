# System Journal - Mizan

## Current Status
**Phase:** 2 (Completed - Navigation Fixes)
**Focus:** Multi-workspace Support & Settings Navigation
**Last Action:** Cleaned up debug logs and finalized navigation structure.

## Active Context
Completed Phase 2 accounts/categories, then addressed user feedback regarding multi-workspace creation flow and settings menu placement.

## Next Steps
- Begin Phase 3: Transactions & Multi-currency Support. |

---

## Recent Changes (2026-01-03)

### RLS Workspace Creation Fix

**Problem**: `auth.uid()` returns NULL in RLS context even though user is authenticated via `getUser()`.

**Root Cause**: `@supabase/ssr` session tokens weren't being passed correctly to database queries for RLS evaluation.

**Solution**: Created `create_workspace_for_user()` SECURITY DEFINER function that bypasses RLS.

**Files Changed**:
- `supabase/migrations/005_fix_workspace_creation_v2.sql` - SECURITY DEFINER function
- `src/lib/actions/workspace.ts` - Uses RPC instead of direct INSERT

---

## Architecture Overview

### Stack
```
Frontend:     Next.js 15 (App Router) + TypeScript
Styling:      Tailwind CSS + shadcn/ui
Database:     Supabase Postgres + RLS
Auth:         Supabase Auth (email + password)
Deployment:   Vercel
```

### Database (16 Tables)

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profiles | Own only |
| `app_admins` | SUPPORT_ADMIN roles | Own only |
| `workspaces` | Budget workspaces | Member only |
| `workspace_members` | Membership + roles | Member only |
| `accounts` | Financial accounts | Member (no SUPPORT_ADMIN) |
| `categories` | Budget categories | Member only |
| `subcategories` | Budget subcategories | Member only |
| `monthly_budgets` | Planned amounts | Member (no SUPPORT_ADMIN) |
| `provisions` | Future bills | Member (no SUPPORT_ADMIN) |
| `provision_ledger` | Fund/consume entries | Member (no SUPPORT_ADMIN) |
| `transactions` | Income/expense/transfer | Member (no SUPPORT_ADMIN) |
| `notifications` | In-app notifications | Own only |
| `invites` | Workspace invites | Member only |
| `audit_logs` | Audit trail | OWNER/MANAGER only |
| `fx_rates` | Cached FX rates | All authenticated |
| `rate_limits` | Auth rate limiting | Via function only |

### RBAC Roles

| Role | Read | Create | Update | Delete |
|------|------|--------|--------|--------|
| OWNER | All | All | All | All + workspace |
| MANAGER | All | All | All | All |
| CONTRIBUTOR | All | Transactions | Own only | Own only |
| VIEWER | All | None | None | None |
| SUPPORT_ADMIN | Metadata only | None | None | None |

---

## All Pages (Phase 0 & 1)

### Public Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Landing page |
| `/auth/sign-in` | `src/app/auth/sign-in/page.tsx` | Login form |
| `/auth/sign-up` | `src/app/auth/sign-up/page.tsx` | Registration |

### Protected Pages

| Route | File | Purpose |
|-------|------|---------|
| `/onboarding/create-workspace` | `src/app/onboarding/create-workspace/page.tsx` | First workspace |
| `/w/[workspaceId]/dashboard` | `src/app/(app)/w/[workspaceId]/dashboard/page.tsx` | Dashboard |

---

## Server Actions

### Auth (`src/app/auth/actions.ts`)

| Action | What It Does |
|--------|--------------|
| `signUp(formData)` | Creates user, triggers profile creation |
| `signIn(formData)` | Authenticates user, sets session |
| `signOut()` | Clears session, redirects home |

### Workspace (`src/lib/actions/workspace.ts`)

| Action | What It Does |
|--------|--------------|
| `createWorkspace(formData)` | Creates workspace via RPC, user becomes OWNER |
| `listWorkspacesForUser()` | Returns all user's workspaces |
| `getWorkspace(id)` | Returns workspace if user is member |
| `getUserWorkspaceRole(id)` | Returns user's role in workspace |

---

## Database Functions

### SECURITY DEFINER Functions (bypass RLS)

| Function | Purpose |
|----------|---------|
| `is_support_admin()` | Check if user is SUPPORT_ADMIN |
| `is_workspace_member(ws_id)` | Check workspace membership |
| `has_workspace_role(ws_id, roles[])` | Check specific roles |
| `can_manage_workspace(ws_id)` | OWNER or MANAGER check |
| `can_contribute_to_workspace(ws_id)` | OWNER, MANAGER, or CONTRIBUTOR |
| `create_workspace_for_user(name, user_id)` | Create workspace bypassing RLS |
| `create_audit_log(...)` | Create audit entries |
| `get_provision_balance(id)` | Calculate provision balance |
| `get_account_balance(id)` | Calculate account balance |
| `check_rate_limit(key, max, window)` | Rate limiting |

### Triggers

| Trigger | Table | Purpose |
|---------|-------|---------|
| `on_auth_user_created` | `auth.users` | Create profile on signup |
| `on_workspace_created` | `workspaces` | Add creator as OWNER |
| `validate_transaction_trigger` | `transactions` | Validate transaction data |

---

## Environment Variables

```bash
# Required (Phase 0/1)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Optional (Phase 7 only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # NEVER prefix with NEXT_PUBLIC_

# Logging
LOG_LEVEL=debug  # debug, info, warn, error
```

---

## Logging Strategy

Every server action uses structured logging:

```typescript
const logger = createLogger();  // Generates correlation ID
logger.info('Action started', { action: 'createWorkspace', userId: user.id });
```

**What's logged**: action, correlationId, userId, workspaceId, duration, errors
**Never logged**: passwords, tokens, amounts, balances, API keys

---

## Known Issues & Workarounds

### Issue: `auth.uid()` returns NULL in RLS

**Symptom**: RLS policies fail even though user is authenticated
**Workaround**: Use SECURITY DEFINER functions for INSERT operations
**Root Cause**: `@supabase/ssr` session tokens not passed to RLS context

### Issue: Email confirmation required by default

**Fix**: Disable in Supabase Dashboard → Authentication → Sign In/Providers → Email → Toggle off "Confirm email"

---

## Next Phases

| Phase | Focus | Key Features |
|-------|-------|--------------|
| 2 | Accounts + Categories | CRUD, balance calculation, quick setup wizard |
| 3 | Transactions + FX | Income/expense/transfer, currency conversion |
| 4 | Provisions | Fund/consume/release, reserved cash tracking |
| 5 | Budgets + P&L | Monthly planning, P&L report |
| 6 | Invites + Inbox | Invite links, notifications |
| 7 | SUPPORT_ADMIN | Password reset, user/workspace viewing |

---

## How to Debug

1. Find correlation ID in error response
2. Search logs for `cid:abc123`
3. Trace request from start to failure

Example log output:
```
[INFO] signUp action started | cid:e921a597 | action:signUp
[ERROR] Supabase auth signUp failed | cid:e921a597
```
## Verification Update (2026-01-03)

- Verified account edit (name, opening balance) functionality.
- Verified account reconciliation (adjustment transaction creation) via `ReconcileAccountDialog`.
- Verified UI polish: reduced clicks, meaningful empty states pending, confirmation dialogs added where needed.
- Verified transfer double‑entry polish.
- Verified transaction filters (month, account, category, member, vendor).

Updated documentation files:
- ARCHITECTURE.md
- RUNBOOK.md
- LOGS.md

