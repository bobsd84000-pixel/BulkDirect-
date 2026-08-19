/**
 * api/reddit-analyst.js
 * BulkDirect Analyst stage — filter & rank Scout posts
 * Inputs: scoutOutput.results (posts by subreddit)
 * Outputs: ranked list by lead quality score
 */

// Lead quality indicators (customizable)
const LEAD_KEYWORDS = {
  high: ['hiring', 'looking for', 'need help', 'urgent', 'asap', 'budget'],
  medium: ['interested', 'considering', 'exploring', 'available', 'open to'],
  low: ['question', 'thoughts', 'opinions', 'feedback'],
};

const EXCLUDE_KEYWORDS = [
  'meme',
  'joke',
  'funny',
  'nsfw',
  'bot',
  'spam',
  'scam',
];

function extractKeywords(text) {
  return text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
}

function scoreText(text, keywords) {
  const lower = text.toLowerCase();
  let score = 0;

  // Keyword matching
  for (const [level, kws] of Object.entries(keywords)) {
    const multiplier = level === 'high' ? 3 : level === 'medium' ? 1.5 : 1;
    kws.forEach((kw) => {
      if (lower.includes(kw)) score += multiplier;
    });
  }

  // Exclude blacklist
  EXCLUDE_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) score = Math.max(0, score - 5);
  });

  return score;
}

function analyzePost(post) {
  // Text to analyze: title + selftext (if present)
  const textContent = `${post.title} ${post.selftext || ''}`;

  // Base scores
  const keywordScore = scoreText(textContent, LEAD_KEYWORDS);
  const engagementScore = Math.log(post.score + 1) + Math.log(post.comments + 1);
  const recencyScore =
    Math.max(0, 7 - Math.floor((Date.now() / 1000 - post.created_utc) / 86400)) * 2;

  // Weighted final score
  const finalScore = keywordScore * 2 + engagementScore * 1.5 + recencyScore;

  return {
    post_id: post.id,
    title: post.title,
    author: post.author,
    score: post.score,
    comments: post.comments,
    url: post.url,
    permalink: post.permalink,
    created_utc: post.created_utc,
    created_at: new Date(post.created_utc * 1000).toISOString(),
    quality_score: parseFloat(finalScore.toFixed(2)),
    keyword_score: parseFloat(keywordScore.toFixed(2)),
    engagement_score: parseFloat(engagementScore.toFixed(2)),
    recency_score: parseFloat(recencyScore.toFixed(2)),
    verdict: finalScore > 8 ? 'high' : finalScore > 4 ? 'medium' : 'low',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scout_results, min_quality = 'medium' } = req.body;

  if (!scout_results || typeof scout_results !== 'object') {
    return res.status(400).json({
      error: 'scout_results must be object from Scout stage',
    });
  }

  const qualityLevels = { high: 3, medium: 2, low: 1 };
  const minLevel = qualityLevels[min_quality] || 2;

  try {
    const analyzed = [];
    const summary = {};

    // Analyze all posts from all subreddits
    for (const [subreddit, scoutData] of Object.entries(scout_results)) {
      if (!scoutData.posts || !Array.isArray(scoutData.posts)) {
        continue;
      }

      summary[subreddit] = {
        total_posts: scoutData.posts.length,
        high: 0,
        medium: 0,
        low: 0,
      };

      scoutData.posts.forEach((post) => {
        const analyzed_post = analyzePost(post);
        analyzed_post.subreddit = subreddit;

        // Filter by min quality
        if (qualityLevels[analyzed_post.verdict] >= minLevel) {
          analyzed.push(analyzed_post);
        }

        // Count verdicts
        summary[subreddit][analyzed_post.verdict]++;
      });
    }

    // Sort by quality_score descending
    analyzed.sort((a, b) => b.quality_score - a.quality_score);

    return res.status(200).json({
      status: 'analyst_complete',
      timestamp: new Date().toISOString(),
      total_analyzed: analyzed.length,
      min_quality_filter: min_quality,
      summary,
      posts: analyzed,
    });
  } catch (err) {
    console.error('Analyst error:', err);
    return res.status(500).json({
      error: 'Analyst failed',
      detail: err.message,
    });
  }
}
