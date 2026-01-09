export interface MockProduct {
  productId: string;
  productName: string;
  brand?: string;
  price?: number;
  quantity?: number;
  categories?: Array<{ id: number; name: string; level: number }>;
}

export interface MockOrderDetail {
  id?: string;
  orderNumber?: string;
  deliveredAt?: string;
  createdAt?: string;
  products?: MockProduct[];
  items?: MockProduct[];
}

export interface MockOrder {
  id?: string;
  orderNumber?: string;
}

export function createMockProduct(overrides: Partial<MockProduct> = {}): MockProduct {
  return {
    productId: '12345',
    productName: 'Test Product',
    brand: 'Test Brand',
    price: 50.0,
    quantity: 1,
    categories: [{ id: 1, name: 'Test Category', level: 1 }],
    ...overrides
  };
}

export function createMockOrderDetail(
  orderId: string,
  products: MockProduct[],
  date: string = '2025-01-01'
): MockOrderDetail {
  return {
    id: orderId,
    orderNumber: orderId,
    deliveredAt: date,
    createdAt: date,
    products
  };
}

export function createMockOrder(id: string): MockOrder {
  return { id, orderNumber: id };
}

export function createBreakfastProducts(): MockProduct[] {
  return [
    createMockProduct({
      productId: '1001',
      productName: 'Trvanlivé mléko 1,5%',
      brand: 'Miil',
      price: 21.90,
      categories: [{ id: 10, name: 'Mléko a mléčné nápoje', level: 1 }]
    }),
    createMockProduct({
      productId: '1002',
      productName: 'Pšeničné rohlíky',
      brand: 'Rohlík',
      price: 8.90,
      categories: [{ id: 11, name: 'Pekárna', level: 1 }]
    }),
    createMockProduct({
      productId: '1003',
      productName: 'Máslo 250g',
      brand: 'Madeta',
      price: 45.50,
      categories: [{ id: 12, name: 'Máslo a tuky', level: 1 }]
    })
  ];
}

export function createLunchProducts(): MockProduct[] {
  return [
    createMockProduct({
      productId: '2001',
      productName: 'Kuřecí prsa',
      brand: 'Naše Maso',
      price: 120.00,
      categories: [{ id: 20, name: 'Maso a drůbež', level: 1 }]
    }),
    createMockProduct({
      productId: '2002',
      productName: 'Těstoviny fusilli',
      brand: 'Barilla',
      price: 35.00,
      categories: [{ id: 21, name: 'Těstoviny', level: 1 }]
    })
  ];
}

export function createSnackProducts(): MockProduct[] {
  return [
    createMockProduct({
      productId: '3001',
      productName: 'Milka čokoláda',
      brand: 'Milka',
      price: 28.90,
      categories: [{ id: 30, name: 'Sladkosti', level: 1 }]
    }),
    createMockProduct({
      productId: '3002',
      productName: 'Banány',
      brand: '',
      price: 15.00,
      categories: [{ id: 31, name: 'Ovoce', level: 1 }]
    })
  ];
}

export function createOrdersWithRepeatedProducts(): MockOrderDetail[] {
  const milk = createMockProduct({
    productId: '1001',
    productName: 'Mléko',
    brand: 'Miil',
    price: 21.90,
    categories: [{ id: 10, name: 'Mléko a mléčné nápoje', level: 1 }]
  });

  const bread = createMockProduct({
    productId: '1002',
    productName: 'Rohlíky',
    brand: 'Rohlík',
    price: 8.90,
    categories: [{ id: 11, name: 'Pekárna', level: 1 }]
  });

  const cheese = createMockProduct({
    productId: '1003',
    productName: 'Eidam',
    brand: 'Madeta',
    price: 55.00,
    categories: [{ id: 12, name: 'Sýry', level: 1 }]
  });

  return [
    createMockOrderDetail('order1', [milk, bread], '2025-01-01'),
    createMockOrderDetail('order2', [milk, bread, cheese], '2025-01-05'),
    createMockOrderDetail('order3', [milk, cheese], '2025-01-10'),
    createMockOrderDetail('order4', [milk], '2025-01-15'),
  ];
}
