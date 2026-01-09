# Rohlik CLI - User Guide

Welcome! This guide covers all features of the Rohlik CLI.

> This is a fork of [rohlik-mcp](https://github.com/tomaspavlin/rohlik-mcp) converted from an MCP server into a standalone CLI with a [SKILL.md](../SKILL.md) for agentic use.

> For installation, see the [main README](../README.md).

## Table of Contents

1. [Getting Started](#getting-started)
2. [Commands Overview](#commands-overview)
3. [Smart Shopping](#smart-shopping)
4. [Examples](#examples)
5. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

After installation, verify the CLI works:

```bash
bun run rohlik --help
```

Set your credentials:

```bash
export ROHLIK_USERNAME="your-email@example.com"
export ROHLIK_PASSWORD="your-password"
```

Try your first command:

```bash
bun run rohlik search "milk"
```

---

## Commands Overview

### Search Products

```bash
bun run rohlik search <query> [options]

Options:
  --limit <n>      Max results (default: 10)
  --favourites     Only show favourites
  --json           Output as JSON
```

Examples:
```bash
bun run rohlik search "organic milk"
bun run rohlik search "bread" --limit 20
bun run rohlik search "eggs" --favourites --json
```

### Cart Management

```bash
# View cart
bun run rohlik cart

# Add product
bun run rohlik cart add <product-id> [--quantity <n>]

# Remove item
bun run rohlik cart remove <cart-item-id>
```

Examples:
```bash
bun run rohlik cart                      # View cart
bun run rohlik cart add 1441840          # Add product
bun run rohlik cart add 1441840 --quantity 3
bun run rohlik cart remove ABC123        # Remove by cart item ID
```

### Order History

```bash
# List orders
bun run rohlik orders [--limit <n>]

# Order details
bun run rohlik order <order-id>
```

Examples:
```bash
bun run rohlik orders               # Last 10 orders
bun run rohlik orders --limit 20
bun run rohlik order 1110717593     # Specific order details
```

### Delivery

```bash
# Delivery info + upcoming orders
bun run rohlik delivery

# Available slots
bun run rohlik slots
```

### Account

```bash
bun run rohlik account
```

Shows premium status, reusable bags, and announcements.

### Smart Shopping

```bash
# Frequently purchased items
bun run rohlik frequent [options]
  --orders <n>      Orders to analyze (default: 5)
  --top <n>         Top items count (default: 10)
  --categories      Show per-category breakdown

# Meal suggestions
bun run rohlik meals <type> [options]
  --count <n>       Items to suggest (default: 10)
  --orders <n>      Orders to analyze (default: 5)
```

Meal types: `breakfast`, `lunch`, `dinner`, `snack`, `baking`, `drinks`, `healthy`

Examples:
```bash
bun run rohlik frequent --orders 10 --top 20
bun run rohlik frequent --categories
bun run rohlik meals breakfast
bun run rohlik meals dinner --count 15
```

---

## Smart Shopping

### How It Works

The CLI analyzes your order history to provide personalized suggestions.

**Frequency Analysis:**
1. Fetches your recent orders
2. Counts how often you buy each product
3. Groups by category
4. Ranks by purchase frequency

**Meal Suggestions:**
1. Maps meal types to relevant product categories
2. Filters your purchases by those categories
3. Returns items you frequently buy for that meal

### Meal Category Mappings

| Meal Type | Categories |
|-----------|------------|
| breakfast | Bread, milk, cereals, fruits, jam, eggs, butter |
| lunch | Meat, vegetables, pasta, rice, sauces, soup |
| dinner | Meat, fish, vegetables, potatoes, sauces |
| snack | Sweets, fruits, nuts, yogurt, chips |
| baking | Flour, sugar, chocolate, butter, eggs |
| drinks | Coffee, tea, juices, water, beer, wine |
| healthy | Bio, vegan, gluten-free, vegetables, fruits |

---

## Examples

### Morning Routine

```bash
# See what breakfast items you usually buy
bun run rohlik meals breakfast

# Get the data as JSON for scripting
bun run rohlik meals breakfast --json
```

### Weekly Planning

```bash
# Check your most purchased items
bun run rohlik frequent --top 20

# Get suggestions for different meals
bun run rohlik meals breakfast
bun run rohlik meals lunch
bun run rohlik meals dinner
```

### Quick Reorder

```bash
# Find your top 10 items
bun run rohlik frequent --top 10 --json | jq '.topItems[].productId'

# Add them one by one
bun run rohlik cart add 1441840
bun run rohlik cart add 712345
```

### Scripting with JSON

```bash
# Search and extract first product ID
PRODUCT_ID=$(bun run rohlik search "milk" --json | jq '.[0].id')
bun run rohlik cart add $PRODUCT_ID

# Get cart total
bun run rohlik cart --json | jq '.total_price'
```

---

## Tips & Best Practices

### Performance

| Setting | Fast | Accurate |
|---------|------|----------|
| Orders to analyze | 5 | 15-20 |
| Top items | 5-10 | 20+ |
| Categories | disabled | enabled |

For faster results:
```bash
bun run rohlik frequent --orders 5 --top 5
```

For more accurate results:
```bash
bun run rohlik frequent --orders 15 --top 20 --categories
```

### JSON Output

Add `--json` to any command for machine-readable output:

```bash
bun run rohlik search "milk" --json
bun run rohlik cart --json
bun run rohlik frequent --json
bun run rohlik meals breakfast --json
```

Use with `jq` for data extraction:

```bash
# Get product IDs
bun run rohlik search "milk" --json | jq '.[].id'

# Get cart total
bun run rohlik cart --json | jq '.total_price'

# Get top product names
bun run rohlik frequent --json | jq '.topItems[].productName'
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ROHLIK_USERNAME` | Yes | Your Rohlik email |
| `ROHLIK_PASSWORD` | Yes | Your Rohlik password |
| `ROHLIK_BASE_URL` | No | Service URL (default: rohlik.cz) |
| `ROHLIK_DEBUG` | No | Enable debug logging |

### Supported Regions

Set `ROHLIK_BASE_URL` for different countries:

```bash
# Czech Republic (default)
export ROHLIK_BASE_URL="https://www.rohlik.cz"

# Germany
export ROHLIK_BASE_URL="https://www.knuspr.de"

# Austria
export ROHLIK_BASE_URL="https://www.gurkerl.at"

# Hungary
export ROHLIK_BASE_URL="https://www.kifli.hu"

# Romania
export ROHLIK_BASE_URL="https://www.sezamo.ro"
```

---

## Troubleshooting

### Login Failed

1. Check credentials: `echo $ROHLIK_USERNAME`
2. Enable debug: `export ROHLIK_DEBUG=true`
3. Test on Rohlik website

### No Order History

Smart shopping features require past orders. Place at least one order first.

### Slow Responses

- Reduce `--orders` count
- Reduce `--top` count
- The API has rate limiting (~100ms between requests)

---

## Need Help?

- [Main README](../README.md)
- [GitHub Issues](https://github.com/tomaspavlin/rohlik-cli/issues)
