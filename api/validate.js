export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { leads, products, requirements } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: "Invalid leads array" });
    }

    const validated = leads.map(lead => ({
      ...lead,
      isValid: lead.author && lead.category && lead.painPoints,
      score: (lead.confidence || 0) * 0.7 + (lead.painPoints?.length || 0) * 10,
      timestamp: new Date().toISOString()
    }));

    res.status(200).json({
      total: validated.length,
      valid: validated.filter(l => l.isValid).length,
      leads: validated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
