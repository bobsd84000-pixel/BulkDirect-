/**
 * api/reddit-scout.js
 * BulkDirect Scout stage — scrape Reddit via Playwright
 * Remplace OAuth bloqué. Public posts only.
 * Deployment: Vercel (Node 20, 512MB memory limit)
 */

import { chromium } from 'playwright';

const TIMEOUT = 30000; // 30s timeout Vercel
const CACHE_TTL = 3600; // 1h cache
const POSTS_PER_SUBREDDIT = 15; // limit data

// Simple in-memory cache (Vercel stateless, reset per deploy)
const cache = new Map();

function getCacheKey(subreddit, sortBy = 'hot') {
  return `scout:${subreddit}:${sortBy}`;
}

function isCached(key) {
  const entry = cache.get(key);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > CACHE_TTL * 1000) {
    cache.delete(key);
    return false;
  }
  return true;
}

async function scrapeLimitedReddit(subreddit, sortBy = 'hot') {
  const key = getCacheKey(subreddit, sortBy);

  if (isCached(key)) {
    return cache.get(key).data;
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage', // Vercel memory limit
      ],
    });

    const context = await browser.createBrowserContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(TIMEOUT);
    page.setDefaultTimeout(10000);

    const url = `https://www.reddit.com/r/${subreddit}/${sortBy}/.json`;

    // No cookies, minimal headers (avoid detection)
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (!response.ok()) {
      throw new Error(`Reddit returned ${response.status()}`);
    }

    // Extract JSON from page
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
      throw new Error('Invalid Reddit JSON structure');
    }

    // Parse posts
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
          comments: post.num_comments,
          created_utc: post.created_utc,
          subreddit: post.subreddit,
          is_self: post.is_self,
          selftext: post.is_self ? post.selftext.slice(0, 500) : null, // truncate
          permalink: `https://reddit.com${post.permalink}`,
        };
      });

    // Cache result
    cache.set(key, {
      data: posts,
      timestamp: Date.now(),
    });

    return posts;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subreddits = ['leadsgeneration'], sortBy = 'hot' } = req.body;

  if (!Array.isArray(subreddits) || subreddits.length === 0) {
    return res.status(400).json({ error: 'subreddits must be non-empty array' });
  }

  // Limit to 3 subreddits per request (memory)
  if (subreddits.length > 3) {
    return res.status(400).json({ error: 'Max 3 subreddits per request' });
  }

  try {
    const results = {};

    for (const sub of subreddits) {
      // Sanitize subreddit name
      const cleanSub = sub.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);

      if (!cleanSub) {
        results[sub] = { error: 'Invalid subreddit name' };
        continue;
      }

      try {
        const posts = await scrapeLimitedReddit(cleanSub, sortBy);
        results[cleanSub] = { posts, count: posts.length };
      } catch (err) {
        results[cleanSub] = { error: err.message };
      }
    }

    return res.status(200).json({
      status: 'scout_complete',
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err) {
    console.error('Scout error:', err);
    return res.status(500).json({
      error: 'Scout failed',
      detail: err.message,
    });
  }
}
