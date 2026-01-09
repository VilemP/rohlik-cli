#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty';
import { searchCommand } from './commands/search.js';
import { cartCommand } from './commands/cart.js';
import { ordersCommand, orderCommand } from './commands/orders.js';
import { deliveryCommand, slotsCommand } from './commands/delivery.js';
import { accountCommand } from './commands/account.js';
import { frequentCommand } from './commands/frequent.js';
import { mealsCommand } from './commands/meals.js';

const main = defineCommand({
  meta: {
    name: 'rohlik',
    version: '4.0.0',
    description: 'CLI for Rohlik Group grocery services'
  },
  subCommands: {
    search: searchCommand,
    cart: cartCommand,
    orders: ordersCommand,
    order: orderCommand,
    delivery: deliveryCommand,
    slots: slotsCommand,
    account: accountCommand,
    frequent: frequentCommand,
    meals: mealsCommand
  }
});

runMain(main);
