import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBalanceHistoryAction } from '@/lib/actions/dashboard';
import { getCachedBalanceHistory } from '@/lib/data/dashboard-cached'; // Real module
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import * as dashboardData from '@/lib/data/dashboard'; // For spying on fetchBalanceHistory

// 1. Mock Next.js cache to be a transparent pass-through
vi.mock('next/cache', () => ({
    unstable_cache: (fn: any) => fn, // Immediate execution
}));

// 2. Mock Supabase Clients
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}));

// 3. Spy on the data fetcher (to ensure it's not called when unauthorized)
// We use vi.spyOn to keep original implementation or mock it
const fetchBalanceSpy = vi.spyOn(dashboardData, 'getBalanceHistory');
fetchBalanceSpy.mockResolvedValue([]);

describe('Security Regression Suite', () => {
    const mockCreateClient = createClient as any;
    const mockCreateAdminClient = createAdminClient as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Call-Site Guard (getBalanceHistoryAction)', () => {
        it('should deny access if user is not logged in', async () => {
            // Mock Auth: No User
            mockCreateClient.mockResolvedValue({
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
                },
            });

            const result = await getBalanceHistoryAction('ws-1', '30d');
            expect(result.success).toBe(false);
            expect(result.error).toBe("Unauthorized");
        });

        it('should deny access if user is NOT a member (Action Layer)', async () => {
            // Mock Auth: Valid User
            const mockSupabase = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-X' } } }),
                },
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({ data: null }), // Member NOT found
                            }),
                        }),
                    }),
                }),
            };
            mockCreateClient.mockResolvedValue(mockSupabase);

            const result = await getBalanceHistoryAction('ws-1', '30d');
            expect(result.success).toBe(false);
            expect(result.error).toBe("Unauthorized");
            // Cached function should NOT be called (implied by Action logic return)
        });
    });

    describe('Internal Guard (getCachedBalanceHistory)', () => {
        it('should THROW and NOT call fetcher if internal membership check fails', async () => {
            // Setup Admin Client Mock to fail membership check
            const mockAdmin = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({ data: null }), // Fail internal check
                            }),
                        }),
                    }),
                }),
            };
            mockCreateAdminClient.mockReturnValue(mockAdmin);

            // Expect call to throw "Unauthorized"
            // Note: Since we mocked unstable_cache as pass-through, this runs immediately.
            await expect(getCachedBalanceHistory('ws-1', 'user-attacker', '30d'))
                .rejects.toThrow("Unauthorized");

            // CRITICAL: Ensure the privileged data fetcher was NEVER called
            expect(fetchBalanceSpy).not.toHaveBeenCalled();
        });

        it('should succeed and call fetcher if internal membership check passes', async () => {
            // Setup Admin Client Mock to PASS membership check
            const mockAdmin = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'user-ok' } }), // Pass
                            }),
                        }),
                    }),
                }),
            };
            mockCreateAdminClient.mockReturnValue(mockAdmin);
            fetchBalanceSpy.mockResolvedValue([{ date: '2024-01-01', balance: 500 }]);

            const result = await getCachedBalanceHistory('ws-1', 'user-ok', '30d');
            expect(result).toHaveLength(1);
            expect(result[0].balance).toBe(500);

            // CRITICAL: Ensure fetcher WAS called
            expect(fetchBalanceSpy).toHaveBeenCalled();
        });
    });
});
