export async function POST(req) {
  const body = await req.json();
  const { posts_scored } = body || {};

  if (!Array.isArray(posts_scored)) {
    return new Response(
      JSON.stringify({ error: 'posts_scored must be an array' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Analyzing ${posts_scored.length} posts for lead info...`);

  const posts_with_leads = [];

  for (const post of posts_scored) {
    const lead_info = await extractLeadInfo(post.title, post.url);
    posts_with_leads.push({
      post_id: post.post_id,
      title: post.title,
      score: post.score,
      url: post.url,
      author: post.author,
      email: lead_info.email,
      business: lead_info.business,
      intent: lead_info.intent,
    });
    console.log(`  → ${post.title.substring(0, 50)}... [email: ${lead_info.email || 'none'}, business: ${lead_info.business || 'none'}]`);
  }

  return new Response(
    JSON.stringify({
      posts_analyzed: posts_scored.length,
      posts_with_leads,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

async function extractLeadInfo(title, url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const prompt = `Extract lead info from post.
Title: "${title}"
URL: ${url}

Find and extract JSON only (no markdown, no comments):
- email: email address if mentioned, else null
- business: business/company name if mentioned, else null
- intent: lead intent in 1-3 words (e.g. "seeking supplier", "hiring developer"), else null

Respond ONLY with valid JSON, no extra text:
{"email": "...", "business": "...", "intent": "..."}`;

    const response = await fetch('/api/llm-infer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('LLM extraction failed');
      return { email: null, business: null, intent: null };
    }

    const data = await response.json();
    const result = data.result || '{}';

    // Try to parse JSON from result
    try {
      const json_match = result.match(/\{[^{}]*\}/);
      if (json_match) {
        const parsed = JSON.parse(json_match[0]);
        return {
          email: parsed.email || null,
          business: parsed.business || null,
          intent: parsed.intent || null,
        };
      }
    } catch (e) {
      console.warn('JSON parse failed for:', result.substring(0, 50));
    }

    return { email: null, business: null, intent: null };
  } catch (err) {
    console.warn('LLM extraction error:', err.message);
    return { email: null, business: null, intent: null };
  }
}
