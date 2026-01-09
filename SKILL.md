---
name: rohlik-cli
description: CLI for Rohlik Group grocery services. Search products, manage shopping cart, view orders, check delivery slots, and get personalized meal suggestions based on purchase history. Use when the user wants to shop for groceries, manage their Rohlik cart, check delivery options, or get shopping recommendations. Supports rohlik.cz, knuspr.de, gurkerl.at, kifli.hu, sezamo.ro.
license: MIT
compatibility: Requires Bun runtime and internet access. Needs ROHLIK_USERNAME and ROHLIK_PASSWORD environment variables set.
metadata:
  author: tomaspavlin
  version: "4.0.0"
---

# Rohlik CLI

A command-line tool for interacting with Rohlik Group grocery delivery services.

## Environment Setup

Before using any commands, ensure these environment variables are set:

```bash
export ROHLIK_USERNAME="user@example.com"
export ROHLIK_PASSWORD="password"
export ROHLIK_BASE_URL="https://www.rohlik.cz"  # Optional, defaults to Czech
```

## Running Commands

All commands are run with `bun run rohlik`:

```bash
bun run rohlik <command> [options]
```

## Commands

### Search Products

Find products by name. Returns product ID, name, price, brand, and amount.

```bash
bun run rohlik search "milk"
bun run rohlik search "bread" --limit 20
bun run rohlik search "eggs" --favourites --json
```

**Arguments:**
- `query` (required): Search term
- `--limit`: Max results (default: 10)
- `--favourites`: Only show favourited products
- `--json`: Output as JSON for programmatic use

### Cart Management

View, add, or remove items from the shopping cart.

```bash
# View cart
bun run rohlik cart
bun run rohlik cart --json

# Add product (use ID from search)
bun run rohlik cart add 12345
bun run rohlik cart add 12345 --quantity 3

# Remove item (use cart_item_id from cart view)
bun run rohlik cart remove ABC123
```

### Order History

View past orders and order details.

```bash
# List recent orders
bun run rohlik orders
bun run rohlik orders --limit 20

# View specific order details
bun run rohlik order 12345
bun run rohlik order 12345 --json
```

### Delivery

Check delivery information and available time slots.

```bash
# View delivery info and upcoming orders
bun run rohlik delivery

# View available delivery slots
bun run rohlik slots
bun run rohlik slots --json
```

### Account Information

View premium status, reusable bags, and announcements.

```bash
bun run rohlik account
bun run rohlik account --json
```

### Smart Shopping

Get personalized shopping suggestions based on order history.

```bash
# View frequently purchased items
bun run rohlik frequent
bun run rohlik frequent --orders 10 --top 20
bun run rohlik frequent --categories  # Show breakdown by category

# Get meal-specific suggestions
bun run rohlik meals breakfast
bun run rohlik meals lunch --count 15
bun run rohlik meals dinner --orders 10
```

**Meal types:** breakfast, lunch, dinner, snack, baking, drinks, healthy

## Common Workflows

### Add items from a shopping list

```bash
# Search and add each item
bun run rohlik search "milk" --json | jq '.[0].id' | xargs -I {} bun run rohlik cart add {}
```

### Reorder frequent items

```bash
# Get top items and their IDs
bun run rohlik frequent --top 5 --json | jq '.topItems[].productId'
```

### Check delivery before ordering

```bash
bun run rohlik cart          # Review cart
bun run rohlik slots --json  # Find available slot
```

## Output Formats

All commands support `--json` flag for structured output:

- **Human output** (default): Formatted text for terminal reading
- **JSON output**: Structured data for scripting and AI agents

Example JSON outputs:

```json
// bun run rohlik search "milk" --json
[
  {
    "id": 12345,
    "name": "Organic Milk 1L",
    "price": "32.90 CZK",
    "brand": "BioFarm",
    "amount": "1 l"
  }
]

// bun run rohlik cart --json
{
  "total_price": 245.50,
  "total_items": 3,
  "can_make_order": true,
  "products": [...]
}

// bun run rohlik frequent --json
{
  "analyzedOrders": 5,
  "totalProducts": 47,
  "topItems": [...]
}
```

## Error Handling

Errors are returned with clear messages:

```bash
# Missing credentials
Error: Missing ROHLIK_USERNAME or ROHLIK_PASSWORD environment variables

# Invalid product
Error: Product 99999 not found

# JSON error format
{"error": "Login failed: Invalid credentials"}
```

## Tips

1. Use `--json` when scripting or when an AI agent needs structured data
2. Product IDs from `search` can be used with `cart add`
3. Cart item IDs from `cart` are needed for `cart remove`
4. `frequent` and `meals` commands analyze order history - more orders = better suggestions
5. Set `ROHLIK_DEBUG=true` for verbose logging when troubleshooting
