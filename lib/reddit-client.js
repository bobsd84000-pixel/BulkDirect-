/**
 * Reddit API Client Wrapper
 * Handles authentication and API calls with rate limiting
 */

const https = require('https');
const querystring = require('querystring');

class RedditClient {
  constructor(config = {}) {
    this.config = {
      clientId: config.clientId || process.env.REDDIT_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.REDDIT_CLIENT_SECRET,
      username: config.username || process.env.REDDIT_USERNAME,
      password: config.password || process.env.REDDIT_PASSWORD,
      userAgent: config.userAgent || 'Agent-Scout-Reddit/1.0',
      rateLimitDelay: config.rateLimitDelay || 2000,
      requestTimeout: config.requestTimeout || 10000,
      ...config
    };

    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.lastRequestTime = 0;
    this.requestsThisPeriod = 0;

    this.validateConfig();
  }

  validateConfig() {
    const required = ['clientId', 'clientSecret', 'username', 'password'];
    for (const key of required) {
      if (!this.config[key]) {
        throw new Error(`Reddit config missing: ${key}`);
      }
    }
  }

  /**
   * Authenticate with Reddit OAuth
   */
  async authenticate() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const postData = querystring.stringify({
      grant_type: 'password',
      username: this.config.username,
      password: this.config.password
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.reddit.com',
        path: '/api/v1/access_token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': this.config.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: this.config.requestTimeout
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Auth failed: ${res.statusCode} ${data}`));
          } else {
            const response = JSON.parse(data);
            this.accessToken = response.access_token;
            this.tokenExpiresAt = Date.now() + response.expires_in * 1000;
            resolve(this.accessToken);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Authentication timeout'));
      });
      req.write(postData);
      req.end();
    });
  }

  /**
   * Make authenticated API request
   * @private
   */
  async apiRequest(path, options = {}) {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequestTime < this.config.rateLimitDelay) {
      await new Promise(resolve =>
        setTimeout(resolve, this.config.rateLimitDelay - (now - this.lastRequestTime))
      );
    }

    this.lastRequestTime = Date.now();

    // Ensure authenticated
    const token = await this.authenticate();

    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: 'oauth.reddit.com',
        path: path,
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': this.config.userAgent,
          ...options.headers
        },
        timeout: this.config.requestTimeout
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`API error: ${res.statusCode} ${data}`));
          } else {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Get posts from a subreddit
   * @param {string} subreddit - Subreddit name (without r/)
   * @param {Object} options - Query options (limit, sort, time_filter)
   */
  async getSubredditPosts(subreddit, options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 25,
      sort: options.sort || 'new',
      t: options.time_filter || 'day',
      after: options.after || ''
    });

    const path = `/r/${subreddit}/new?.json?${params}`;
    const response = await this.apiRequest(path);

    if (!response.data || !response.data.children) {
      return { posts: [], after: null };
    }

    const posts = response.data.children.map(item => ({
      id: item.data.id,
      subreddit: item.data.subreddit,
      title: item.data.title,
      selftext: item.data.selftext,
      author: item.data.author,
      created: item.data.created_utc,
      score: item.data.score,
      num_comments: item.data.num_comments,
      url: item.data.url,
      permalink: item.data.permalink,
      is_self: item.data.is_self
    }));

    return {
      posts,
      after: response.data.after
    };
  }

  /**
   * Get comments from a post
   * @param {string} subreddit - Subreddit name
   * @param {string} postId - Post ID
   * @param {Object} options - Query options
   */
  async getPostComments(subreddit, postId, options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 100,
      sort: options.sort || 'top'
    });

    const path = `/r/${subreddit}/comments/${postId}?.json?${params}`;
    const response = await this.apiRequest(path);

    if (!Array.isArray(response) || response.length < 2) {
      return { comments: [] };
    }

    const commentsData = response[1];
    if (!commentsData.data || !commentsData.data.children) {
      return { comments: [] };
    }

    const comments = commentsData.data.children
      .filter(item => item.kind === 't1') // Only comments, not more
      .map(item => ({
        id: item.data.id,
        author: item.data.author,
        body: item.data.body,
        score: item.data.score,
        created: item.data.created_utc,
        parent_id: item.data.parent_id
      }));

    return { comments };
  }

  /**
   * Get user profile info
   * @param {string} username - Username
   */
  async getUserProfile(username) {
    const path = `/user/${username}/about.json`;
    const response = await this.apiRequest(path);

    if (!response.data) {
      return null;
    }

    return {
      username: response.data.name,
      link_karma: response.data.link_karma,
      comment_karma: response.data.comment_karma,
      created: response.data.created_utc,
      is_gold: response.data.is_gold,
      is_mod: response.data.is_mod
    };
  }

  /**
   * Search subreddit for keywords
   * @param {string} subreddit - Subreddit name
   * @param {string} query - Search query
   * @param {Object} options - Search options
   */
  async searchSubreddit(subreddit, query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      type: options.type || 'link',
      sort: options.sort || 'new',
      t: options.time_filter || 'week',
      limit: options.limit || 25
    });

    const path = `/r/${subreddit}/search?.json?${params}`;
    const response = await this.apiRequest(path);

    if (!response.data || !response.data.children) {
      return { posts: [] };
    }

    const posts = response.data.children.map(item => ({
      id: item.data.id,
      subreddit: item.data.subreddit,
      title: item.data.title,
      selftext: item.data.selftext,
      author: item.data.author,
      created: item.data.created_utc,
      score: item.data.score,
      num_comments: item.data.num_comments,
      url: item.data.url,
      permalink: item.data.permalink
    }));

    return { posts };
  }

  /**
   * Get trending subreddits
   */
  async getTrendingSubreddits() {
    const path = '/r/trendingsubreddits/new.json?limit=25';
    const response = await this.apiRequest(path);

    if (!response.data || !response.data.children) {
      return { subreddits: [] };
    }

    const subreddits = response.data.children.map(item => ({
      subreddit: item.data.title.split('/r/')[1] || item.data.title,
      description: item.data.selftext
    }));

    return { subreddits };
  }
}

module.exports = RedditClient;
