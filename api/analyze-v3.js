/**
 * api/analyze-v3.js
 * BulkDirect Full Pipeline Orchestrator
 * Scout → Analyst → Filter → Export
 * Single endpoint, internal stage chaining
 */

import { chromium } from 'playwright';

const TIMEOUT = 60000; // 60s total (Vercel max)
const POSTS_PER_SUBREDDIT = 15;

// ============ SCOUT STAGE ============
async function scoutStage(subreddits, sortBy = 'hot') {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const scoutResults = {};

    for (const subreddit of subreddits) {
      const cleanSub = subreddit.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);

      if (!cleanSub) {
        scoutResults[subreddit] = { error: 'Invalid subreddit' };
        continue;
      }

      try {
        const context = await browser.createBrowserContext({
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        });

        const page = await context.newPage();
        page.setDefaultNavigationTimeout(TIMEOUT / subreddits.length);

        const url = `https://www.reddit.com/r/${cleanSub}/${sortBy}/.json`;
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
        });

        if (!response.ok()) {
          throw new Error(`Reddit ${response.status()}`);
        }

        const data = await page.evaluate(() => {
          const text = document.body.innerText;
          try {
            return JSON.parse(text);
          } catch {
            return null;
          }
        });

        await context.close();

        if (!data || !data.data || !data.data.children) {
          throw new Error('Invalid JSON structure');
        }

        const posts = data.data.children
          .slice(0, POSTS_PER_SUBREDDIT)
          .map((child) => {
            const post = child.data;
            return {
              id: post.id,
              title: post.title,
              author: post.author,
              url: post.url,
              score: post.score,
              num_comments: post.num_comments,
              created_utc: post.created_utc,
              subreddit: post.subreddit,
              is_self: post.is_self,
              selftext: post.is_self ? post.selftext.slice(0, 500) : null,
              permalink: `https://reddit.com${post.permalink}`,
            };
          });

        scoutResults[cleanSub] = { posts, count: posts.length };
      } catch (err) {
        scoutResults[subreddit] = { error: err.message };
      }
    }

    return scoutResults;
  } finally {
    if (browser) await browser.close();
  }
}

