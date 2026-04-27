import { defineCommand } from 'citty';
import { output, outputError, c } from '../output.js';

const BASE_URL = process.env.ROHLIK_BASE_URL || 'https://www.rohlik.cz';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 rohlik-cli/4.0.0';

interface Nutrition {
  per: string;
  energyKj: number | null;
  energyKcal: number | null;
  fat: number | null;
  fatSaturated: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  protein: number | null;
  salt: number | null;
  fiber: number | null;
}

interface ProductDetail {
  id: number;
  name: string;
  brand: string | null;
  amount: string | null;
  price: string | null;
  currency: string | null;
  pricePerUnit: string | null;
  availability: 'InStock' | 'OutOfStock' | 'unknown';
  nutrition: Nutrition | null;
  ingredients: string[] | null;
  allergens: string[] | null;
  origin: string | null;
  categories: string[] | null;
}

function parseNutrition(html: string): Nutrition | null {
  const match = html.match(/Nutriční hodnoty[^<]*na\s+([^<]+)<\/h2><table[^>]*><tbody>(.*?)<\/tbody><\/table>/);
  if (!match) return null;

  const per = match[1].trim();
  const tbody = match[2];
  const rows = [...tbody.matchAll(/<tr[^>]*>(.*?)<\/tr>/g)];

  const values: Record<string, string> = {};
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)];
    if (cells.length >= 2) {
      const label = cells[0][1].replace(/<[^>]+>/g, '').trim();
      const value = cells[1][1].replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      values[label] = value;
    }
  }

  function parseNum(raw: string | undefined): number | null {
    if (!raw) return null;
    const numMatch = raw.match(/([\d.,]+)\s*g/);
    if (!numMatch) return null;
    const num = parseFloat(numMatch[1].replace(',', '.'));
    return isNaN(num) ? null : num;
  }

  function parseEnergy(raw: string | undefined, unit: 'kJ' | 'kCal'): number | null {
    if (!raw) return null;
    const pattern = unit === 'kJ' ? /([\d.,]+)\s*kJ/ : /([\d.,]+)\s*kCal/;
    const m = raw.match(pattern);
    if (!m) return null;
    const num = parseFloat(m[1].replace(',', '.'));
    return isNaN(num) ? null : num;
  }

  const energyRaw = values['Energetická hodnota'];

  return {
    per,
    energyKj: parseEnergy(energyRaw, 'kJ'),
    energyKcal: parseEnergy(energyRaw, 'kCal'),
    fat: parseNum(values['Tuky']),
    fatSaturated: parseNum(values['z toho nasycené mastné kyseliny']),
    carbohydrates: parseNum(values['Sacharidy']),
    sugars: parseNum(values['z toho cukry']),
    protein: parseNum(values['Bílkoviny']),
    salt: parseNum(values['Sůl']),
    fiber: parseNum(values['Vláknina']),
  };
}

function parseIngredients(html: string): string[] | null {
  const idx = html.indexOf('Složení</h');
  if (idx === -1) return null;

  const section = html.slice(idx, idx + 5000);
  const tableMatch = section.match(/<table[^>]*><tbody>(.*?)<\/tbody><\/table>/);
  if (!tableMatch) return null;

  const items = [...tableMatch[1].matchAll(/<span>([^<]+)<\/span>/g)].map(m => m[1].trim());
  return items.length > 0 ? items : null;
}

function parseAllergens(html: string): string[] | null {
  const idx = html.indexOf('Alergeny</h');
  if (idx === -1) return null;

  const section = html.slice(idx, idx + 1000);
  const tableMatch = section.match(/<tbody>(.*?)<\/tbody>/);
  if (!tableMatch) return null;

  const items = [...tableMatch[1].matchAll(/<td>([^<]+)<\/td>/g)].map(m => m[1].trim());
  return items.length > 0 ? items : null;
}

function parseJsonLd(html: string): { name: string; brand: string | null; price: string | null; currency: string | null; availability: 'InStock' | 'OutOfStock' | 'unknown'; categories: string[] | null } | null {
  const match = html.match(/<script type="application\/ld\+json">({"@context":"https:\/\/schema\.org","@type":"Product".*?})<\/script>/);
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    const categoryStr: string | undefined = data.category;
    const categories = categoryStr
      ? categoryStr.split(' > ').map((c: string) => c.trim())
      : null;

    const availabilityRaw: string | undefined = data.offers?.availability;
    const availability: 'InStock' | 'OutOfStock' | 'unknown' =
      availabilityRaw?.endsWith('InStock') ? 'InStock'
      : availabilityRaw?.endsWith('OutOfStock') ? 'OutOfStock'
      : 'unknown';

    return {
      name: data.name || '',
      brand: data.brand?.name || null,
      price: data.offers?.price?.toString() || null,
      currency: data.offers?.priceCurrency || null,
      availability,
      categories,
    };
  } catch {
    return null;
  }
}

