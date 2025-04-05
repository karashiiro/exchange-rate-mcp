import fetch from "node-fetch";

// Types for SDMX-JSON response
interface SDMXResponse {
  data: {
    dataSets: Array<{
      series: {
        [key: string]: {
          observations: {
            [key: string]: `${number}`[];
          };
        };
      };
    }>;
    structure: {
      dimensions: {
        series: Array<{
          id: string;
          values: Array<{
            id: string;
          }>;
        }>;
      };
    };
  };
}

export interface ExchangeRateResponse {
  baseCurrency: string;
  targetCurrency: string;
  date: string;
  rate: number;
}

interface RateMap {
  [currency: string]: number;
}

// Mapping of currencies to their corresponding reference denominations.
// Not sure if there's a comprehensive list of these somewhere.
// Each currency is quoted per X units where X is the value below
const CURRENCY_REFERENCE_DENOMINATION: { [key: string]: number } = {
  JPY: 100,
  KRW: 100,
  IDR: 100,
};

/**
 * Fetches exchange rates from Norges Bank API for multiple currencies
 *
 * @param currencies Array of currency codes to fetch (e.g., ["USD", "EUR", "JPY"])
 * @returns Promise with a map of currency codes to their NOK rates
 * @throws Error if the API request fails
 */
async function fetchNokRates(currencies: string[]): Promise<RateMap> {
  // Filter out NOK if it's in the list since we don't need to fetch it
  const currenciesToFetch = currencies.filter((c) => c !== "NOK");

  if (currenciesToFetch.length === 0) {
    return { NOK: 1 };
  }

  // Construct the API URL with all currencies
  const baseUrl = "https://data.norges-bank.no/api/data/EXR/B.";
  const currencyString = currenciesToFetch.join("+");
  const url = `${baseUrl}${currencyString}.NOK.SP?format=sdmx-json&lastNObservations=1&locale=en`;
  console.error(url);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Norges Bank API request failed with status ${response.status}`,
      );
    }

    const data = (await response.json()) as SDMXResponse;

    if (!data.data?.dataSets?.[0]?.series) {
      throw new Error("Invalid response format from Norges Bank API");
    }

    const rates: RateMap = { NOK: 1 };
    const series = data.data.dataSets[0].series;

    // Get the series structure to find the currency codes
    const seriesStructure = data.data.structure.dimensions.series.find(
      (s) => s.id === "BASE_CUR",
    )?.values;
    if (!seriesStructure) {
      throw new Error("Invalid series structure in API response");
    }

    const seriesCodes = seriesStructure.map((s) => s.id);
    console.error(seriesCodes);

    // Parse rates for each currency
    Object.entries(series).forEach(([key, value]) => {
      const observations = value.observations;
      console.error(observations);
      const latestObservation = observations[Object.keys(observations)[0]];
      let rate = parseFloat(latestObservation[0]);

      if (typeof rate !== "number") {
        throw new Error("Invalid rate value in API response");
      }

      // Find the index of this currency in the original list
      const index = parseInt(key.split(":")[1]);
      const currency = seriesCodes[index];

      // Adjust rate based on target's reference denomination
      if (currency in CURRENCY_REFERENCE_DENOMINATION) {
        rate /= CURRENCY_REFERENCE_DENOMINATION[currency];
      }

      rates[currency] = rate;
    });

    return rates;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch exchange rates: ${error.message}`);
    }
    throw new Error("Failed to fetch exchange rates: Unknown error");
  }
}

/**
 * Fetches exchange rate between any two currencies
 *
 * @param baseCurrency The base currency code (e.g., USD, EUR)
 * @param targetCurrency The target currency code (e.g., JPY, GBP)
 * @param date Optional date in YYYY-MM-DD format. Defaults to latest available rate.
 * @returns Promise with exchange rate data
 * @throws Error if currencies are invalid or API request fails
 */
export async function fetchExchangeRate(
  baseCurrency: string,
  targetCurrency: string,
  date?: string,
): Promise<ExchangeRateResponse> {
  // Get rates for both currencies relative to NOK
  const rates = await fetchNokRates([baseCurrency, targetCurrency]);

  if (!(baseCurrency in rates) || !(targetCurrency in rates)) {
    throw new Error(
      "One or both currencies not available from Norges Bank API",
    );
  }

  // Calculate cross rate:
  // If converting USD to EUR and we have USD/NOK and EUR/NOK rates,
  // then USD/EUR = (USD/NOK) / (EUR/NOK)
  const rate = rates[baseCurrency] / rates[targetCurrency];

  return {
    baseCurrency,
    targetCurrency,
    date: date || new Date().toISOString().split("T")[0],
    rate,
  };
}
