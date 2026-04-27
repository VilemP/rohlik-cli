import { defineCommand } from 'citty';
import { readFileSync } from 'node:fs';
import { RohlikAPI } from '../rohlik-api.js';
import { output, outputError, formatPrice, c } from '../output.js';
import { getCredentials } from './utils.js';

const viewCart = defineCommand({
  meta: {
    name: 'view',
    description: 'View cart contents'
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false
    }
  },
  async run({ args }) {
    const credentials = getCredentials();
    if (!credentials) {
      outputError('Missing ROHLIK_USERNAME or ROHLIK_PASSWORD environment variables', { json: args.json });
    }

    const api = new RohlikAPI(credentials!);

    try {
      const cart = await api.getCartContent();

      if (cart.total_items === 0) {
        output(cart, 'Your cart is empty.', { json: args.json });
        return;
      }

      const humanOutput = `${c.header('Cart Summary')}
${c.label('Total items:')} ${cart.total_items}
${c.label('Total price:')} ${formatPrice(cart.total_price)}
${c.label('Can order:')} ${cart.can_make_order ? c.success('Yes') : c.warn('No')}

${c.header('Products:')}
${cart.products.map(p =>
  `${c.value(p.name)} ${c.brand(`(${p.brand})`)}
  ${c.label('Qty:')} ${p.quantity} ${c.label('|')} ${c.label('Price:')} ${formatPrice(p.price)} ${c.label('|')} ${c.label('Category:')} ${c.category(p.category_name)}
  ${c.dim(`Cart ID: ${p.cart_item_id}`)}`
).join('\n\n')}`;

      output(cart, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});

const addToCart = defineCommand({
  meta: {
    name: 'add',
    description: 'Add product to cart'
  },
  args: {
    id: {
      type: 'positional',
      description: 'Product ID',
      required: true
    },
    quantity: {
      type: 'string',
      description: 'Quantity (default: 1)',
      default: '1'
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false
    }
  },
  async run({ args }) {
    const credentials = getCredentials();
    if (!credentials) {
      outputError('Missing ROHLIK_USERNAME or ROHLIK_PASSWORD environment variables', { json: args.json });
    }

    const api = new RohlikAPI(credentials!);
    const productId = parseInt(args.id, 10);
    const quantity = parseInt(args.quantity, 10);

    if (isNaN(productId)) {
      outputError('Invalid product ID', { json: args.json });
    }

    try {
      const { addedIds, failures } = await api.addToCart([{ product_id: productId, quantity }]);
      const success = addedIds.length > 0;
      const failure = failures[0];

      const result = { success, productId, quantity, failure };
      const humanOutput = success
        ? `Added product ${productId} (qty: ${quantity}) to cart.`
        : `Failed to add product ${productId} (${failure?.reason ?? 'unknown'})${failure?.message ? `: ${failure.message}` : ''}.`;

      output(result, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});

interface BatchEntry {
  productId: number;
  quantity: number;
  label: string;
}

const parseBatchFile = (path: string): BatchEntry[] => {
  const lines = readFileSync(path, 'utf8').split('\n');
  const entries: BatchEntry[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [idStr, qtyStr = '1', ...labelParts] = line.split('|');
    const productId = parseInt(idStr.trim(), 10);
    const quantity = parseInt(qtyStr.trim(), 10);
    if (Number.isNaN(productId) || Number.isNaN(quantity)) {
      throw new Error(`Invalid batch line (expected "id|qty|label"): ${line}`);
    }
    entries.push({ productId, quantity, label: labelParts.join('|').trim() });
  }
  return entries;
};

const addBatchToCart = defineCommand({
  meta: {
    name: 'add-batch',
    description: 'Add multiple products to cart in one session (one login, internal rate limit, 429 retry)'
  },
  args: {
    file: {
      type: 'string',
      description: 'Path to file with one "productId|quantity|label" per line (label optional, # for comments)',
      required: true
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false
    }
  },
  async run({ args }) {
    const credentials = getCredentials();
    if (!credentials) {
      outputError('Missing ROHLIK_USERNAME or ROHLIK_PASSWORD environment variables', { json: args.json });
    }

    let entries: BatchEntry[];
    try {
      entries = parseBatchFile(args.file);
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
      return;
    }

    if (entries.length === 0) {
      outputError('Batch file is empty', { json: args.json });
      return;
    }

    const api = new RohlikAPI(credentials!);

    try {
      const products = entries.map(e => ({ product_id: e.productId, quantity: e.quantity }));
      const { addedIds, failures } = await api.addToCart(products);
      const failureById = new Map(failures.map(f => [f.productId, f]));
      const failedEntries = entries.flatMap(e => {
        const failure = failureById.get(e.productId);
        return failure ? [{ ...e, ...failure }] : [];
      });

      const outOfStock = failedEntries.filter(f => f.reason === 'out-of-stock');
      const rateLimited = failedEntries.filter(f => f.reason === 'rate-limited');
      const otherErrors = failedEntries.filter(f => f.reason === 'error');

      const result = {
        requested: entries.length,
        added: addedIds.length,
        failed: failedEntries.length,
        outOfStock: outOfStock.map(f => ({ productId: f.productId, quantity: f.quantity, label: f.label })),
        rateLimited: rateLimited.map(f => ({ productId: f.productId, quantity: f.quantity, label: f.label })),
        otherErrors: otherErrors.map(f => ({ productId: f.productId, quantity: f.quantity, label: f.label, message: f.message }))
      };

      const sectionLines = (title: string, items: typeof failedEntries) =>
        items.length === 0
          ? ''
          : `\n${title}:\n${items.map(f => `  ${f.productId} (qty ${f.quantity}) ${f.label}${f.message ? ` — ${f.message}` : ''}`).join('\n')}`;

      const humanOutput = `Batch add complete: ${addedIds.length}/${entries.length} succeeded.${
        sectionLines('Vyprodáno', outOfStock)
      }${
        sectionLines('Rate-limited', rateLimited)
      }${
        sectionLines('Jiná chyba', otherErrors)
      }`;

      output(result, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});

const removeFromCart = defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove item from cart'
  },
  args: {
    cartItemId: {
      type: 'positional',
      description: 'Cart item ID (from cart view)',
      required: true
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false
    }
  },
  async run({ args }) {
    const credentials = getCredentials();
    if (!credentials) {
      outputError('Missing ROHLIK_USERNAME or ROHLIK_PASSWORD environment variables', { json: args.json });
    }

    const api = new RohlikAPI(credentials!);

    try {
      const success = await api.removeFromCart(args.cartItemId);

      const result = { success, cartItemId: args.cartItemId };
      const humanOutput = success
        ? `Removed item ${args.cartItemId} from cart.`
        : `Failed to remove item ${args.cartItemId} from cart.`;

      output(result, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});

export const cartCommand = defineCommand({
  meta: {
    name: 'cart',
    description: 'Manage shopping cart'
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false
    }
  },
  subCommands: {
    view: viewCart,
    add: addToCart,
    'add-batch': addBatchToCart,
    remove: removeFromCart
  },
  async run({ args }) {
    const credentials = getCredentials();
    if (!credentials) {
      outputError('Missing ROHLIK_USERNAME or ROHLIK_PASSWORD environment variables', { json: args.json });
    }

    const api = new RohlikAPI(credentials!);

    try {
      const cart = await api.getCartContent();

      if (cart.total_items === 0) {
        output(cart, 'Your cart is empty.', { json: args.json });
        return;
      }

      const humanOutput = `${c.header('Cart Summary')}
${c.label('Total items:')} ${cart.total_items}
${c.label('Total price:')} ${formatPrice(cart.total_price)}
${c.label('Can order:')} ${cart.can_make_order ? c.success('Yes') : c.warn('No')}

${c.header('Products:')}
${cart.products.map(p =>
  `${c.value(p.name)} ${c.brand(`(${p.brand})`)}
  ${c.label('Qty:')} ${p.quantity} ${c.label('|')} ${c.label('Price:')} ${formatPrice(p.price)} ${c.label('|')} ${c.label('Category:')} ${c.category(p.category_name)}
  ${c.dim(`Cart ID: ${p.cart_item_id}`)}`
).join('\n\n')}`;

      output(cart, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});
