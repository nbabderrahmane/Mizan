/**
 * Structured Logger for Mizan
 * 
 * Provides correlation IDs for request tracing and structured logging.
 * NEVER logs sensitive data: passwords, tokens, amounts, balances.
 */

import { v4 as uuidv4 } from "uuid";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
    correlationId: string;
    action?: string;
    userId?: string;
    workspaceId?: string;
    entityType?: string;
    entityId?: string;
    durationMs?: number;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

function getConfiguredLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    return LOG_LEVELS[envLevel] !== undefined ? envLevel : "info";
}

function shouldLog(level: LogLevel): boolean {
    const configuredLevel = getConfiguredLogLevel();
    return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

/**
 * Sanitize context to remove any potentially sensitive fields.
 * This is a safety net - callers should never pass sensitive data.
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
        "password",
        "token",
        "accessToken",
        "refreshToken",
        "apiKey",
        "secret",
        "amount",
        "balance",
        "openingBalance",
        "baseAmount",
        "originalAmount",
        "fxRate",
        "creditCard",
        "ssn",
        "anonKey",
        "serviceRoleKey",
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(
            (sensitive) =>
                lowerKey.includes(sensitive.toLowerCase()) ||
                sensitive.toLowerCase().includes(lowerKey)
        );

        if (isSensitive) {
            sanitized[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
            sanitized[key] = sanitizeContext(value as Record<string, unknown>);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

function formatLogEntry(entry: LogEntry): string {
    // In development, use pretty formatting
    if (process.env.NODE_ENV === "development") {
        const { timestamp, level, message, context, error } = entry;
        const levelColors: Record<LogLevel, string> = {
            debug: "\x1b[36m", // cyan
            info: "\x1b[32m",  // green
            warn: "\x1b[33m",  // yellow
            error: "\x1b[31m", // red
        };
        const reset = "\x1b[0m";
        const color = levelColors[level];

        let output = `${color}[${level.toUpperCase()}]${reset} ${timestamp} | ${message}`;
        output += ` | cid:${context.correlationId.substring(0, 8)}`;

        if (context.action) output += ` | action:${context.action}`;
        if (context.userId) output += ` | user:${context.userId.substring(0, 8)}`;
        if (context.workspaceId) output += ` | ws:${context.workspaceId.substring(0, 8)}`;
        if (context.durationMs !== undefined) output += ` | ${context.durationMs}ms`;

        if (error) {
            output += `\n  Error: ${error.message}`;
            if (error.stack && level === "error") {
                output += `\n${error.stack}`;
            }
        }

        return output;
    }

    // In production, use JSON for structured logging
    return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context: LogContext, error?: Error): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context: sanitizeContext(context) as LogContext,
    };

    if (error) {
        entry.error = {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    const formatted = formatLogEntry(entry);

    switch (level) {
        case "debug":
        case "info":
            console.log(formatted);
            break;
        case "warn":
            console.warn(formatted);
            break;
        case "error":
            console.error(formatted);
            break;
    }
}

/**
 * Creates a logger instance with a correlation ID.
 * Use this at the start of each request/action.
 */
export function createLogger(existingCorrelationId?: string) {
    const correlationId = existingCorrelationId || uuidv4();

    return {
        correlationId,

        debug(message: string, context: Partial<LogContext> = {}) {
            log("debug", message, { ...context, correlationId });
        },

        info(message: string, context: Partial<LogContext> = {}) {
            log("info", message, { ...context, correlationId });
        },

        warn(message: string, context: Partial<LogContext> = {}) {
            log("warn", message, { ...context, correlationId });
        },

        error(message: string, error?: Error, context: Partial<LogContext> = {}) {
            log("error", message, { ...context, correlationId }, error);
        },

        /**
         * Create a child logger with additional default context
         */
        child(additionalContext: Partial<LogContext>) {
            const childCorrelationId = correlationId;
            return {
                correlationId: childCorrelationId,

                debug(message: string, context: Partial<LogContext> = {}) {
                    log("debug", message, { ...additionalContext, ...context, correlationId: childCorrelationId });
                },

                info(message: string, context: Partial<LogContext> = {}) {
                    log("info", message, { ...additionalContext, ...context, correlationId: childCorrelationId });
                },

                warn(message: string, context: Partial<LogContext> = {}) {
                    log("warn", message, { ...additionalContext, ...context, correlationId: childCorrelationId });
                },

                error(message: string, error?: Error, context: Partial<LogContext> = {}) {
                    log("error", message, { ...additionalContext, ...context, correlationId: childCorrelationId }, error);
                },
            };
        },

        /**
         * Helper to measure and log duration of async operations
         */
        async timed<T>(
            action: string,
            fn: () => Promise<T>,
            context: Partial<LogContext> = {}
        ): Promise<T> {
            const start = Date.now();
            try {
                const result = await fn();
                const durationMs = Date.now() - start;
                log("info", `${action} completed`, { ...context, correlationId, action, durationMs });
                return result;
            } catch (error) {
                const durationMs = Date.now() - start;
                log("error", `${action} failed`, { ...context, correlationId, action, durationMs }, error as Error);
                throw error;
            }
        },
    };
}

export type Logger = ReturnType<typeof createLogger>;

/**
 * Creates a safe error message for client-side display.
 * Detailed error info stays on the server (logged with correlation ID).
 */
export function createSafeError(
    userMessage: string,
    correlationId: string
): { message: string; correlationId: string } {
    return {
        message: userMessage,
        correlationId,
    };
}
