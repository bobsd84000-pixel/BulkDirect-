export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    const { category, budget, volume } = req.query;

    // Mock supplier data (remplacer par Supabase query en production)
    const suppliers = [
      {
        id: 1,
        name: "FastParts Industrial",
        category: "manufacturing",
        rating: 4.8,
        minOrder: 100,
        leadTime: "5-7 jours",
        verified: true
      },
      {
        id: 2,
        name: "Global Bulk Supply",
        category: "electronics",
        rating: 4.5,
        minOrder: 50,
        leadTime: "10-14 jours",
        verified: true
      },
      {
        id: 3,
        name: "Premium Components Ltd",
        category: "manufacturing",
        rating: 4.9,
        minOrder: 200,
        leadTime: "3-5 jours",
        verified: true
      }
    ];

    const filtered = category
      ? suppliers.filter(s => s.category === category)
      : suppliers;

    res.status(200).json({
      count: filtered.length,
      suppliers: filtered,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
