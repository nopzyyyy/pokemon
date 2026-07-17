export const CAD_TO_USD_RATE = 0.7118;

export function convertCadToUsd(cadAmount: number): number {
  return Math.round(cadAmount * CAD_TO_USD_RATE);
}

export function formatMoney(amount: number, currency: 'USD' | 'CAD'): string {
  const fractionDigits = currency === 'USD' ? 0 : 2;
  return `$${amount.toFixed(fractionDigits)} ${currency}`;
}
