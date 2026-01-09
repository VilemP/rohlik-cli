# Rohlik CLI - Project Context

## Overview
A Bun-powered CLI for Rohlik Group's grocery services across Europe. Fork of [rohlik-mcp](https://github.com/tomaspavlin/rohlik-mcp) converted from MCP server to CLI with SKILL.md for agentic use.

## Project Structure
```
src/
├── cli.ts              # Main CLI entry point (Citty)
├── rohlik-api.ts       # API client with all HTTP calls
├── types.ts            # TypeScript type definitions
├── output.ts           # Output formatting (human/JSON)
└── commands/           # CLI commands
    ├── utils.ts        # Shared utilities (getCredentials)
    ├── search.ts       # Product search
    ├── cart.ts         # Cart management (view/add/remove)
    ├── orders.ts       # Order history & details
    ├── delivery.ts     # Delivery info & slots
    ├── account.ts      # Account, premium, announcements
    ├── frequent.ts     # Frequency analysis
    └── meals.ts        # Meal suggestions

tests/
├── helpers.ts          # Mock data generators
├── output.test.ts      # Output utility tests
└── utils.test.ts       # Credential utility tests

docs/
└── README.md           # User guide

SKILL.md                # Agent skill definition
```

## Environment Variables
- `ROHLIK_USERNAME` - User email (required)
- `ROHLIK_PASSWORD` - User password (required)
- `ROHLIK_BASE_URL` - Service URL (optional, defaults to rohlik.cz)
- `ROHLIK_DEBUG` - Enable debug logging (optional)

## CLI Commands
```
rohlik search <query>     # Search products
rohlik cart               # View cart
rohlik cart add <id>      # Add to cart
rohlik cart remove <id>   # Remove from cart
rohlik orders             # Order history
rohlik order <id>         # Order details
rohlik delivery           # Delivery info
rohlik slots              # Delivery slots
rohlik account            # Account info
rohlik frequent           # Frequent items
rohlik meals <type>       # Meal suggestions
```

All commands support `--json` for machine-readable output.

## Development Commands
- `bun run start` - Run CLI
- `bun run dev` - Development mode with watch
- `bun test` - Run tests
- `bun test --watch` - Tests in watch mode

## Key Implementation Details
- Uses Citty for CLI framework
- Bun runtime (native fetch, no node-fetch needed)
- Dual output mode: human-friendly text or JSON (`--json` flag)
- Authentication via environment variables
- Session management via cookies in RohlikAPI class
