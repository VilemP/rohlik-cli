import { defineCommand } from 'citty';
import { RohlikAPI } from '../rohlik-api.js';
import { output, outputError, c } from '../output.js';
import { getCredentials } from './utils.js';

export const accountCommand = defineCommand({
  meta: {
    name: 'account',
    description: 'View account information'
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
      const [premium, bags, announcements] = await Promise.all([
        api.getPremiumInfo().catch(() => null),
        api.getReusableBagsInfo().catch(() => null),
        api.getAnnouncements().catch(() => null)
      ]);

      let humanOutput = `${c.header('Account Information')}\n\n`;

      if (premium) {
        const isPremium = premium.stats?.orderCount !== undefined || premium.premiumLimits !== undefined;
        const savedTotal = premium.savings?.total?.amount?.amount || premium.stats?.savedTotal?.full || 0;
        humanOutput += `${c.label('Premium Status:')} ${isPremium ? c.success('Active') : c.dim('Inactive')}\n`;
        if (isPremium && savedTotal > 0) {
          humanOutput += `  ${c.label('Total saved:')} ${c.price(`${savedTotal} ${premium.savings?.total?.amount?.currency || '€'}`)}\n`;
        }
        if (premium.premiumLimits?.ordersWithoutPriceLimit) {
          const limits = premium.premiumLimits.ordersWithoutPriceLimit;
          humanOutput += `  ${c.label('Orders without min. limit:')} ${limits.remaining}/${limits.total}\n`;
        }
        humanOutput += '\n';
      }

      if (bags) {
        const count = bags.count || bags.bagsCount || 0;
        const saved = bags.savedPlastic || bags.plasticSaved || 0;
        humanOutput += `${c.label('Reusable Bags:')} ${count}\n`;
        if (saved > 0) {
          humanOutput += `  ${c.label('Plastic saved:')} ${c.success(`${saved}g`)}\n`;
        }
        humanOutput += '\n';
      }

      if (announcements && Array.isArray(announcements) && announcements.length > 0) {
        humanOutput += `${c.header(`Announcements (${announcements.length}):`)}\n`;
        humanOutput += announcements.slice(0, 5).map((a: any) => {
          const title = a.title || a.headline || 'Announcement';
          const message = a.message || a.content || '';
          return `  ${c.value(title)}\n    ${c.dim(message.slice(0, 100))}${message.length > 100 ? '...' : ''}`;
        }).join('\n');
      } else {
        humanOutput += c.dim('No announcements.');
      }

      output({ premium, bags, announcements }, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});
