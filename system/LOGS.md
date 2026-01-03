# Mizan - System Logs

Timestamped changelog for all meaningful changes.

---

## 2026-01-03 16:07 - RLS Workspace Creation Fix v2

### Root Cause
- `auth.uid()` returns NULL in RLS context even though user is authenticated
- This is a known issue with `@supabase/ssr` when session tokens aren't passed correctly

### Fix Applied
- Created `005_fix_workspace_creation_v2.sql` with SECURITY DEFINER function
- `create_workspace_for_user(p_name, p_user_id)` bypasses RLS
- Updated `workspace.ts` action to use RPC call instead of direct INSERT

---

## 2026-01-03 16:01 - RLS Workspace Creation Fix

### Issue
- `new row violates row-level security policy for table "workspaces"` error on workspace creation
- Caused by circular dependency in RLS policies

### Fix
- Created `004_fix_workspace_creation.sql` migration
- Simplified workspace INSERT policy
- Fixed workspace_members INSERT policy to allow trigger to add OWNER

---

## 2026-01-03 15:56 - Developer Handoff Journal Created

### Created
- `/system/JOURNAL.md` - Comprehensive developer handoff documentation:
  - All pages and their purposes
  - All server actions (queries/mutations) with logic flows
  - Database tables breakdown (16 tables)
  - RLS policy logic explained
  - Logging strategy
  - Component architecture
  - Environment variables
  - Debugging guide
  - Next phases roadmap

---

## 2026-01-03 15:43 - Documentation Validation

### Reconciled
- **Table count verified**: 16 tables total
  - 15 in `001_initial_schema.sql`
  - 1 (`rate_limits`) in `003_functions_triggers.sql`

### Updated
- `/system/ARCHITECTURE.md`: Added table breakdown, env var rules, SUPPORT_ADMIN restrictions
- `/system/CODE_INVENTORY.md`: Added table count reconciliation
- `/system/RUNBOOK.md`: Added RLS verification checklist, correlation ID debugging guide

### Verified
- Logger sanitizes sensitive keys (passwords, tokens, amounts, balances)
- `SUPABASE_SERVICE_ROLE_KEY` only in `createServiceClient()` (not called in Phase 0/1)
- All client code uses only `NEXT_PUBLIC_*` env vars

---

## 2026-01-03 15:40 - Auth + Workspace Implementation (Phase 1)

### Created
- **Auth server actions** (`src/app/auth/actions.ts`)
  - signUp, signIn, signOut with structured logging
  - Rate limiting via database function
  - Zod validation schemas
  
- **Auth pages**
  - `/auth/sign-up` - User registration form
  - `/auth/sign-in` - Login form for returning users
  
- **Workspace actions** (`src/lib/actions/workspace.ts`)
  - createWorkspace, listWorkspacesForUser, getWorkspace, getUserWorkspaceRole
  - All with correlation ID logging and audit log creation
  
- **Onboarding page** (`/onboarding/create-workspace`)
  - First-time user workspace creation flow
  
- **App shell layout** (`src/components/layout/app-shell.tsx`)
  - Responsive design: sidebar on desktop, bottom nav on mobile
  - Workspace switcher dropdown
  - Navigation links for all main sections
  
- **Dashboard page** (`/w/[workspaceId]/dashboard`)
  - Workspace dashboard with placeholder metrics
  - Quick start guide for new users

### UI Components Added
- Button, Input, Label, Card, DropdownMenu (shadcn/ui)
- WorkspaceSwitcher component

### Build Verification
- ✅ TypeScript compilation successful
- ✅ All pages render (static generation works)
- ✅ Middleware configured for auth protection

---

## 2026-01-03 15:17 - Project Initialization (Phase 0)

### Created
- **Next.js scaffold** with App Router, TypeScript, Tailwind CSS
- **Package.json** with lowercase name `mizan` (npm restriction)
- **shadcn/ui setup** with Button component and CSS variables
- **Supabase client helpers**: browser, server, and service role clients
- **Middleware** for session management and route protection
- **Structured logger** (`src/lib/logger.ts`) with:
  - Correlation ID generation for request tracing
  - Log levels: debug, info, warn, error
  - Sensitive data sanitization (passwords, tokens, amounts never logged)
  - Timed operation helper for performance tracking

### Database Migrations
- **001_initial_schema.sql**: 15 tables with enums and indexes
  - profiles, app_admins, workspaces, workspace_members
  - accounts, categories, subcategories, monthly_budgets
  - provisions, provision_ledger, transactions
  - notifications, invites, audit_logs, fx_rates
  - rate_limits (added for auth rate limiting)
  
- **002_rls_policies.sql**: Complete RLS implementation
  - SECURITY DEFINER helper functions to avoid recursion
  - RBAC: OWNER/MANAGER full access, CONTRIBUTOR limited, VIEWER read-only
  - SUPPORT_ADMIN blocked from all financial tables
  - Support views exposed via functions for admin metadata only

- **003_functions_triggers.sql**: Triggers and helpers
  - Profile creation on auth.users insert
  - Workspace owner assignment on creation
  - Provision balance calculation
  - Account balance/reserved/available calculations
  - Transaction validation trigger
  - Rate limiting function

### Security Decisions
- Email verification DISABLED per founder requirement (documented risk)
- SUPPORT_ADMIN cannot access: transactions, provision_ledger, accounts (amounts), monthly_budgets
- Service role key only used server-side, never exposed to browser

---
