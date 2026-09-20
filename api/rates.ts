import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'max-age=60');

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();

    const pairs = ['EUR', 'GBP', 'CHF', 'JPY', 'CAD'];
    const rates = {};

    for (const currency of pairs) {
      const rate = data.rates[currency];
      const prev = rate * 0.995; // Simulation variation
      const change = ((rate - prev) / prev) * 100;

      rates[`USD/${currency}`] = {
        rate: parseFloat(rate.toFixed(4)),
        prev: parseFloat(prev.toFixed(4)),
        change: parseFloat(change.toFixed(2)),
        timestamp: new Date().toISOString()
      };
    }

    res.status(200).json(rates);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
}
