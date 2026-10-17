export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'NZD',
  'CHF',
  'CNY',
  'HKD',
  'SGD',
  'PHP',
  'INR',
  'KRW',
  'MXN',
  'BRL',
  'ZAR',
  'SEK',
  'NOK',
  'DKK',
];

const digitsCache = new Map<string, number>();

/** Number of minor-unit digits for a currency (USD → 2, JPY → 0). */
export function minorDigits(currency: string): number {
  let digits = digitsCache.get(currency);
  if (digits === undefined) {
    try {
      digits =
        new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
          .maximumFractionDigits ?? 2;
    } catch {
      digits = 2;
    }
    digitsCache.set(currency, digits);
  }
  return digits;
}

/**
 * Parses user input like "1,234.5" into minor units (123450 for USD).
 * Returns null for anything that isn't a valid amount for the currency.
 */
export function parseToMinor(input: string, currency: string): number | null {
  const s = input.trim().replace(/[,\s]/g, '');
  const digits = minorDigits(currency);
  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(s);
  if (!match) return null;
  const [, minus, whole = '', frac = ''] = match;
  if (whole === '' && frac === '') return null;
  if (frac.length > digits) return null;
  const value = Number(whole || '0') * 10 ** digits + Number(frac.padEnd(digits, '0') || '0');
  if (!Number.isSafeInteger(value)) return null;
  return minus && value !== 0 ? -value : value;
}

/** Minor units → plain editable string, e.g. 123450 → "1234.50". */
export function minorToInput(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  const sign = minor < 0 ? '-' : '';
  const abs = String(Math.abs(minor)).padStart(digits + 1, '0');
  if (digits === 0) return sign + abs;
  return `${sign}${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
}

export function formatMinor(
  minor: number,
  currency: string,
  options: { signed?: boolean; locale?: string } = {},
): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency,
    signDisplay: options.signed ? 'exceptZero' : 'auto',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .format(minor / 10 ** digits)
    .replace('-', '\u2212'); // typographic minus, as in the design
}

export function currencySymbol(currency: string, locale?: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}
