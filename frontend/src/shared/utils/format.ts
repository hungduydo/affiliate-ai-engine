export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

const SOURCE_CURRENCY: Record<string, string> = {
  SHOPEE: 'VND',
  LAZADA: 'VND',
};

export function formatProductPrice(value: number, source: string): string {
  const currency = SOURCE_CURRENCY[source.toUpperCase()] ?? 'USD';
  return formatCurrency(value, currency);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function truncate(str: string, maxLength = 80): string {
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}
