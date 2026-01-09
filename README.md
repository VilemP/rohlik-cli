# Rohlik CLI

CLI for Rohlik Group grocery services - search products, manage cart, view orders, and get personalized shopping suggestions.

> [!NOTE]
> This is a fork of [rohlik-mcp](https://github.com/tomaspavlin/rohlik-mcp) converted from an MCP server into a standalone CLI with a [SKILL.md](./SKILL.md) for agentic use.

> [!WARNING]
> This CLI uses reverse-engineered Rohlik APIs. For personal use only.

**Supported Services:**
- 🇨🇿 [Rohlik.cz](https://www.rohlik.cz) - Czech Republic
- 🇩🇪 [Knuspr.de](https://www.knuspr.de) - Germany
- 🇦🇹 [Gurkerl.at](https://www.gurkerl.at) - Austria
- 🇭🇺 [Kifli.hu](https://www.kifli.hu) - Hungary
- 🇷🇴 [Sezamo.ro](https://www.sezamo.ro) - Romania

## Installation

Requires [Bun](https://bun.sh) runtime.

```bash
# Clone and install
git clone https://github.com/tomaspavlin/rohlik-cli.git
cd rohlik-cli
bun install

# Set credentials
export ROHLIK_USERNAME="your-email@example.com"
export ROHLIK_PASSWORD="your-password"

# Optional: Set region (defaults to rohlik.cz)
export ROHLIK_BASE_URL="https://www.knuspr.de"
```

## Usage

```bash
# Search for products
bun run rohlik search "milk"
bun run rohlik search "bread" --limit 20 --favourites

# Manage cart
bun run rohlik cart                    # View cart
bun run rohlik cart add 12345          # Add product by ID
bun run rohlik cart add 12345 --quantity 3
bun run rohlik cart remove ABC123      # Remove by cart item ID

# View orders
bun run rohlik orders                  # Order history
bun run rohlik orders --limit 20
bun run rohlik order 12345             # Order details

# Delivery
bun run rohlik delivery                # Delivery info + upcoming orders
bun run rohlik slots                   # Available delivery slots

# Account
bun run rohlik account                 # Premium status, bags, announcements

# Smart shopping
bun run rohlik frequent                # Most purchased items
bun run rohlik frequent --orders 10 --top 20 --categories
bun run rohlik meals breakfast         # Meal suggestions
bun run rohlik meals dinner --count 15
```

### JSON Output

Add `--json` to any command for machine-readable output:

```bash
bun run rohlik search "milk" --json
bun run rohlik cart --json
bun run rohlik frequent --json
```

## Commands

| Command | Description |
|---------|-------------|
| `search <query>` | Search for products |
| `cart` | View cart contents |
| `cart add <id>` | Add product to cart |
| `cart remove <id>` | Remove item from cart |
| `orders` | View order history |
| `order <id>` | View order details |
| `delivery` | View delivery info |
| `slots` | View delivery slots |
| `account` | View account info |
| `frequent` | View frequently purchased items |
| `meals <type>` | Get meal suggestions (breakfast, lunch, dinner, snack, baking, drinks, healthy) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ROHLIK_USERNAME` | Yes | Your Rohlik email |
| `ROHLIK_PASSWORD` | Yes | Your Rohlik password |
| `ROHLIK_BASE_URL` | No | Service URL (default: https://www.rohlik.cz) |
| `ROHLIK_DEBUG` | No | Enable debug logging |

## Development

```bash
# Run in dev mode
bun run dev

# Run tests
bun test

# Run tests in watch mode
bun test --watch
```

## Troubleshooting

### Login failed
1. Check credentials in environment variables
2. Enable debug: `export ROHLIK_DEBUG=true`
3. Verify account works on Rohlik website

### No order history
Smart shopping features (`frequent`, `meals`) require past orders.

### Slow responses
- Reduce `--orders` count for smart features
- API has rate limiting (~100ms between requests)

## License

MIT - see [LICENSE](LICENSE)

## Acknowledgements

- [dvejsada/HA-RohlikCZ](https://github.com/dvejsada/HA-RohlikCZ) for reverse engineering the Rohlik API
