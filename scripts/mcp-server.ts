#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
// QUIET=true suppresses console log for .env.local loading if supported, or we just rely on default behavior being quiet(er) in newer versions
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), debug: false });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
        "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const server = new Server(
    {
        name: "mizan-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Helper to pseudonymize a sender ID (e.g. phone number)
 */
function pseudonymize(senderId: string): string {
    // Use a fixed salt from env or a hardcoded one for this demo
    const salt = process.env.PSEUDONYM_SALT || "MIZAN_DEFAULT_SALT_2026";
    return crypto
        .createHmac("sha256", salt)
        .update(senderId)
        .digest("hex")
        .substring(0, 16); // Shorten for readability
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_workspaces",
                description: "List all workspaces available to the admin service",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "list_accounts",
                description: "List accounts for a specific workspace",
                inputSchema: {
                    type: "object",
                    properties: {
                        workspace_id: { type: "string" },
                    },
                    required: ["workspace_id"],
                },
            },
            {
                name: "get_recent_transactions",
                description: "Get the most recent transactions for a workspace",
                inputSchema: {
                    type: "object",
                    properties: {
                        workspace_id: { type: "string" },
                        limit: { type: "number", default: 5 },
                    },
                    required: ["workspace_id"],
                },
            },
            {
                name: "create_transaction",
                description:
                    "Create a new transaction. Supports pseudonymization of sender_id.",
                inputSchema: {
                    type: "object",
                    properties: {
                        workspace_id: { type: "string" },
                        amount: { type: "number", description: "Positive value" },
                        currency: { type: "string", description: "ISO 3-letter code" },
                        type: {
                            type: "string",
                            enum: ["income", "expense"],
                            description: "Transaction type",
                        },
                        description: { type: "string" },
                        sender_id: {
                            type: "string",
                            description:
                                "Optional identifier (e.g. phone number) to be pseudonymized",
                        },
                        account_name_hint: {
                            type: "string",
                            description: "Optional hint to find account (e.g. 'wallet', 'cash')"
                        }
                    },
                    required: [
                        "workspace_id",
                        "amount",
                        "currency",
                        "type",
                        "description",
                    ],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "list_workspaces") {
        const { data, error } = await supabase
            .from("workspaces")
            .select("id, name, created_at")
            .limit(20);

        if (error) throw new Error(`Supabase error: ${error.message}`);
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }

    if (name === "list_accounts") {
        const workspaceId = String(args?.workspace_id);
        const { data, error } = await supabase
            .from("accounts")
            .select("id, name, base_currency, opening_balance")
            .eq("workspace_id", workspaceId);

        if (error) throw new Error(`Supabase error: ${error.message}`);
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }

    if (name === "get_recent_transactions") {
        const workspaceId = String(args?.workspace_id);
        const limit = Number(args?.limit) || 5;

        // Join with category and account for better context
        const { data, error } = await supabase
            .from("transactions")
            .select(`
        id,
        date,
        description,
        base_amount,
        original_currency,
        type,
        accounts (name)
      `)
            .eq("workspace_id", workspaceId)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw new Error(`Supabase error: ${error.message}`);
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }

    if (name === "create_transaction") {
        const workspaceId = String(args?.workspace_id);
        const amount = Number(args?.amount);
        const currency = String(args?.currency);
        const type = String(args?.type) as "income" | "expense";
        let description = String(args?.description);
        const senderId = args?.sender_id ? String(args?.sender_id) : undefined;
        const accountHint = args?.account_name_hint ? String(args?.account_name_hint).toLowerCase() : undefined;

        // 1. Pseudonymization
        if (senderId) {
            const pseudo = pseudonymize(senderId);
            description += ` [Sender: ${pseudo}]`;
        }

        // 2. Resolve Account
        // Try to find account by hint, or default to first one
        let accountId: string;
        let accountData;

        const { data: accounts, error: accError } = await supabase
            .from("accounts")
            .select("id, name, base_currency")
            .eq("workspace_id", workspaceId);

        if (accError || !accounts || accounts.length === 0) {
            throw new Error("No accounts found in workspace");
        }

        if (accountHint) {
            const match = accounts.find(a => a.name.toLowerCase().includes(accountHint));
            if (match) {
                accountData = match;
                accountId = match.id;
            } else {
                // Fallback to first if hint fails? Or error? Let's default to first for robustness but warn conceptually.
                // For now, let's just pick the first one and append a note.
                accountData = accounts[0];
                accountId = accounts[0].id;
                description += ` (Auto-selected account: ${accountData.name})`;
            }
        } else {
            accountData = accounts[0];
            accountId = accounts[0].id;
        }

        // 3. Resolve User (Owner)
        // We need a created_by user. Let's pick the workspace owner.
        const { data: workspace } = await supabase
            .from("workspaces")
            .select("created_by")
            .eq("id", workspaceId)
            .single();

        if (!workspace) throw new Error("Workspace not found");
        const userId = workspace.created_by;

        // 4. Create Transaction
        const sign = type === "income" ? 1 : -1;
        // Simple FX assumption: if currency matches base, 1:1, else we might lack rate.
        // For this MVP, we will assume 1:1 if rate not fetched, or 0 if strictly different.
        // In a real app we'd fetch FX. Here we just set base_amount = amount * sign and assume same currency or 1:1 for MVP.
        // Ideally we should check currencies.

        let fxRate = 1;
        let baseAmount = amount * sign;

        if (accountData.base_currency !== currency) {
            // In real impl, fetch FX.
            // For now, warning in description
            description += ` [FX Unverified: ${currency} -> ${accountData.base_currency}]`;
        }

        const { data: tx, error: txError } = await supabase
            .from("transactions")
            .insert({
                workspace_id: workspaceId,
                account_id: accountId,
                created_by: userId,
                attributed_to_user_id: userId,
                type: type,
                date: new Date().toISOString(),
                description: description,
                original_amount: amount,
                original_currency: currency,
                base_amount: baseAmount,
                fx_rate_used: fxRate,
            })
            .select()
            .single();

        if (txError) throw new Error(`Failed to create transaction: ${txError.message}`);

        return {
            content: [
                {
                    type: "text",
                    text: `Transaction created successfully! ID: ${tx.id}\nDescription: ${tx.description}\nAmount: ${tx.original_amount} ${tx.original_currency}`,
                },
            ],
        };
    }

    throw new Error(`Tool ${name} not found`);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Mizan MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main:", error);
    process.exit(1);
});
