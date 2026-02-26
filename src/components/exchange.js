const API_KEY = process.env.REACT_APP_EXCHANGE_API_KEY;

export async function getExchangeRate(from, nextCurrency) {
  if (from === nextCurrency) return 1;

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/pair/${from}/${nextCurrency}`
    );

    if (!res.ok) {
      throw new Error(`Exchange API error: HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!data || data.result !== 'success' || typeof data.conversion_rate !== 'number') {
      console.error("Invalid API response", data);
      throw new Error("Invalid exchange rate response format");
    }

    return data.conversion_rate; // ← Use this instead of data.result

  } catch (err) {
    console.error("Exchange rate fetch failed:", err.message || err);
    return null;
  }
}