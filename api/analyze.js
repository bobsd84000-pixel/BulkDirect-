// api/analyze.js — Vercel Serverless Function (Node.js)
// Vraies donnees Reddit. Aucun chiffre invente.
// GET /api/analyze?q=tapis+de+yoga

const UA = 'web:bulkdirect:0.1 (by /u/bulkdirect)';
const WINDOW_DAYS = 90;
const MAX_PAGES = 5;     // 5 x 100 = 500 posts max
const PAGE_SIZE = 100;

// --- Auth applicative Reddit (client_credentials) ---
// Necessite REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET dans Vercel > Settings > Environment Variables
async function getToken() {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) throw new Error(`auth reddit ${res.status}`);
  const json = await res.json();
  return json.access_token || null;
}

// --- Une page de resultats ---
async function fetchPage(query, token, after) {
  const params = new URLSearchParams({
    q: query,
    limit: String(PAGE_SIZE),
    sort: 'new',
    t: 'year',
    type: 'link',
    raw_json: '1'
  });
  if (after) params.set('after', after);

  const base = token ? 'https://oauth.reddit.com/search' : 'https://www.reddit.com/search.json';
  const headers = { 'User-Agent': UA };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}?${params}`, { headers });
  if (res.status === 429) throw new Error('quota reddit atteint (429)');
  if (!res.ok) throw new Error(`reddit ${res.status}`);

  const json = await res.json();
  const children = json?.data?.children || [];
  return { posts: children.map((c) => c.data), after: json?.data?.after || null };
}

export default async function handler(req, res) {
  const q = (req.query.q || '').trim();

  if (q.length < 3) {
    return res.status(400).json({ error: 'Parametre q manquant ou trop court (3 caracteres minimum).' });
  }

  const started = Date.now();

  try {
    const token = await getToken();
    const cutoff = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86400;

    const posts = [];
    let after = null;
    let pages = 0;
    let reachedCutoff = false;

    while (pages < MAX_PAGES && !reachedCutoff) {
      const page = await fetchPage(q, token, after);
      pages++;

      for (const p of page.posts) {
        if (p.created_utc < cutoff) { reachedCutoff = true; continue; }
        posts.push(p);
      }

      after = page.after;
      if (!after || page.posts.length === 0) break;
    }

    // --- Agregats reels ---
    const comments = posts.reduce((sum, p) => sum + (p.num_comments || 0), 0);
    const upvotes = posts.reduce((sum, p) => sum + (p.score || 0), 0);

    const bySub = {};
    for (const p of posts) {
      const s = p.subreddit || 'inconnu';
      bySub[s] = (bySub[s] || 0) + 1;
    }
    const subreddits = Object.entries(bySub)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, posts: count }));

    const top = [...posts]
      .sort((a, b) => (b.num_comments || 0) - (a.num_comments || 0))
      .slice(0, 5)
      .map((p) => ({
        title: p.title,
        subreddit: p.subreddit,
        comments: p.num_comments || 0,
        upvotes: p.score || 0,
        url: `https://www.reddit.com${p.permalink}`,
        date: new Date(p.created_utc * 1000).toISOString().slice(0, 10)
      }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).json({
      query: q,
      source: 'reddit',
      authenticated: Boolean(token),
      window_days: WINDOW_DAYS,
      truncated: pages >= MAX_PAGES && Boolean(after),
      measured: {
        posts: posts.length,
        comments,
        upvotes,
        conversations: posts.length + comments,
        distinct_subreddits: Object.keys(bySub).length
      },
      subreddits,
      top_posts: top,
      note: 'Volumes bruts mesures sur Reddit uniquement. Aucun score calcule.',
      elapsed_ms: Date.now() - started
    });
  } catch (err) {
    return res.status(502).json({
      error: 'Lecture Reddit impossible.',
      detail: String(err.message || err),
      hint: 'Verifier REDDIT_CLIENT_ID et REDDIT_CLIENT_SECRET dans Vercel. Sans cles, Reddit bloque souvent les IP serveur.'
    });
  }
}