function parseAmount(html: string): string | null {
  const match = html.match(/<span[^>]*>\s*(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|ks))\s*<\/span>/i);
  return match ? match[1].trim() : null;
}

function parsePricePerUnit(html: string): string | null {
  const match = html.match(/(\d+[.,]\d+\s*Kč\/[a-záčďéěíňóřšťúůýž]+)/i);
  return match ? match[1] : null;
}

function parseOrigin(html: string): string | null {
  const match = html.match(/Země původu[^<]*<\/h3>\s*<span>(.*?)<\/span>\s*<br>/);
  if (!match) return null;
  const countries = [...match[1].matchAll(/class="categoryName">([^<]+)/g)].map(m => m[1].trim());
  return countries.length > 0 ? countries.join(', ') : null;
}

async function fetchProductPage(productId: number): Promise<string> {
  const response = await fetch(`${BASE_URL}/${productId}`, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
  });

  if (response.status === 404) {
    throw new Error(`Product ${productId} not found`);
  }

  if (response.status === 429) {
    throw new Error(`Rate limited by Rohlik API. Try again later.`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

function formatHumanOutput(product: ProductDetail): string {
  const lines: string[] = [];

  lines.push(c.header(`${product.name}`));
  if (product.brand) lines.push(`  ${c.label('Značka:')} ${c.brand(product.brand)}`);
  if (product.amount) lines.push(`  ${c.label('Množství:')} ${product.amount}`);
  if (product.price) lines.push(`  ${c.label('Cena:')} ${c.price(`${product.price} ${product.currency || 'Kč'}`)}`);
  if (product.pricePerUnit) lines.push(`  ${c.label('Cena za jednotku:')} ${product.pricePerUnit}`);
  const availabilityLabel = product.availability === 'InStock'
    ? c.success('skladem')
    : product.availability === 'OutOfStock'
      ? c.warn('vyprodáno')
      : c.dim('neznámé');
  lines.push(`  ${c.label('Dostupnost:')} ${availabilityLabel}`);
  lines.push(`  ${c.dim(`ID: ${product.id}`)}`);

  if (product.nutrition) {
    const n = product.nutrition;
    lines.push('');
    lines.push(c.header(`Nutriční hodnoty na ${n.per}`));
    lines.push(`  ${c.label('Energie:')} ${n.energyKj ?? '—'} kJ / ${n.energyKcal ?? '—'} kcal`);
    lines.push(`  ${c.label('Tuky:')} ${n.fat ?? '—'} g ${c.dim(`(nasycené: ${n.fatSaturated ?? '—'} g)`)}`);
    lines.push(`  ${c.label('Sacharidy:')} ${n.carbohydrates ?? '—'} g ${c.dim(`(cukry: ${n.sugars ?? '—'} g)`)}`);
    lines.push(`  ${c.label('Bílkoviny:')} ${n.protein ?? '—'} g`);
    lines.push(`  ${c.label('Sůl:')} ${n.salt ?? '—'} g`);
    lines.push(`  ${c.label('Vláknina:')} ${n.fiber ?? '—'} g`);
  }

  if (product.ingredients) {
    lines.push('');
    lines.push(c.header('Složení'));
    lines.push(`  ${product.ingredients.join(', ')}`);
  }

  if (product.allergens) {
    lines.push('');
    lines.push(c.header('Alergeny'));
    lines.push(`  ${product.allergens.join(', ')}`);
  }

  if (product.origin) {
    lines.push('');
    lines.push(`  ${c.label('Země původu:')} ${product.origin}`);
  }

  if (product.categories) {
    lines.push('');
    lines.push(`  ${c.label('Kategorie:')} ${product.categories.join(' > ')}`);
  }

  return lines.join('\n');
}

export const productCommand = defineCommand({
  meta: {
    name: 'product',
    description: 'View product detail with nutrition info'
  },
  args: {
    id: {
      type: 'positional',
      description: 'Product ID',
      required: true
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false
    }
  },
  async run({ args }) {
    const productId = parseInt(args.id, 10);
    if (isNaN(productId) || productId <= 0) {
      outputError('Invalid product ID — must be a positive number', { json: args.json });
      return;
    }

    try {
      const html = await fetchProductPage(productId);

      const jsonLd = parseJsonLd(html);
      const nutrition = parseNutrition(html);
      const ingredients = parseIngredients(html);
      const allergens = parseAllergens(html);
      const amount = parseAmount(html);
      const pricePerUnit = parsePricePerUnit(html);
      const origin = parseOrigin(html);

      const product: ProductDetail = {
        id: productId,
        name: jsonLd?.name || `Product ${productId}`,
        brand: jsonLd?.brand || null,
        amount,
        price: jsonLd?.price || null,
        currency: jsonLd?.currency || null,
        pricePerUnit,
        availability: jsonLd?.availability ?? 'unknown',
        nutrition,
        ingredients,
        allergens,
        origin,
        categories: jsonLd?.categories || null,
      };

      output(product, formatHumanOutput(product), { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});