// ============ ANALYST STAGE ============
function analyzePost(post) {
  const LEAD_KEYWORDS = {
    high: ['hiring', 'looking for', 'need help', 'urgent', 'budget'],
    medium: ['interested', 'considering', 'exploring', 'open to'],
    low: ['question', 'thoughts', 'opinions'],
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

  const textContent = `${post.title} ${post.selftext || ''}`;
  const lower = textContent.toLowerCase();

  let keywordScore = 0;
  for (const [level, kws] of Object.entries(LEAD_KEYWORDS)) {
    const multiplier = level === 'high' ? 3 : level === 'medium' ? 1.5 : 1;
    kws.forEach((kw) => {
      if (lower.includes(kw)) keywordScore += multiplier;
    });
  }

  EXCLUDE_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) keywordScore = Math.max(0, keywordScore - 5);
  });

  const engagementScore =
    Math.log(post.score + 1) + Math.log(post.num_comments + 1);
  const recencyScore =
    Math.max(
      0,
      7 - Math.floor((Date.now() / 1000 - post.created_utc) / 86400)
    ) * 2;

  const finalScore = keywordScore * 2 + engagementScore * 1.5 + recencyScore;

  return {
    post_id: post.id,
    title: post.title,
    author: post.author,
    score: post.score,
    comments: post.num_comments,
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

function analystStage(scoutResults, minQuality = 'medium') {
  const qualityLevels = { high: 3, medium: 2, low: 1 };
  const minLevel = qualityLevels[minQuality] || 2;

  const analyzed = [];
  const summary = {};

  for (const [subreddit, scoutData] of Object.entries(scoutResults)) {
    if (!scoutData.posts || !Array.isArray(scoutData.posts)) continue;

    summary[subreddit] = {
      total_posts: scoutData.posts.length,
      high: 0,
      medium: 0,
      low: 0,
    };

    scoutData.posts.forEach((post) => {
      const analyzed_post = analyzePost(post);
      analyzed_post.subreddit = subreddit;

      if (qualityLevels[analyzed_post.verdict] >= minLevel) {
        analyzed.push(analyzed_post);
      }

      summary[subreddit][analyzed_post.verdict]++;
    });
  }

  analyzed.sort((a, b) => b.quality_score - a.quality_score);

  return { posts: analyzed, summary };
}

// ============ FILTER STAGE ============
function filterStage(posts) {
  const BUSINESS_RULES = {
    exclude: ['agency', 'freelancer', 'marketplace', 'cheap labor'],
    target: ['saas', 'startup', 'growth', 'b2b', 'enterprise'],
    departments: {
      sales: ['sales', 'business dev', 'revenue'],
      marketing: ['marketing', 'demand gen', 'growth'],
      product: ['product', 'engineering', 'tech'],
      ops: ['operations', 'hiring', 'recruitment'],
    },
  };

  const filtered = [];
  const rejected = [];
  const summary = {
    total_input: posts.length,
    passed: 0,
    rejected: 0,
    by_department: {},
    by_priority: { high: 0, normal: 0 },
  };

  posts.forEach((post) => {
    const text = `${post.title}`.toLowerCase();
    const verdict = { pass: true, reasons: [] };

    // Exclusion
    BUSINESS_RULES.exclude.forEach((pattern) => {
      if (text.includes(pattern)) {
        verdict.pass = false;
        verdict.reasons.push(`excluded: "${pattern}"`);
      }
    });

    // Target bonus
    let targetBonus = 0;
    BUSINESS_RULES.target.forEach((pattern) => {
      if (text.includes(pattern)) targetBonus += 1.5;
    });

    // Detect department
    let department = 'unknown';
    for (const [dept, keywords] of Object.entries(BUSINESS_RULES.departments)) {
      if (keywords.some((kw) => text.includes(kw))) {
        department = dept;
        break;
      }
    }

    const finalScore = parseFloat((post.quality_score + targetBonus).toFixed(2));
    const lead = {
      lead_id: `${post.subreddit}_${post.post_id}`,
      subreddit: post.subreddit,
      author: post.author,
      title: post.title,
      url: post.permalink,
      quality_score: post.quality_score,
      final_score: finalScore,
      department,
      status: verdict.pass ? 'lead_ready' : 'filtered_out',
      priority: finalScore > 15 ? 'high' : 'normal',
      engagement: `${post.score} upvotes, ${post.comments} comments`,
      created_at: post.created_at,
    };

    if (verdict.pass) {
      filtered.push(lead);
      summary.passed++;
      summary.by_priority[lead.priority]++;
      summary.by_department[department] =
        (summary.by_department[department] || 0) + 1;
    } else {
      rejected.push(lead);
      summary.rejected++;
    }
  });

  filtered.sort((a, b) => b.final_score - a.final_score);

  return { leads: filtered, rejected, summary };
}

// ============ MAIN HANDLER ============
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

  const startTime = Date.now();
  const { subreddits = ['leadsgeneration'], sortBy = 'hot', minQuality = 'medium' } = req.body;

  try {
    console.log(`[Pipeline] Starting: ${subreddits.join(', ')}`);

    // Scout
    const scoutResults = await scoutStage(subreddits, sortBy);
    const scoutTime = Date.now() - startTime;
    console.log(`[Scout] Complete in ${scoutTime}ms`);

    // Analyst
    const { posts: analyzedPosts, summary: analystSummary } = analystStage(
      scoutResults,
      minQuality
    );
    const analystTime = Date.now() - startTime - scoutTime;
    console.log(`[Analyst] Scored ${analyzedPosts.length} posts in ${analystTime}ms`);

    // Filter
    const { leads, rejected, summary: filterSummary } =
      filterStage(analyzedPosts);
    const filterTime = Date.now() - startTime - scoutTime - analystTime;
    console.log(`[Filter] ${leads.length} leads ready in ${filterTime}ms`);

    return res.status(200).json({
      status: 'pipeline_complete',
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
      stages: {
        scout: { results: scoutResults },
        analyst: { summary: analystSummary },
        filter: { summary: filterSummary },
      },
      leads,
      rejected_count: rejected.length,
      next_action:
        leads.length > 0
          ? 'Ready for export or manual review'
          : 'No leads passed filters. Adjust rules.',
    });
  } catch (err) {
    console.error('Pipeline error:', err);
    return res.status(500).json({
      error: 'Pipeline failed',
      detail: err.message,
      stage: err.stage || 'unknown',
    });
  }
}
