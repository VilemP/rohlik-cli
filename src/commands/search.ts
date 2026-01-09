import { defineCommand } from 'citty';
import { RohlikAPI } from '../rohlik-api.js';
import { output, outputError, c } from '../output.js';
import { getCredentials } from './utils.js';

export const searchCommand = defineCommand({
  meta: {
    name: 'search',
    description: 'Search for products by name'
  },
  args: {
    query: {
      type: 'positional',
      description: 'Search term',
      required: true
    },
    limit: {
      type: 'string',
      description: 'Max results (default: 10)',
      default: '10'
    },
    favourites: {
      type: 'boolean',
      description: 'Only show favourites',
      default: false
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
      const results = await api.searchProducts(args.query, limit, args.favourites);

      const humanOutput = results.length === 0
        ? 'No products found.'
        : `${c.header(`Found ${results.length} products:`)}\n\n` +
          results.map(p =>
            `${c.value(p.name)} ${c.brand(`(${p.brand})`)}\n  ${c.label('Price:')} ${c.price(p.price)} ${c.label('|')} ${c.label('Amount:')} ${p.amount}\n  ${c.dim(`ID: ${p.id}`)}`
          ).join('\n\n');

      output(results, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});
