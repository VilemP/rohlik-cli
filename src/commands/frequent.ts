import { defineCommand } from 'citty';
import { RohlikAPI } from '../rohlik-api.js';
import { output, outputError, formatPrice, formatDate } from '../output.js';
import { getCredentials } from './utils.js';

interface ProductFrequency {
  productId: string;
  productName: string;
  brand: string;
  frequency: number;
  totalQuantity: number;
  lastOrderDate?: string;
  averagePrice?: number;
  category?: string;
  categoryId?: number;
}

export const frequentCommand = defineCommand({
  meta: {
    name: 'frequent',
    description: 'View frequently purchased items'
  },
  args: {
    orders: {
      type: 'string',
      description: 'Number of orders to analyze (default: 5)',
      default: '5'
    },
    top: {
      type: 'string',
      description: 'Number of top items (default: 10)',
      default: '10'
    },
    categories: {
      type: 'boolean',
      description: 'Show per-category breakdown',
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
    const ordersToAnalyze = Math.min(20, Math.max(1, parseInt(args.orders, 10)));
    const topItems = Math.min(30, Math.max(3, parseInt(args.top, 10)));

    try {
      const orderHistory = await api.getOrderHistory(ordersToAnalyze);

      if (!orderHistory || (Array.isArray(orderHistory) && orderHistory.length === 0)) {
        output([], 'No order history found.', { json: args.json });
        return;
      }

      const orders = Array.isArray(orderHistory) ? orderHistory : [orderHistory];
      const productMap = new Map<string, ProductFrequency>();
      let processedOrders = 0;
      let totalProducts = 0;

      for (const order of orders) {
        try {
          const orderId = order.id || order.orderNumber;
          if (!orderId) continue;

          const orderDetail = await api.getOrderDetail(String(orderId));
          if (!orderDetail) continue;

          processedOrders++;
          const products = orderDetail.products || orderDetail.items || [];
          const orderDate = orderDetail.deliveredAt || orderDetail.createdAt;

          for (const product of products) {
            const productId = product.productId || product.id;
            const productName = product.productName || product.name;

            if (!productId || !productName) continue;

            totalProducts++;
            const key = `${productId}`;

            const categories = product.categories || [];
            const mainCategory = categories.find((cat: any) => cat.level === 1) || categories[0];
            const categoryName = mainCategory?.name || 'Uncategorized';
            const categoryId = mainCategory?.id || 0;

            if (productMap.has(key)) {
              const existing = productMap.get(key)!;
              existing.frequency++;
              existing.totalQuantity += (product.quantity || 1);

              if (product.price) {
                const currentAvg = existing.averagePrice || 0;
                existing.averagePrice = (currentAvg * (existing.frequency - 1) + product.price) / existing.frequency;
              }

              if (orderDate && (!existing.lastOrderDate || orderDate > existing.lastOrderDate)) {
                existing.lastOrderDate = orderDate;
              }
            } else {
              productMap.set(key, {
                productId: String(productId),
                productName,
                brand: product.brand || '',
                frequency: 1,
                totalQuantity: product.quantity || 1,
                lastOrderDate: orderDate,
                averagePrice: product.price || 0,
                category: categoryName,
                categoryId
              });
            }
          }
        } catch {
          // Skip failed orders
        }
      }

      const sortedProducts = Array.from(productMap.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, topItems);

      if (sortedProducts.length === 0) {
        output([], `Analyzed ${processedOrders} orders but found no products.`, { json: args.json });
        return;
      }

      const formatItem = (item: ProductFrequency, idx: number): string => {
        const brand = item.brand ? ` (${item.brand})` : '';
        const avgPrice = item.averagePrice ? formatPrice(item.averagePrice) : 'N/A';
        const lastOrder = item.lastOrderDate ? formatDate(item.lastOrderDate) : 'N/A';
        return `${idx + 1}. ${item.productName}${brand}
   ${item.frequency}x orders | ${item.totalQuantity} units | Avg: ${avgPrice} | Last: ${lastOrder}
   ID: ${item.productId}`;
      };

      let humanOutput = `Frequently Purchased Items
Analyzed: ${processedOrders} orders | ${totalProducts} total items

Top ${sortedProducts.length} Items:

${sortedProducts.map(formatItem).join('\n\n')}`;

      if (args.categories) {
        const categoryMap = new Map<number, { name: string; products: ProductFrequency[] }>();

        for (const product of Array.from(productMap.values())) {
          const catId = product.categoryId || 0;
          if (!categoryMap.has(catId)) {
            categoryMap.set(catId, { name: product.category || 'Uncategorized', products: [] });
          }
          categoryMap.get(catId)!.products.push(product);
        }

        for (const category of categoryMap.values()) {
          category.products.sort((a, b) => b.frequency - a.frequency);
        }

        const sortedCategories = Array.from(categoryMap.values())
          .sort((a, b) => {
            const aTotal = a.products.reduce((sum, p) => sum + p.frequency, 0);
            const bTotal = b.products.reduce((sum, p) => sum + p.frequency, 0);
            return bTotal - aTotal;
          });

        humanOutput += '\n\nBy Category:\n';
        for (const category of sortedCategories) {
          const topCategoryProducts = category.products.slice(0, 5);
          humanOutput += `\n${category.name.toUpperCase()}\n`;
          humanOutput += topCategoryProducts.map((item, idx) => formatItem(item, idx)).join('\n\n');
        }
      }

      const result = {
        analyzedOrders: processedOrders,
        totalProducts,
        topItems: sortedProducts
      };

      output(result, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});
