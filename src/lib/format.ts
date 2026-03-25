const CURRENCY_CONFIG: Record<string, { locale: string; currency: string }> = {
  INR: { locale: "en-IN", currency: "INR" },
  USD: { locale: "en-US", currency: "USD" },
  GBP: { locale: "en-GB", currency: "GBP" },
  EUR: { locale: "en-DE", currency: "EUR" },
};

const DEFAULT_CURRENCY = "INR";

export function formatCurrency(amount: number, currency?: string) {
  const code = currency || DEFAULT_CURRENCY;
  const config = CURRENCY_CONFIG[code] || CURRENCY_CONFIG[DEFAULT_CURRENCY];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
  }).format(amount);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "\u20B9", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "\u00A3", label: "British Pound" },
  { code: "EUR", symbol: "\u20AC", label: "Euro" },
];
