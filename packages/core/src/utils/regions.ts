export interface Region {
  code: string
  name: string
}

/**
 * All regions supported by the WatchWhere API.
 * Codes follow ISO 3166-1 alpha-2.
 */
export const SUPPORTED_REGIONS: Region[] = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'PL', name: 'Poland' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'ZA', name: 'South Africa' },
]

// Build a fast lookup map at module-load time
const REGION_MAP: Map<string, string> = new Map(
  SUPPORTED_REGIONS.map((r) => [r.code.toUpperCase(), r.name]),
)

/**
 * Returns the full region name for a given ISO 3166-1 alpha-2 code.
 * Case-insensitive. Returns the code itself when not found.
 *
 * @example
 * getRegionName('US') // → 'United States'
 * getRegionName('gb') // → 'United Kingdom'
 * getRegionName('XX') // → 'XX'
 */
export function getRegionName(code: string): string {
  return REGION_MAP.get(code.toUpperCase()) ?? code
}

/**
 * Returns true when the given code is in the supported regions list.
 */
export function isRegionSupported(code: string): boolean {
  return REGION_MAP.has(code.toUpperCase())
}

/**
 * Returns regions sorted alphabetically by name — useful for dropdowns.
 */
export function getSortedRegions(): Region[] {
  return [...SUPPORTED_REGIONS].sort((a, b) => a.name.localeCompare(b.name))
}
