export async function validateNiche(niche) {
  const redditEndpoint = `https://www.reddit.com/r/${niche}/about.json`;

  try {
    const response = await fetch(redditEndpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const subreddit = data.data;

    return {
      valid: true,
      niche,
      subscribers: subreddit.subscribers,
      activeUsers: subreddit.accounts_active,
      description: subreddit.public_description,
      createdAt: new Date(subreddit.created_utc * 1000).toISOString()
    };
  } catch (error) {
    return {
      valid: false,
      niche,
      error: error.message
    };
  }
}

export async function batchValidate(niches) {
  return Promise.all(niches.map(validateNiche));
}
