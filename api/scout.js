export async function GET(req) {
  const { subreddit = 'learnprogramming', limit = 10 } = req.query || {};

  if (!subreddit) {
    return new Response(
      JSON.stringify({ error: 'Missing subreddit parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const accessToken = req.headers?.get('Authorization')?.replace('Bearer ', '') ||
                      process.env.REDDIT_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('Missing Reddit access token');
    return new Response(
      JSON.stringify({ error: 'Missing Reddit access token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const userAgent = process.env.REDDIT_USER_AGENT;
  if (!userAgent) {
    console.error('Missing REDDIT_USER_AGENT');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch posts from Reddit
    console.log(`Fetching ${limit} posts from r/${subreddit}`);
    const redditResponse = await fetchRedditPosts(subreddit, limit, accessToken, userAgent);

    if (!redditResponse.success) {
      console.error('Reddit fetch failed:', redditResponse.error);
      return new Response(
        JSON.stringify({ error: redditResponse.error }),
        { status: redditResponse.status || 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const posts = redditResponse.data;
    console.log(`Fetched ${posts.length} posts, scoring each...`);

    // Score each post via LLM
    const scoredPosts = [];
    for (const post of posts) {
      const score = await scorePost(post.title);
      scoredPosts.push({
        post_id: post.id,
        title: post.title,
        score: score || 0,
        url: post.url,
        author: post.author,
      });
      console.log(`  → ${post.title.substring(0, 50)}... [score: ${score}]`);
    }

    return new Response(
      JSON.stringify({
        subreddit,
        posts_fetched: posts.length,
        posts_scored: scoredPosts,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Scout error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Scout processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchRedditPosts(subreddit, limit, accessToken, userAgent) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/hot?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': userAgent,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Invalid Reddit access token', status: 401 };
      }
      const error = await response.text();
      console.error(`Reddit error (${response.status}):`, error);
      return { success: false, error: `Reddit API error: ${response.status}`, status: 500 };
    }

    const data = await response.json();
    const posts = (data.data?.children || []).map(child => ({
      id: child.data.id,
      title: child.data.title,
      url: child.data.url,
      author: child.data.author,
    }));

    return { success: true, data: posts };
  } catch (err) {
    console.error('Reddit fetch error:', err.message);
    return { success: false, error: `Request failed: ${err.message}`, status: 500 };
  }
}

async function scorePost(title) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const prompt = `Score this lead quality 1-10. Only respond with the number.
"${title}"`;

    const response = await fetch('/api/llm-infer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('LLM scoring failed, using default');
      return 5;
    }

    const data = await response.json();
    const result = data.result || '';
    const score = parseInt(result.match(/\d+/)?.[0]) || 5;
    return Math.min(Math.max(score, 1), 10);
  } catch (err) {
    console.warn('LLM error, using default score:', err.message);
    return 5;
  }
}
