# Exchange Rate MCP Server

This is a Model Context Protocol (MCP) server that provides access to exchange rate data from the Norges Bank API.

## Overview

The Exchange Rate MCP exposes a single tool called `exchange_rate` that allows an LLM or other clients to fetch exchange rates between different currencies.

## Features

- Fetch real-time exchange rates (to be implemented with Norges Bank API)
- Convert between different currencies
- Retrieve historical exchange rates by specifying a date

## Installation

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Run

```bash
pnpm start
```

## Usage

The server exposes a single tool:

### `exchange_rate`

Fetches the exchange rate between two currencies.

#### Parameters:

- `baseCurrency` (string, required): The base currency code (e.g., NOK, USD)
- `targetCurrency` (string, required): The target currency code (e.g., EUR, USD)
- `date` (string, optional): Date in YYYY-MM-DD format. Defaults to latest available rate.

#### Example Response:

```json
{
  "baseCurrency": "NOK",
  "targetCurrency": "USD",
  "date": "2025-04-04",
  "rate": 0.12345
}
```

## Future Enhancements

- Implement actual Norges Bank API integration
- Add support for currency lists
- Add support for currency conversions with amounts
- Add historical rate charts
