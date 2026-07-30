// api/analyze-v2.js — Vercel Serverless Function (Node.js)
// Pipeline 4 agents: Scout -> Analyst -> Filter -> Export + Verifier separe
// Vraies donnees Reddit. Aucun chiffre invente.
// GET /api/analyze-v2?q=tapis+de+yoga

const { runPipeline } = require('./lib/task-graph.js');

const UA = 'web:bulkdirect:0.1 (by /u/bulkdirect)';
const WINDOW_DAYS = 90;
const MAX_PAGES = 5;
const PAGE_SIZE = 100;

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

// ===== AGENT 1: SCOUT =====
// Recupere les posts bruts depuis Reddit, applique la fenetre temporelle
async function scoutAgent(query) {
  const token = await getToken();
  const cutoff = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86400;

  const posts = [];
  let after = null;
  let pages = 0;
  let reachedCutoff = false;

  while (pages < MAX_PAGES && !reachedCutoff) {
    const page = await fetchPage(query, token, after);
    pages++;

    for (const p of page.posts) {
      if (p.created_utc < cutoff) { reachedCutoff = true; continue; }
      posts.push(p);
    }

    after = page.after;
    if (!after || page.posts.length === 0) break;
  }

  return {
    posts,
    pages,
    truncated: pages >= MAX_PAGES && Boolean(after),
    authenticated: Boolean(token)
  };
}

// ===== AGENT 2: ANALYST =====
// Calcule des metriques agregees reelles (pas de score invente, moyennes mesurees)
async function analystAgent(posts) {
  const comments = posts.reduce((sum, p) => sum + (p.num_comments || 0), 0);
  const upvotes = posts.reduce((sum, p) => sum + (p.score || 0), 0);
  const n = posts.length || 1;

  return {
    totalComments: comments,
    totalUpvotes: upvotes,
    avgComments: Math.round((comments / n) * 10) / 10,
    avgScore: Math.round((upvotes / n) * 10) / 10,
    // intentScore = ratio commentaires/posts, indicateur d'engagement reel (pas invente)
    intentScore: Math.round((comments / n) * 10) / 10
  };
}

// ===== AGENT 3: FILTER =====
// Garde top subreddits + top posts par engagement
async function filterAgent(posts, analystOut) {
  const bySub = {};
  for (const p of posts) {
    const s = p.subreddit || 'inconnu';
    bySub[s] = (bySub[s] || 0) + 1;
  }
  const subreddits = Object.entries(bySub)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, posts: count }));

  const topPosts = [...posts]
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

  return { subreddits, topPosts, distinctSubreddits: Object.keys(bySub).length };
}

// ===== AGENT 4: EXPORT =====
// Formate la reponse finale, pas de logique metier ici
async function exportAgent({ query, scout, analyst, filter }) {
  return {
    query,
    source: 'reddit',
    authenticated: scout.authenticated,
    window_days: WINDOW_DAYS,
    truncated: scout.truncated,
    measured: {
      posts: scout.posts.length,
      comments: analyst.totalComments,
      upvotes: analyst.totalUpvotes,
      conversations: scout.posts.length + analyst.totalComments,
      distinct_subreddits: filter.distinctSubreddits,
      avg_comments_per_post: analyst.avgComments,
      avg_score_per_post: analyst.avgScore
    },
    subreddits: filter.subreddits,
    top_posts: filter.topPosts,
    note: 'Volumes bruts mesures sur Reddit uniquement. Aucun score calcule.'
  };
}

// ===== VERIFIER (agent separe, ne genere rien) =====
// Verifie coherence avant d'envoyer la reponse au client
async function verifierAgent(exportOut, scoutOut) {
  if (exportOut.measured.posts !== scoutOut.posts.length) {
    return { passed: false, reason: 'incoherence: posts exportes != posts scoutes' };
  }
  if (exportOut.measured.posts === 0) {
    return { passed: false, reason: 'zero post: reponse non fiable' };
  }
  if (exportOut.top_posts.length > exportOut.measured.posts) {
    return { passed: false, reason: 'incoherence: plus de top_posts que de posts total' };
  }
  return { passed: true };
}

export default async function handler(req, res) {
  const q = (req.query.q || '').trim();

  if (q.length < 3) {
    return res.status(400).json({ error: 'Parametre q manquant ou trop court (3 caracteres minimum).' });
  }

  const started = Date.now();

  try {
    const trace = await runPipeline(
      {
        scout: scoutAgent,
        analyst: analystAgent,
        filter: filterAgent,
        exportFn: exportAgent,
        verifier: verifierAgent
      },
      q
    );

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

    if (trace.halted) {
      return res.status(200).json({
        query: q,
        halted: true,
        reason: trace.reason,
        steps: trace.steps,
        elapsed_ms: Date.now() - started
      });
    }

    return res.status(200).json({
      ...trace.result,
      pipeline_steps: trace.steps,
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
