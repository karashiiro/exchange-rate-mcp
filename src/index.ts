import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchExchangeRate } from "./norges-bank-api.js";

/**
 * Main entry point for the Exchange Rate MCP server
 * This server exposes a tool for getting exchange rates from Norges Bank API
 */
async function main() {
  // Create an MCP server
  const server = new McpServer({
    name: "Exchange Rate MCP",
    version: "1.0.0",
  });

  // Add exchange_rate tool
  server.tool(
    "exchange_rate",
    {
      // Tool parameters
      baseCurrency: z
        .string()
        .describe("The base currency code (e.g., NOK, USD)"),
      targetCurrency: z
        .string()
        .describe("The target currency code (e.g., EUR, USD)"),
      date: z
        .string()
        .optional()
        .describe(
          "Optional date in YYYY-MM-DD format. Defaults to latest available rate.",
        ),
    },
    async ({ baseCurrency, targetCurrency, date }) => {
      try {
        // Call the Norges Bank API client
        const exchangeData = await fetchExchangeRate(
          baseCurrency,
          targetCurrency,
          date,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(exchangeData, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching exchange rate: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  console.error("Exchange Rate MCP server starting...");
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Error starting Exchange Rate MCP server:", error);
  process.exit(1);
});
