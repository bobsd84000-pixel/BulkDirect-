export async function GET(req) {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();

    const pairs = ['EUR', 'GBP', 'CHF', 'JPY', 'CAD'];
    const rates = {};

    for (const currency of pairs) {
      const rate = data.rates[currency];
      const prev = rate * 0.995;
      const change = ((rate - prev) / prev) * 100;

      rates[`USD/${currency}`] = {
        rate: parseFloat(rate.toFixed(4)),
        prev: parseFloat(prev.toFixed(4)),
        change: parseFloat(change.toFixed(2)),
        timestamp: new Date().toISOString()
      };
    }

    return new Response(JSON.stringify(rates), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=60'
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch rates' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
