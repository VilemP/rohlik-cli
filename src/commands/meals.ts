import { defineCommand } from 'citty';
import { RohlikAPI } from '../rohlik-api.js';
import { output, outputError, formatPrice } from '../output.js';
import { getCredentials } from './utils.js';

interface ProductFrequency {
  productId: string;
  productName: string;
  brand: string;
  frequency: number;
  totalQuantity: number;
  averagePrice?: number;
  category?: string;
}

const MEAL_CATEGORY_MAPPINGS: Record<string, string[]> = {
  breakfast: [
    "Pekárna", "Mléko a mléčné nápoje", "Müsli a cereálie", "Džemy a pomazánky",
    "Ovoce", "Med", "Máslo a tuky", "Vejce"
  ],
  lunch: [
    "Maso a drůbež", "Zelenina", "Přílohy", "Těstoviny",
    "Rýže", "Omáčky a dresinky", "Polévky", "Luštěniny"
  ],
  dinner: [
    "Maso a drůbež", "Ryby a mořské plody", "Zelenina", "Přílohy",
    "Těstoviny", "Rýže", "Brambory", "Omáčky a dresinky"
  ],
  snack: [
    "Sladkosti", "Ovoce", "Ořechy a semínka", "Jogurty",
    "Sýry", "Chipsy a krekry", "Tyčinky"
  ],
  baking: [
    "Mouka a směsi", "Cukr a sladidla", "Pečení a vaření", "Čokoláda a kakao",
    "Ořechy a semínka", "Vejce", "Máslo a tuky", "Droždí a kypřidla"
  ],
  drinks: [
    "Nápoje", "Káva", "Čaj", "Mléko a mléčné nápoje",
    "Džusy a smoothies", "Minerální vody", "Pivo", "Víno"
  ],
  healthy: [
    "Bio produkty", "Zdravá výživa", "Bezlepkové", "Veganské",
    "Ovoce", "Zelenina", "Ořechy a semínka", "Luštěniny"
  ]
};

const MEAL_TYPES = Object.keys(MEAL_CATEGORY_MAPPINGS);

export const mealsCommand = defineCommand({
  meta: {
    name: 'meals',
    description: 'Get meal suggestions based on purchase history'
  },
  args: {
    type: {
      type: 'positional',
      description: `Meal type: ${MEAL_TYPES.join(', ')}`,
      required: true
    },
    count: {
      type: 'string',
      description: 'Number of items (default: 10)',
      default: '10'
    },
    orders: {
      type: 'string',
      description: 'Orders to analyze (default: 5)',
      default: '5'
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

    const mealType = args.type.toLowerCase();
    if (!MEAL_TYPES.includes(mealType)) {
      outputError(`Invalid meal type: ${mealType}. Valid types: ${MEAL_TYPES.join(', ')}`, { json: args.json });
    }

    const api = new RohlikAPI(credentials!);
    const itemsCount = Math.min(30, Math.max(3, parseInt(args.count, 10)));
    const ordersToAnalyze = Math.min(20, Math.max(1, parseInt(args.orders, 10)));

    try {
      const relevantCategories = MEAL_CATEGORY_MAPPINGS[mealType];
      const orderHistory = await api.getOrderHistory(ordersToAnalyze);

      if (!orderHistory || (Array.isArray(orderHistory) && orderHistory.length === 0)) {
        output([], 'No order history found.', { json: args.json });
        return;
      }

      const orders = Array.isArray(orderHistory) ? orderHistory : [orderHistory];
      const productMap = new Map<string, ProductFrequency>();
      let processedOrders = 0;

      for (const order of orders) {
        try {
          const orderId = order.id || order.orderNumber;
          if (!orderId) continue;

          const orderDetail = await api.getOrderDetail(String(orderId));
          if (!orderDetail) continue;

          processedOrders++;
          const products = orderDetail.products || orderDetail.items || [];

          for (const product of products) {
            const productId = product.productId || product.id;
            const productName = product.productName || product.name;

            if (!productId || !productName) continue;

            const categories = product.categories || [];
            const mainCategory = categories.find((cat: any) => cat.level === 1) || categories[0];
            const categoryName = mainCategory?.name || '';

            const isRelevant = relevantCategories.some(cat =>
              categoryName.toLowerCase().includes(cat.toLowerCase()) ||
              cat.toLowerCase().includes(categoryName.toLowerCase())
            );

            if (!isRelevant) continue;

            const key = `${productId}`;

            if (productMap.has(key)) {
              const existing = productMap.get(key)!;
              existing.frequency++;
              existing.totalQuantity += (product.quantity || 1);

              if (product.price) {
                const currentAvg = existing.averagePrice || 0;
                existing.averagePrice = (currentAvg * (existing.frequency - 1) + product.price) / existing.frequency;
              }
            } else {
              productMap.set(key, {
                productId: String(productId),
                productName,
                brand: product.brand || '',
                frequency: 1,
                totalQuantity: product.quantity || 1,
                averagePrice: product.price || 0,
                category: categoryName
              });
            }
          }
        } catch {
          // Skip failed orders
        }
      }

      if (productMap.size === 0) {
        output([], `No ${mealType} items found in your order history.`, { json: args.json });
        return;
      }

      const sortedProducts = Array.from(productMap.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, itemsCount);

      const formatItem = (item: ProductFrequency, idx: number): string => {
        const brand = item.brand ? ` (${item.brand})` : '';
        const avgPrice = item.averagePrice ? formatPrice(item.averagePrice) : 'N/A';
        const category = item.category ? ` | ${item.category}` : '';
        return `${idx + 1}. ${item.productName}${brand}
   Ordered ${item.frequency}x | ${avgPrice}${category}
   ID: ${item.productId}`;
      };

      const humanOutput = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Suggestions
Analyzed: ${processedOrders} orders | Found ${productMap.size} relevant items

Top ${sortedProducts.length} Items:

${sortedProducts.map(formatItem).join('\n\n')}`;

      const result = {
        mealType,
        analyzedOrders: processedOrders,
        relevantItems: productMap.size,
        suggestions: sortedProducts
      };

      output(result, humanOutput, { json: args.json });
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error), { json: args.json });
    }
  }
});
