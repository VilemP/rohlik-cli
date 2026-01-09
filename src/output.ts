import pc from 'picocolors';

export interface OutputOptions {
  json?: boolean;
}

export const c = {
  header: (s: string) => pc.bold(pc.cyan(s)),
  label: (s: string) => pc.dim(s),
  value: (s: string) => pc.white(s),
  price: (s: string) => pc.green(s),
  id: (s: string) => pc.yellow(s),
  success: (s: string) => pc.green(s),
  error: (s: string) => pc.red(s),
  warn: (s: string) => pc.yellow(s),
  dim: (s: string) => pc.dim(s),
  brand: (s: string) => pc.magenta(s),
  category: (s: string) => pc.blue(s),
};

export function output(data: unknown, humanFormat: string, options: OutputOptions = {}): void {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(humanFormat);
  }
}

export function outputError(message: string, options: OutputOptions = {}): void {
  if (options.json) {
    console.error(JSON.stringify({ error: message }));
  } else {
    console.error(c.error(`Error: ${message}`));
  }
  process.exit(1);
}

export function formatPrice(price: number | { amount: number; currency: string }, defaultCurrency = '€'): string {
  if (typeof price === 'object' && price !== null) {
    return c.price(`${price.amount.toFixed(2)} ${price.currency}`);
  }
  return c.price(`${price.toFixed(2)} ${defaultCurrency}`);
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export function formatTable(
  items: Record<string, unknown>[],
  columns: { key: string; label: string; width?: number }[]
): string {
  if (items.length === 0) return 'No items found.';

  const rows = items.map(item =>
    columns.map(col => String(item[col.key] ?? '')).join(' | ')
  );

  const header = columns.map(col => col.label).join(' | ');
  const separator = columns.map(col => '-'.repeat(col.label.length)).join('-+-');

  return [header, separator, ...rows].join('\n');
}
