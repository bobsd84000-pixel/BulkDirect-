const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const UA = 'web:bulkdirect:1.0 (by /u/bulkdirect)';

let tokenCache = null;
let tokenExpiry = 0;

async function getRedditToken() {
  if (tokenCache && Date.now() < tokenExpiry) return tokenCache;

  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'User-Agent': UA },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`);
  const data = await res.json();
  tokenCache = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
  return tokenCache;
}

async function searchReddit(query, subreddits) {
  const token = await getRedditToken();
  const endpoints = [
    `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=new&t=all&limit=100`,
    `https://oauth.reddit.com/r/${subreddits.join('+')}/search?q=${encodeURIComponent(query)}&sort=new&t=all&limit=100`
  ];

  const results = [];
  for (const url of endpoints) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA }
    });
    if (res.ok) {
      const data = await res.json();
      results.push(...(data.data?.children || []));
    }
  }
  return results;
}

export default async function handler(req, res) {
  const { niche } = req.query;

  if (!niche) {
    return res.status(400).json({ error: 'niche param required' });
  }

  try {
    const subreddits = ['dropship', 'ecommerce', 'Entrepreneur', 'smallbusiness', 'FulfillmentByAmazon'];
    const posts = await searchReddit(niche, subreddits);

    if (posts.length === 0) {
      return res.status(200).json({
        niche,
        score: 2,
        mentions: 0,
        avgUpvotes: 0,
        avgComments: 0,
        communities: 0,
        recentShare: 0,
        sellerPosts: 0,
        competition: 'low',
        verdict: 'Très peu d\'intérêt détecté'
      });
    }

    const mentions = posts.length;
    const upvotes = posts.map(p => p.data.score || 0);
    const comments = posts.map(p => p.data.num_comments || 0);
    const avgUpvotes = Math.round(upvotes.reduce((a, b) => a + b, 0) / mentions);
    const avgComments = Math.round(comments.reduce((a, b) => a + b, 0) / mentions);

    const now = Date.now();
    const recent = posts.filter(p => (now - p.data.created_utc * 1000) < 90 * 24 * 3600 * 1000).length;
    const recentShare = (recent / mentions) * 100;

    const communities = new Set(posts.map(p => p.data.subreddit)).size;

    const sellerKeywords = /seller|fba|dropship|supplier|vendor|wholesale/i;
    const sellerPosts = posts.filter(p => sellerKeywords.test(p.data.title + p.data.selftext)).length;

    // Score: volume(max 3) + engagement(2.5) + fraîcheur(2) + communautés(1.5) + vendeurs(1)
    const volumeScore = Math.min(3, (mentions / 100) * 3);
    const engagementScore = Math.min(2.5, (avgUpvotes + avgComments) / 50);
    const freshnessScore = recentShare > 50 ? 2 : recentShare > 20 ? 1 : 0;
    const communitiesScore = Math.min(1.5, communities / 3);
    const sellerScore = sellerPosts > 5 ? 1 : sellerPosts > 0 ? 0.5 : 0;

    const score = Math.round((volumeScore + engagementScore + freshnessScore + communitiesScore + sellerScore) * 10) / 10;

    let competition = 'low';
    if (mentions > 50) competition = 'high';
    else if (mentions > 20) competition = 'medium';

    let verdict = '';
    if (score >= 7) verdict = 'Très prometteur';
    else if (score >= 5) verdict = 'Bon potentiel';
    else if (score >= 3) verdict = 'Niché, à explorer';
    else verdict = 'Peu d\'intérêt';

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      niche,
      score,
      mentions,
      avgUpvotes,
      avgComments,
      communities,
      recentShare: Math.round(recentShare * 10) / 10,
      sellerPosts,
      competition,
      verdict
    });
  } catch (error) {
    console.error('Validate error:', error);
    return res.status(500).json({ error: 'Validation failed', niche });
  }
}
