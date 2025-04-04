import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchExchangeRate,
  ExchangeRateResponse,
} from "../src/norges-bank-api";
import fetch from "node-fetch";

vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

describe("Norges Bank API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchExchangeRate", () => {
    const mockMultiCurrencyResponse = {
      data: {
        dataSets: [
          {
            series: {
              "0:0:0:0": {
                observations: {
                  "0": [8.5], // USD/NOK rate: 1 USD = 8.5 NOK
                },
              },
              "0:1:0:0": {
                observations: {
                  "0": [10.2], // EUR/NOK rate: 1 EUR = 10.2 NOK
                },
              },
            },
          },
        ],
      },
    };

    it("should calculate cross rate between two non-NOK currencies", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "EUR";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMultiCurrencyResponse),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result).toBeDefined();
      expect(result.baseCurrency).toBe(baseCurrency);
      expect(result.targetCurrency).toBe(targetCurrency);
      // USD/EUR = (USD/NOK) / (EUR/NOK) = 8.5 / 10.2
      expect(result.rate).toBeCloseTo(8.5 / 10.2);
      expect(fetch).toHaveBeenCalledWith(
        "https://data.norges-bank.no/api/data/EXR/B.USD+EUR.NOK.SP?format=sdmx-json&lastNObservations=1&locale=en",
      );
    });

    it("should handle NOK as base currency", async () => {
      // Arrange
      const baseCurrency = "NOK";
      const targetCurrency = "USD";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {
                    "0:0:0:0": {
                      observations: {
                        "0": [8.5],
                      },
                    },
                  },
                },
              ],
            },
          }),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.rate).toBe(1 / 8.5); // NOK/USD = 1 / (USD/NOK)
    });

    it("should handle NOK as target currency", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "NOK";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {
                    "0:0:0:0": {
                      observations: {
                        "0": [8.5],
                      },
                    },
                  },
                },
              ],
            },
          }),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.rate).toBe(8.5); // USD/NOK direct from API
    });

    it("should throw error for unavailable currencies", async () => {
      // Arrange
      const baseCurrency = "INVALID";
      const targetCurrency = "USD";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {},
                },
              ],
            },
          }),
      } as any);

      // Act & Assert
      await expect(
        fetchExchangeRate(baseCurrency, targetCurrency),
      ).rejects.toThrow(
        "One or both currencies not available from Norges Bank API",
      );
    });

    it("should use provided date when specified", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "EUR";
      const date = "2023-12-15";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMultiCurrencyResponse),
      } as any);

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
      const targetCurrency = "EUR";
      const today = new Date().toISOString().split("T")[0];
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMultiCurrencyResponse),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.date).toBe(today);
    });

    it("should handle API errors gracefully", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "EUR";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      // Act & Assert
      await expect(
        fetchExchangeRate(baseCurrency, targetCurrency),
      ).rejects.toThrow("Norges Bank API request failed with status 404");
    });

    it("should throw error on invalid API response format", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "EUR";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as any);

      // Act & Assert
      await expect(
        fetchExchangeRate(baseCurrency, targetCurrency),
      ).rejects.toThrow("Invalid response format from Norges Bank API");
    });

    it("should handle currencies with different base units 1 (e.g., JPY per 100)", async () => {
      // Arrange
      const baseCurrency = "JPY";
      const targetCurrency = "USD";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {
                    "0:0:0:0": {
                      observations: {
                        "0": ["7.2755"], // JPY/NOK rate
                      },
                    },
                    "0:1:0:0": {
                      observations: {
                        "0": ["10.5648"], // USD/NOK rate
                      },
                    },
                  },
                },
              ],
            },
          }),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.rate).toBeCloseTo(7.2755 / 10.5648 / 100);
    });

    it("should handle currencies with different base units 2 (e.g., JPY per 100)", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "JPY";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {
                    "0:0:0:0": {
                      observations: {
                        "0": ["10.5648"], // USD/NOK rate
                      },
                    },
                    "0:1:0:0": {
                      observations: {
                        "0": ["7.2755"], // JPY/NOK rate
                      },
                    },
                  },
                },
              ],
            },
          }),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.rate).toBeCloseTo((10.5648 / 7.2755) * 100);
    });

    it("should handle KRW quoted per 100 units 1", async () => {
      // Arrange
      const baseCurrency = "KRW";
      const targetCurrency = "USD";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {
                    "0:0:0:0": {
                      observations: {
                        "0": ["0.7296"], // KRW/NOK rate
                      },
                    },
                    "0:1:0:0": {
                      observations: {
                        "0": ["10.5648"], // USD/NOK rate
                      },
                    },
                  },
                },
              ],
            },
          }),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.rate).toBeCloseTo(0.7296 / 10.5648 / 100);
    });

    it("should handle KRW quoted per 100 units 2", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "KRW";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {
                    "0:0:0:0": {
                      observations: {
                        "0": ["10.5648"], // USD/NOK rate
                      },
                    },
                    "0:1:0:0": {
                      observations: {
                        "0": ["0.7296"], // KRW/NOK rate
                      },
                    },
                  },
                },
              ],
            },
          }),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.rate).toBeCloseTo((10.5648 / 0.7296) * 100);
    });

    it("should handle IDR quoted per 100 units 1", async () => {
      // Arrange
      const baseCurrency = "IDR";
      const targetCurrency = "USD";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {
                    "0:0:0:0": {
                      observations: {
                        "0": ["0.062299"], // IDR/NOK rate
                      },
                    },
                    "0:1:0:0": {
                      observations: {
                        "0": ["10.5648"], // USD/NOK rate
                      },
                    },
                  },
                },
              ],
            },
          }),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.rate).toBeCloseTo(0.062299 / 10.5648 / 100);
    });

    it("should handle IDR quoted per 100 units 2", async () => {
      // Arrange
      const baseCurrency = "USD";
      const targetCurrency = "IDR";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              dataSets: [
                {
                  series: {
                    "0:0:0:0": {
                      observations: {
                        "0": ["10.5648"], // USD/NOK rate
                      },
                    },
                    "0:1:0:0": {
                      observations: {
                        "0": ["0.062299"], // IDR/NOK rate
                      },
                    },
                  },
                },
              ],
            },
          }),
      } as any);

      // Act
      const result = await fetchExchangeRate(baseCurrency, targetCurrency);

      // Assert
      expect(result.rate).toBeCloseTo((10.5648 / 0.062299) * 100);
    });
  });
});
