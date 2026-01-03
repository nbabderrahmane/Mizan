"use server";

import { createClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";

const FX_API_URL = "https://open.er-api.com/v6/latest";
const CACHE_TTL_HOURS = 12;

/**
 * Get FX rate from cache or external API.
 * Returns the rate to convert 1 unit of `from` currency to `to` currency.
 */
export async function getFxRate(from: string, to: string): Promise<number> {
    const logger = createLogger();
    logger.info("getFxRate called", { from, to });

    // Same currency = 1.0
    if (from.toUpperCase() === to.toUpperCase()) {
        return 1.0;
    }

    const supabase = await createClient();

    // 1. Check cache
    const { data: cached } = await supabase
        .from("fx_rates")
        .select("rate, expires_at")
        .eq("base_currency", from.toUpperCase())
        .eq("quote_currency", to.toUpperCase())
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .single();

    if (cached) {
        logger.debug("FX rate from cache", { from, to, rate: cached.rate });
        return Number(cached.rate);
    }

    // 2. Fetch from API
    try {
        const url = `${FX_API_URL}/${from.toUpperCase()}`;
        const response = await fetch(url, { next: { revalidate: 43200 } }); // 12h

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`FX API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.result !== "success") {
            throw new Error(`FX API returned result: ${data.result}`);
        }

        const rate = data.rates?.[to.toUpperCase()];
        if (!rate) {
            throw new Error(`Rate not found for ${from} -> ${to}`);
        }

        // 3. Cache the rate
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

        await supabase.from("fx_rates").upsert({
            base_currency: from.toUpperCase(),
            quote_currency: to.toUpperCase(),
            rate: rate,
            expires_at: expiresAt.toISOString(),
            source: "frankfurter.app",
        }, {
            onConflict: "base_currency,quote_currency",
        });

        logger.info("FX rate fetched and cached", { from, to, rate });
        return Number(rate);

    } catch (error) {
        logger.error("Failed to fetch FX rate", error as Error, { from, to });

        // Fallback: try expired cache
        const { data: expiredCache } = await supabase
            .from("fx_rates")
            .select("rate")
            .eq("base_currency", from.toUpperCase())
            .eq("quote_currency", to.toUpperCase())
            .order("expires_at", { ascending: false })
            .limit(1)
            .single();

        if (expiredCache) {
            logger.warn("Using expired FX rate", { from, to, rate: expiredCache.rate });
            return Number(expiredCache.rate);
        }

        // No cache available, throw
        throw new Error(`Unable to get FX rate for ${from} -> ${to}`);
    }
}

/**
 * Server action wrapper for client components.
 */
export async function fetchFxRateAction(from: string, to: string): Promise<{ success: boolean; rate?: number; error?: string }> {
    try {
        const rate = await getFxRate(from, to);
        return { success: true, rate };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
