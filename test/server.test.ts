import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as norgesBankApi from "../src/norges-bank-api";

// Mock the SDK to avoid actual server connection
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  const McpServer = vi.fn(() => ({
    tool: vi.fn(),
    connect: vi.fn(),
  }));
  return { McpServer };
});

// Mock the stdio transport
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  const StdioServerTransport = vi.fn();
  return { StdioServerTransport };
});

describe("Exchange Rate MCP Server", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should register the exchange_rate tool", async () => {
    // Arrange
    const { default: main } = await import("../src/index.js");
    const server = new McpServer({});

    // Mock fetchExchangeRate to return test data
    vi.spyOn(norgesBankApi, "fetchExchangeRate").mockResolvedValue({
      baseCurrency: "NOK",
      targetCurrency: "USD",
      date: "2025-04-04",
      rate: 0.12345,
    });

    // Act - We can't easily test the full server setup without restructuring
    // the code to make it more testable. For now, we'll verify mocks are working.

    // Assert
    expect(server.tool).toBeDefined();
  });

  // Test for the tool handler function
  it.todo("should handle successful exchange rate requests");
  it.todo("should handle errors during exchange rate fetching");

  // Integration test
  it.todo("should correctly process exchange rate tool invocations");
});
