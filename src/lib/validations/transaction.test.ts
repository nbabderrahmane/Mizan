import { describe, it, expect } from 'vitest';
import { createTransactionSchema } from './transaction';

describe('createTransactionSchema', () => {
    const validBase = {
        type: 'expense' as const,
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2026-01-07',
        amount: 100,
        currency: 'USD',
    };

    describe('valid transactions', () => {
        it('should validate a basic expense', () => {
            const result = createTransactionSchema.safeParse(validBase);
            expect(result.success).toBe(true);
        });

        it('should validate an income with all optional fields', () => {
            const result = createTransactionSchema.safeParse({
                ...validBase,
                type: 'income',
                title: 'Salary',
                description: 'Monthly salary',
                vendor: 'Employer Inc',
                categoryId: '123e4567-e89b-12d3-a456-426614174001',
                subcategoryId: '123e4567-e89b-12d3-a456-426614174002',
            });
            expect(result.success).toBe(true);
        });

        it('should validate a transfer with target account', () => {
            const result = createTransactionSchema.safeParse({
                ...validBase,
                type: 'transfer',
                transferAccountId: '123e4567-e89b-12d3-a456-426614174099',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('invalid transactions', () => {
        it('should reject negative amounts', () => {
            const result = createTransactionSchema.safeParse({
                ...validBase,
                amount: -50,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].path).toContain('amount');
            }
        });

        it('should reject invalid date format', () => {
            const result = createTransactionSchema.safeParse({
                ...validBase,
                date: 'not-a-date',
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid currency code', () => {
            const result = createTransactionSchema.safeParse({
                ...validBase,
                currency: 'US', // too short
            });
            expect(result.success).toBe(false);
        });

        it('should reject transfer without target account', () => {
            const result = createTransactionSchema.safeParse({
                ...validBase,
                type: 'transfer',
                transferAccountId: '',
            });
            expect(result.success).toBe(false);
        });

        it('should reject transfer to same account', () => {
            const result = createTransactionSchema.safeParse({
                ...validBase,
                type: 'transfer',
                transferAccountId: validBase.accountId,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('same account');
            }
        });

        it('should reject non-UUID accountId', () => {
            const result = createTransactionSchema.safeParse({
                ...validBase,
                accountId: 'not-a-uuid',
            });
            expect(result.success).toBe(false);
        });
    });
});
