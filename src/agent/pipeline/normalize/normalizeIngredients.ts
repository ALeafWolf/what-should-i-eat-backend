/**
 * Normalizes a list of ingredient strings into a consistent internal format.
 * Phase 2: trim whitespace, lowercase, resolve aliases, remove duplicates.
 */
export function normalizeIngredients(raw: string[]): string[] {
  // TODO: implement full normalization in Phase 2
  // - trim and lowercase each ingredient
  // - resolve common aliases (e.g. "egg" -> "eggs", "春卷皮" -> "spring roll wrappers")
  // - remove duplicates
  // - filter empty strings
  return [...new Set(raw.map((i) => i.trim()).filter(Boolean))];
}
