/**
 * Currency Normalization Utility
 * Normalizes 2-letter country/region codes from Investing.com exports
 * (e.g. US, UK, EU, DE, FR, IT, ES, JP, AU, NZ, CA, CH) to standard 3-letter G10 currency codes.
 */

export const G10_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'NZD',
  'CAD',
  'CHF',
] as const;

export type G10Currency = typeof G10_CURRENCIES[number];

/**
 * Mapping table from Investing.com country/region codes and names to G10 currency codes.
 * Crucially:
 * - US -> USD
 * - UK / GB -> GBP
 * - JP -> JPY
 * - AU -> AUD
 * - NZ -> NZD
 * - CA -> CAD
 * - CH -> CHF
 * - Eurozone members (EU, DE, FR, IT, ES, NL, BE, AT, IE, PT, FI, GR) -> EUR
 */
export const INVESTING_COUNTRY_TO_CURRENCY_MAP: Record<string, string> = {
  // United States
  'US': 'USD',
  'USA': 'USD',
  'UNITED STATES': 'USD',
  'ESTADOS UNIDOS': 'USD',
  'EEUU': 'USD',
  'EE.UU.': 'USD',
  'USD': 'USD',

  // United Kingdom
  'UK': 'GBP',
  'GB': 'GBP',
  'GBR': 'GBP',
  'UNITED KINGDOM': 'GBP',
  'REINO UNIDO': 'GBP',
  'ENGLAND': 'GBP',
  'INGLATERRA': 'GBP',
  'GBP': 'GBP',

  // Eurozone & Eurozone Member States (EU, DE, FR, IT, ES all map to EUR)
  'EU': 'EUR',
  'EMU': 'EUR',
  'EURO': 'EUR',
  'EUROZONE': 'EUR',
  'EURO ZONE': 'EUR',
  'ZONA EURO': 'EUR',
  'DE': 'EUR', // Germany
  'DEU': 'EUR',
  'GERMANY': 'EUR',
  'ALEMANIA': 'EUR',
  'FR': 'EUR', // France
  'FRA': 'EUR',
  'FRANCE': 'EUR',
  'FRANCIA': 'EUR',
  'IT': 'EUR', // Italy
  'ITA': 'EUR',
  'ITALY': 'EUR',
  'ITALIA': 'EUR',
  'ES': 'EUR', // Spain
  'ESP': 'EUR',
  'SPAIN': 'EUR',
  'ESPAÑA': 'EUR',
  'ESPANA': 'EUR',
  'NL': 'EUR', // Netherlands
  'NLD': 'EUR',
  'NETHERLANDS': 'EUR',
  'HOLANDA': 'EUR',
  'PAISES BAJOS': 'EUR',
  'BE': 'EUR', // Belgium
  'BEL': 'EUR',
  'BELGIUM': 'EUR',
  'BÉLGICA': 'EUR',
  'BELGICA': 'EUR',
  'AT': 'EUR', // Austria
  'AUT': 'EUR',
  'AUSTRIA': 'EUR',
  'IE': 'EUR', // Ireland
  'IRL': 'EUR',
  'IRELAND': 'EUR',
  'IRLANDA': 'EUR',
  'PT': 'EUR', // Portugal
  'PRT': 'EUR',
  'PORTUGAL': 'EUR',
  'FI': 'EUR', // Finland
  'FIN': 'EUR',
  'FINLAND': 'EUR',
  'FINLANDIA': 'EUR',
  'GR': 'EUR', // Greece
  'GRC': 'EUR',
  'GREECE': 'EUR',
  'GRECIA': 'EUR',
  'EUR': 'EUR',

  // Japan
  'JP': 'JPY',
  'JPN': 'JPY',
  'JAPAN': 'JPY',
  'JAPÓN': 'JPY',
  'JAPON': 'JPY',
  'NIPPON': 'JPY',
  'JPY': 'JPY',

  // Australia
  'AU': 'AUD',
  'AUS': 'AUD',
  'AUSTRALIA': 'AUD',
  'AUD': 'AUD',

  // New Zealand
  'NZ': 'NZD',
  'NZL': 'NZD',
  'NEW ZEALAND': 'NZD',
  'NUEVA ZELANDA': 'NZD',
  'NZD': 'NZD',

  // Canada
  'CA': 'CAD',
  'CAN': 'CAD',
  'CANADA': 'CAD',
  'CANADÁ': 'CAD',
  'CAD': 'CAD',

  // Switzerland
  'CH': 'CHF',
  'CHE': 'CHF',
  'SWITZERLAND': 'CHF',
  'SUIZA': 'CHF',
  'CONFEDERATION': 'CHF',
  'CHF': 'CHF',

  // China (support for broader macro coverage)
  'CN': 'CNH',
  'CHN': 'CNH',
  'CHINA': 'CNH',
  'CNH': 'CNH',
  'CNY': 'CNH',
};

/**
 * Normalizes a raw country/region/currency string from an economic calendar export
 * into a standard 3-letter currency code (e.g. 'US' -> 'USD', 'DE' -> 'EUR', 'USD' -> 'USD').
 *
 * @param rawInput Raw value from 'Cur.', 'Currency', 'Country', or 'Zone' column
 * @returns 3-letter currency code if mapped or recognized, or the cleaned string/fallback
 */
export function normalizeCurrencyCode(rawInput: any): string {
  if (rawInput === null || rawInput === undefined) return '';

  const str = String(rawInput)
    .trim()
    .replace(/[\u00A0\u200B\r\n\t]/g, '')
    .toUpperCase();

  if (!str) return '';

  // Direct lookup in map
  if (INVESTING_COUNTRY_TO_CURRENCY_MAP[str]) {
    return INVESTING_COUNTRY_TO_CURRENCY_MAP[str];
  }

  // Accent-insensitive / normalized lookup (e.g. 'Japón' -> 'JAPON', 'España' -> 'ESPANA')
  const unaccented = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

  if (INVESTING_COUNTRY_TO_CURRENCY_MAP[unaccented]) {
    return INVESTING_COUNTRY_TO_CURRENCY_MAP[unaccented];
  }

  // Letters-only extraction (e.g. ' US ' or 'cur: US' or 'US (United States)')
  const lettersOnly = str.replace(/[^A-Z]/g, '');
  if (INVESTING_COUNTRY_TO_CURRENCY_MAP[lettersOnly]) {
    return INVESTING_COUNTRY_TO_CURRENCY_MAP[lettersOnly];
  }

  // Check 2-letter prefix if string has extra annotations (e.g. 'US - High', 'DE 10Y')
  if (lettersOnly.length > 2) {
    const firstTwo = lettersOnly.slice(0, 2);
    if (INVESTING_COUNTRY_TO_CURRENCY_MAP[firstTwo]) {
      return INVESTING_COUNTRY_TO_CURRENCY_MAP[firstTwo];
    }
  }

  // If already standard 3-letter code or unrecognized string, return cleaned version
  return lettersOnly || str;
}

/**
 * Checks whether a normalized currency code belongs to the G10 universe.
 */
export function isG10Currency(code: string): code is G10Currency {
  return (G10_CURRENCIES as readonly string[]).includes(code);
}
