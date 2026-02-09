/**
 * Utility function to get the display name for a category or subcategory.
 * Uses the translated key if available, otherwise falls back to the stored name.
 * 
 * Usage in components:
 * const t = useTranslations("Categories");
 * const displayName = getCategoryDisplayName(category, (key) => t(`keys.${key}`));
 */
export function getCategoryDisplayName(
    item: { key?: string | null; name: string },
    translateKey: (key: string) => string
): string {
    if (item.key) {
        try {
            const translated = translateKey(item.key);
            // next-intl returns the key if translation is missing
            if (translated && translated !== item.key && !translated.startsWith("keys.")) {
                return translated;
            }
        } catch {
            // Translation failed, use name
        }
    }
    return item.name;
}
