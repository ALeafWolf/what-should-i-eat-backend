import { TOOL_TIMEOUT_MS } from "../../shared/constants/index.js";

interface RateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const FALLBACK_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  CAD: 0.73,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  CNY: 0.138,
  KRW: 0.00072,
  HKD: 0.128,
  AUD: 0.64,
  SGD: 0.74,
};

let cache: RateCache | null = null;

async function fetchRates(base: string): Promise<Record<string, number>> {
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Exchange rate API returned ${response.status}`);
    const data = (await response.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== "success" || !data.rates) throw new Error("Unexpected exchange rate response");
    return data.rates;
  } catch {
    // Build fallback rates relative to the requested base
    const baseToUsd = FALLBACK_RATES_TO_USD[base] ?? 1;
    return Object.fromEntries(
      Object.entries(FALLBACK_RATES_TO_USD).map(([currency, toUsd]) => [
        currency,
        toUsd / baseToUsd,
      ]),
    );
  }
}

async function getRates(base: string): Promise<Record<string, number>> {
  const now = Date.now();
  if (cache && cache.base === base && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates;
  }
  const rates = await fetchRates(base);
  cache = { base, rates, fetchedAt: now };
  return rates;
}

export async function convertBudget(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  const rates = await getRates(fromCurrency.toUpperCase());
  const rate = rates[toCurrency.toUpperCase()];
  if (!rate) return amount;
  return amount * rate;
}
