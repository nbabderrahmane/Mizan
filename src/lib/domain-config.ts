/**
 * Domain-based configuration for multi-tenant customization.
 * 
 * Maps email domains to specific themes and workspace auto-join behavior.
 */

export interface DomainConfig {
    /** Theme name to apply (matches data-theme attribute in CSS) */
    theme: string;
    /** Workspace ID to auto-join on signup (if any) */
    autoJoinWorkspaceId?: string;
    /** Workspace name for display/creation */
    workspaceName?: string;
    /** Role to assign on auto-join */
    autoJoinRole: "VIEWER" | "CONTRIBUTOR" | "MANAGER";
    /** Custom app title override */
    appTitle?: string;
    /** Custom logo path */
    logoPath?: string;
}

/**
 * Domain configurations.
 * Add new domains here to enable custom branding and auto-join.
 */
export const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
    // Entries removed to revert to Mizan defaults
};

/**
 * Get domain config from email address.
 * Returns undefined if no custom config for this domain.
 */
export function getDomainConfig(email: string): DomainConfig | undefined {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return undefined;
    return DOMAIN_CONFIGS[domain];
}

/**
 * Check if an email belongs to a configured custom domain.
 */
export function isCustomDomain(email: string): boolean {
    return getDomainConfig(email) !== undefined;
}

/**
 * Get theme name for an email, or "default" if no custom theme.
 */
export function getThemeForEmail(email: string): string {
    return getDomainConfig(email)?.theme ?? "default";
}
