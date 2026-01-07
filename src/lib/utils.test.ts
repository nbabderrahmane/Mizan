import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (className merge utility)', () => {
    it('should merge class names correctly', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        const isActive = true;
        expect(cn('base', isActive && 'active')).toBe('base active');
    });

    it('should handle false conditions', () => {
        const isActive = false;
        expect(cn('base', isActive && 'active')).toBe('base');
    });

    it('should merge Tailwind classes correctly (last wins)', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2');
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle arrays of classes', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects with boolean values', () => {
        expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should handle undefined and null', () => {
        expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle empty inputs', () => {
        expect(cn()).toBe('');
        expect(cn('')).toBe('');
    });
});
