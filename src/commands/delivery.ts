import { defineCommand } from 'citty';
import { RohlikAPI } from '../rohlik-api.js';
import { output, outputError, formatPrice, formatDate } from '../output.js';
import { getCredentials } from './utils.js';

export const deliveryCommand = defineCommand({
  meta: {
    name: 'delivery',
    description: 'View delivery information'
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
      const [deliveryInfo, upcomingOrders] = await Promise.all([
        api.getDeliveryInfo(),
        api.getUpcomingOrders()
      ]);

      const upcoming = Array.isArray(upcomingOrders) ? upcomingOrders : [];

      let humanOutput = 'Delivery Information:\n\n';

      if (deliveryInfo) {
        const fee = deliveryInfo.deliveryFee || deliveryInfo.fee || 0;
        const freeFrom = deliveryInfo.freeDeliveryFrom || deliveryInfo.freeFrom || 0;
        humanOutput += `Delivery Fee: ${formatPrice(fee)}\n`;
        humanOutput += `Free delivery from: ${formatPrice(freeFrom)}\n\n`;
      }

      if (upcoming.length > 0) {
        humanOutput += `Upcoming Orders (${upcoming.length}):\n`;
        humanOutput += upcoming.map((o: any) => {
          const id = o.id || o.orderNumber;
          const date = o.deliveryDate || o.estimatedDelivery || 'Unknown';
          return `  Order #${id} - ${formatDate(date)}`;
        }).join('\n');
      } else {
        humanOutput += 'No upcoming orders.';
      }

      output({ deliveryInfo, upcomingOrders: upcoming }, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});

export const slotsCommand = defineCommand({
  meta: {
    name: 'slots',
    description: 'View available delivery slots'
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
      const slots = await api.getDeliverySlots();

      if (!slots || (Array.isArray(slots) && slots.length === 0)) {
        output([], 'No delivery slots available.', { json: args.json });
        return;
      }

      const slotList = Array.isArray(slots) ? slots : [slots];

      const humanOutput = `Available Delivery Slots:\n\n` +
        slotList.slice(0, 20).map((slot: any) => {
          const date = slot.date || slot.deliveryDate || 'Unknown';
          const time = slot.time || slot.timeSlot || `${slot.from || ''} - ${slot.to || ''}`;
          const price = slot.price || slot.fee || 0;
          const available = slot.available !== false;
          return `${formatDate(date)} ${time}
  Price: ${formatPrice(price)} | ${available ? 'Available' : 'Full'}`;
        }).join('\n\n');

      output(slotList, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});
