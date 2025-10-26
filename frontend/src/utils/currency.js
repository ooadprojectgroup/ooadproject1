// Simple currency formatter for Sri Lankan Rupees (LKR)
// Usage: import { formatLKR } from '../utils/currency'; formatLKR(12345.67)
export function formatLKR(amount, options = {}) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return 'රු 0.00';
  // Allow overriding locale/currency/min/max fraction digits via options
  const {
    locale = 'en-LK',
    currency = 'LKR',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    // symbol | code | name; default to symbol but allow callers to force 'LKR'
    currencyDisplay = 'symbol',
  } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(Number(amount));
  } catch (e) {
    // Fallback if Intl not available for some reason
    const n = Number(amount).toFixed(2);
    return `LKR ${n}`;
  }
}
