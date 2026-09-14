const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function querySupabase(category, limit) {
  const url = `${SUPABASE_URL}/rest/v1/suppliers?category=ilike.%${encodeURIComponent(category)}%&select=*&limit=${Math.min(limit, 100)}&order=margin.desc,moq.asc`;

  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    if (res.status === 503) throw new Error('Supabase unavailable');
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export default async function handler(req, res) {
  const { category, limit = 10 } = req.query;

  if (!category) {
    return res.status(400).json({ error: 'category param required' });
  }

  try {
    const suppliers = await querySupabase(category, limit);

    res.setHeader('Cache-Control', 's-maxage=14400, stale-while-revalidate=86400');
    return res.status(200).json(suppliers);
  } catch (error) {
    console.error('Suppliers error:', error);
    return res.status(500).json({ error: 'Suppliers service unavailable' });
  }
}
