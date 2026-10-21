/**
 * Scout Agent
 * Discovers and extracts B2B leads from Reddit
 */

const Agent = require('./agent-base');
const RedditClient = require('./reddit-client');
const EntityExtractor = require('./entity-extractor');
const LeadScorer = require('./lead-scorer');

class ScoutAgent extends Agent {
  constructor(config = {}) {
    super(config);
    this.type = 'scout';
    this.description = 'Discovers and extracts B2B leads from Reddit';

    // Initialize dependencies
    this.redditClient = new RedditClient(config.reddit || {});
    this.entityExtractor = new EntityExtractor();
    this.leadScorer = new LeadScorer({
      qualityThreshold: config.qualityThreshold || 0.4,
      ...config.scorer
    });

    // Scout-specific state
    this.subreddits = config.subreddits || ['SaaS', 'Entrepreneur', 'startup'];
    this.processedPostIds = new Set(); // Track posts to avoid duplicates
    this.discoveredLeads = [];

    this.logIfDebug('Scout Agent initialized', {
      subreddits: this.subreddits,
      qualityThreshold: config.qualityThreshold
    });
  }

  /**
   * Process a scout task (fetch and analyze posts)
   */
  async process(message) {
    const { type, subreddit, limit = 25 } = message.payload || {};

    try {
      switch (type) {
        case 'scan_subreddit':
          return await this.scanSubreddit(subreddit, limit);
        case 'analyze_post':
          return await this.analyzePost(message.payload);
        case 'search_keyword':
          return await this.searchKeyword(message.payload);
        case 'get_status':
          return this.getStatus();
        default:
          return { success: false, error: 'Unknown scout message type' };
      }
    } catch (error) {
      this.logIfDebug('Scout processing error', { error: error.message });
      throw error;
    }
  }

  /**
   * Scan a subreddit for leads
   */
  async scanSubreddit(subreddit, limit = 25) {
    this.logIfDebug('Scanning subreddit', { subreddit, limit });

    try {
      // Authenticate with Reddit
      await this.redditClient.authenticate();

      // Fetch posts from subreddit
      const result = await this.redditClient.getSubredditPosts(subreddit, { limit });
      const { posts = [] } = result;

      const leads = [];

      for (const post of posts) {
        // Skip if already processed
        if (this.processedPostIds.has(post.id)) {
          continue;
        }

        // Analyze post for lead potential
        const analyzed = await this.analyzePostData(post);

        if (analyzed.isLead) {
          leads.push(analyzed);
          this.processedPostIds.add(post.id);
        }
      }

      this.logIfDebug('Scan complete', { subreddit, total: posts.length, leads: leads.length });

      return {
        success: true,
        subreddit,
        totalPostsScanned: posts.length,
        leadsFound: leads.length,
        leads
      };
    } catch (error) {
      return {
        success: false,
        subreddit,
        error: error.message
      };
    }
  }

  /**
   * Analyze a single post for lead signals
   */
  async analyzePostData(post) {
    try {
      const { id, title, selftext, author, score, num_comments, url, permalink } = post;

      // Extract entities from title and body
      const entities = this.entityExtractor.extractAll(
        `${title} ${selftext}`.substring(0, 5000) // Limit text to avoid huge payloads
      );

      // Score the lead
      const scored = this.leadScorer.scoreLead(entities, post);

      // Fetch comments if high score
      let comments = [];
      if (scored.totalScore > 0.5 && num_comments > 0) {
        try {
          const commentResult = await this.redditClient.getPostComments(
            post.subreddit,
            id,
            { limit: 20 }
          );
          comments = commentResult.comments || [];

          // Also extract entities from comments
          const commentText = comments.map(c => c.body).join(' ').substring(0, 5000);
          const commentEntities = this.entityExtractor.extractAll(commentText);

          // Re-score with comment data
          const combinedEntities = this.mergeEntities(entities, commentEntities);
          scored.reScored = this.leadScorer.scoreLead(combinedEntities, post, comments);
        } catch (commentError) {
          this.logIfDebug('Comment fetch failed', { postId: id, error: commentError.message });
        }
      }

      const finalScore = scored.reScored || scored;

      return {
        postId: id,
        title,
        author,
        subreddit: post.subreddit,
        url,
        permalink: `https://reddit.com${permalink}`,
        score,
        num_comments,
        entities,
        leadScore: finalScore.totalScore,
        confidence: finalScore.confidence,
        tier: finalScore.tier,
        isLead: finalScore.isQualified,
        reasoning: finalScore.reasoning,
        commentCount: comments.length,
        scannedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logIfDebug('Post analysis error', { error: error.message });
      return { isLead: false, error: error.message };
    }
  }

  /**
   * Analyze a specific post (by ID and subreddit)
   */
  async analyzePost(payload) {
    const { postId, subreddit, fetchComments = true } = payload;

    if (!postId || !subreddit) {
      return { success: false, error: 'Missing postId or subreddit' };
    }

    try {
      await this.redditClient.authenticate();

      // Fetch post details
      const searchResult = await this.redditClient.getSubredditPosts(subreddit, { limit: 1 });
      const post = searchResult.posts.find(p => p.id === postId);

      if (!post) {
        return { success: false, error: 'Post not found' };
      }

      const analyzed = await this.analyzePostData(post);

      return {
        success: true,
        post: analyzed
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search for keywords in subreddit
   */
  async searchKeyword(payload) {
    const { keyword, subreddit, limit = 25 } = payload;

    if (!keyword || !subreddit) {
      return { success: false, error: 'Missing keyword or subreddit' };
    }

    try {
      await this.redditClient.authenticate();

      const result = await this.redditClient.searchSubreddit(subreddit, keyword, { limit });
      const { posts = [] } = result;

      const leads = [];

      for (const post of posts) {
        if (this.processedPostIds.has(post.id)) {
          continue;
        }

        const analyzed = await this.analyzePostData(post);
        if (analyzed.isLead) {
          leads.push(analyzed);
          this.processedPostIds.add(post.id);
        }
      }

      return {
        success: true,
        keyword,
        subreddit,
        totalFound: posts.length,
        qualifiedLeads: leads.length,
        leads
      };
    } catch (error) {
      return {
        success: false,
        keyword,
        subreddit,
        error: error.message
      };
    }
  }

  /**
   * Get scout status and stats
   */
  getStatus() {
    const health = this.getHealth();

    return {
      success: true,
      agent: this.name,
      status: health.status,
      processedPostIds: this.processedPostIds.size,
      discoveredLeads: this.discoveredLeads.length,
      uptime: health.uptime,
      metrics: health.metrics
    };
  }

  /**
   * Merge entities from multiple sources
   */
  mergeEntities(entities1, entities2) {
    return {
      companies: [...new Set([...(entities1.companies || []), ...(entities2.companies || [])])],
      tools: [...new Set([...(entities1.tools || []), ...(entities2.tools || [])])],
      titles: [...new Set([...(entities1.titles || []), ...(entities2.titles || [])])],
      painPoints: [...new Set([...(entities1.painPoints || []), ...(entities2.painPoints || [])])],
      budgetSignals: [...new Set([...(entities1.budgetSignals || []), ...(entities2.budgetSignals || [])])]
    };
  }

  /**
   * Log if debug enabled
   */
  logIfDebug(message, data = {}) {
    if (this.config.logLevel === 'debug') {
      console.log(`[${this.name}] ${message}`, data);
    }
  }
}

module.exports = ScoutAgent;
