export async function POST(req) {
  const body = await req.json();
  const { posts_with_leads } = body || {};

  if (!Array.isArray(posts_with_leads)) {
    return new Response(
      JSON.stringify({ error: 'posts_with_leads must be an array' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Filtering ${posts_with_leads.length} posts...`);

  // Filter: score ≥ 7 AND (email OR business)
  const filtered = posts_with_leads.filter(post => {
    const hasQualifyingScore = post.score >= 7;
    const hasContactInfo = post.email || post.business;
    return hasQualifyingScore && hasContactInfo;
  });

  console.log(`  → Found ${filtered.length} posts passing quality gate (score ≥ 7 + email/business)`);

  // Dedupe by email (keep highest score)
  const deduped = dedupeByEmail(filtered);
  console.log(`  → Deduped to ${deduped.length} unique leads (by email)`);

  // Sort by score DESC
  const sorted = deduped.sort((a, b) => b.score - a.score);

  // Add status
  const qualified_leads = sorted.map(post => ({
    ...post,
    status: 'qualified',
  }));

  return new Response(
    JSON.stringify({
      total_analyzed: posts_with_leads.length,
      total_qualified: qualified_leads.length,
      qualified_leads,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function dedupeByEmail(posts) {
  const seen = {};
  const result = [];

  for (const post of posts) {
    if (post.email) {
      // Email exists: dedupe by email
      if (!seen[post.email] || post.score > seen[post.email].score) {
        // Keep highest score for this email
        if (seen[post.email]) {
          // Remove old entry
          const idx = result.findIndex(p => p.email === post.email);
          if (idx !== -1) result.splice(idx, 1);
        }
        seen[post.email] = post;
        result.push(post);
      }
    } else {
      // No email: always add (can't dedupe)
      result.push(post);
    }
  }

  return result;
}
