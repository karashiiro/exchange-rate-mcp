import { describe, it, expect } from "vitest";
import {
  fetchExchangeRate,
  ExchangeRateResponse,
} from "../src/norges-bank-api";

describe("Norges Bank API", () => {
  describe("fetchExchangeRate", () => {
    it("should return exchange rate data with provided currencies", async () => {
      // Arrange
      const baseCurrency = "NOK";
      const targetCurrency = "USD";

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result).toBeDefined();
      expect(result.baseCurrency).toBe(baseCurrency);
      expect(result.targetCurrency).toBe(targetCurrency);
      expect(typeof result.rate).toBe("number");
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    });

    it("should use provided date when specified", async () => {
      // Arrange
      const baseCurrency = "NOK";
      const targetCurrency = "EUR";
      const date = "2023-12-15";

      // Act
      const result = await fetchExchangeRate(
        baseCurrency,
        targetCurrency,
        date,
      );

      // Assert
      expect(result.date).toBe(date);
    });

    it("should use current date when date is not specified", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "NOK";
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.date).toBe(today);
    });

    // This test anticipates future implementation with validation
    it.todo("should throw an error for invalid currency codes");

    // This test anticipates future implementation with API calls
    it.todo("should handle API errors gracefully");
  });
});
