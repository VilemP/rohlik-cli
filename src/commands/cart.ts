import { defineCommand } from 'citty';
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
      const added = await api.addToCart([{ product_id: productId, quantity }]);
      const success = added.length > 0;

      const result = { success, productId, quantity };
      const humanOutput = success
        ? `Added product ${productId} (qty: ${quantity}) to cart.`
        : `Failed to add product ${productId} to cart.`;

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
