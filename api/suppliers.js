export default async function handler(req, res) {
  const { category, limit = 10 } = req.query;

  if (!category) {
    return res.status(400).json({ error: 'category param required' });
  }

  // Mock suppliers data — remplacer par Supabase query
  const mockSuppliers = [
    {
      name: 'TechSource Asia',
      country: 'China',
      moq: '100 units',
      lead_days: 14,
      margin: 35,
      reliability_score: 92,
      search_score: 0.95
    },
    {
      name: 'EuroManufacture GmbH',
      country: 'Germany',
      moq: '50 units',
      lead_days: 10,
      margin: 42,
      reliability_score: 98,
      search_score: 0.89
    },
    {
      name: 'Global Trade Partners',
      country: 'India',
      moq: '200 units',
      lead_days: 21,
      margin: 28,
      reliability_score: 85,
      search_score: 0.82
    },
    {
      name: 'Nordic Supply Co',
      country: 'Sweden',
      moq: '30 units',
      lead_days: 8,
      margin: 48,
      reliability_score: 96,
      search_score: 0.88
    },
    {
      name: 'Pacific Traders Ltd',
      country: 'Vietnam',
      moq: '150 units',
      lead_days: 16,
      margin: 32,
      reliability_score: 88,
      search_score: 0.80
    }
  ];

  // Sort by search_score and limit
  const sorted = mockSuppliers
    .sort((a, b) => b.search_score - a.search_score)
    .slice(0, parseInt(limit));

  res.status(200).json(sorted);
}
