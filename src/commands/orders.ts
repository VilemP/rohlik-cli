import { defineCommand } from 'citty';
import { RohlikAPI } from '../rohlik-api.js';
import { output, outputError, formatPrice, formatDate, c } from '../output.js';
import { getCredentials } from './utils.js';

export const ordersCommand = defineCommand({
  meta: {
    name: 'orders',
    description: 'View order history'
  },
  args: {
    limit: {
      type: 'string',
      description: 'Number of orders (default: 10)',
      default: '10'
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
    const limit = parseInt(args.limit, 10);

    try {
      const orders = await api.getOrderHistory(limit);
      const orderList = Array.isArray(orders) ? orders : [orders];

      if (orderList.length === 0) {
        output([], 'No orders found.', { json: args.json });
        return;
      }

      const humanOutput = `${c.header(`Order History (${orderList.length} orders):`)}\n\n` +
        orderList.map((o: any) => {
          const id = o.id || o.orderNumber;
          const date = o.orderTime || o.deliveredAt || o.createdAt || 'Unknown';
          const price = o.priceComposition?.total || o.totalPrice || o.price || 0;
          const itemsCount = o.itemsCount || 0;
          return `${c.value(`Order #${c.id(String(id))}`)}
  ${c.label('Date:')} ${formatDate(date)} ${c.label('|')} ${c.label('Items:')} ${itemsCount}
  ${c.label('Total:')} ${formatPrice(price)}`;
        }).join('\n\n');

      output(orderList, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});

export const orderCommand = defineCommand({
  meta: {
    name: 'order',
    description: 'View order details'
  },
  args: {
    id: {
      type: 'positional',
      description: 'Order ID',
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
      const order = await api.getOrderDetail(args.id);

      if (!order) {
        output(null, `Order ${args.id} not found.`, { json: args.json });
        return;
      }

      const products = order.products || order.items || [];
      const humanOutput = `Order #${order.id || order.orderNumber}
Status: ${order.status || 'Unknown'}
Date: ${formatDate(order.deliveredAt || order.createdAt || '')}
Total: ${formatPrice(order.totalPrice || order.price || 0)}

Products (${products.length}):
${products.map((p: any) => {
  const name = p.productName || p.name;
  const qty = p.quantity || 1;
  const price = p.price || p.totalPrice || 0;
  return `  ${name}
    Qty: ${qty} | Price: ${formatPrice(price)}`;
}).join('\n')}`;

      output(order, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});
