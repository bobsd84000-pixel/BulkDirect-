/**
 * Router Agent
 * Routes qualified leads to appropriate service providers
 */

const Agent = require('./agent-base');
const ProviderMatcher = require('./provider-matcher');
const ProviderQueue = require('./provider-queue');
const https = require('https');

class RouterAgent extends Agent {
  constructor(config = {}) {
    super(config);
    this.type = 'router';
    this.description = 'Routes qualified leads to service providers';

    // Initialize matcher and queues
    this.matcher = new ProviderMatcher(config.providers || []);
    this.queues = new Map(); // providerId -> ProviderQueue
    this.assignments = [];
    this.routingStats = { total: 0, successful: 0, failed: 0 };

    // Config
    this.strategy = config.strategy || 'balanced'; // balanced, round-robin, capacity-based
    this.maxQueuePerProvider = config.maxQueuePerProvider || 10;
    this.fallbackEnabled = config.fallbackEnabled !== false;
    this.requestTimeout = config.requestTimeout || 10000;

    // Initialize queues for each provider
    this.matcher.getAllProviders().forEach(provider => {
      this.queues.set(provider.id, new ProviderQueue(provider.id, provider.maxConcurrent || 20));
    });

    this.logIfDebug('Router Agent initialized', {
      strategy: this.strategy,
      providers: this.matcher.getAllProviders().length
    });
  }

  /**
   * Process a routing task
   */
  async process(message) {
    const { type, lead, leads } = message.payload || {};

    try {
      switch (type) {
        case 'route_lead':
          return await this.routeLead(lead);
        case 'route_batch':
          return await this.routeBatch(leads);
        case 'send_to_provider':
          return await this.sendToProvider(lead);
        case 'get_status':
          return this.getStatus();
        default:
          return { success: false, error: 'Unknown router message type' };
      }
    } catch (error) {
      this.logIfDebug('Router processing error', { error: error.message });
      throw error;
    }
  }

  /**
   * Route a single lead to appropriate provider(s)
   */
  async routeLead(lead) {
    if (!lead) {
      return { success: false, error: 'Lead required' };
    }

    try {
      this.logIfDebug('Routing lead', { postId: lead.postId });

      // Find matching providers
      const matches = this.matcher.findMatches(lead, 3);

      if (matches.matches.length === 0) {
        return {
          success: false,
          postId: lead.postId,
          error: 'No matching providers found',
          reason: 'Lead does not match any provider criteria'
        };
      }

      // Select best provider based on strategy
      const selectedProvider = this.selectProvider(matches.matches, lead);

      if (!selectedProvider) {
        return {
          success: false,
          postId: lead.postId,
          error: 'No available providers',
          reason: 'All matching providers at capacity'
        };
      }

      // Enqueue lead
      const queue = this.queues.get(selectedProvider.provider);
      const priority = this.calculatePriority(lead);
      const queueItem = queue.enqueue(lead, priority);

      // Record assignment
      const assignment = {
        leadId: lead.postId,
        providerId: selectedProvider.provider,
        matchScore: selectedProvider.totalScore,
        priority,
        queuePosition: queue.getQueueItems().indexOf(queueItem),
        assignedAt: new Date().toISOString()
      };
      this.assignments.push(assignment);
      this.routingStats.total++;

      // Try to send immediately if queue is empty
      if (queue.getQueueItems().length === 1) {
        const sendResult = await this.processBatch(selectedProvider.provider);
      }

      return {
        success: true,
        postId: lead.postId,
        assignedProvider: selectedProvider.provider,
        matchScore: selectedProvider.totalScore,
        queuePosition: assignment.queuePosition,
        totalMatches: matches.totalMatches
      };
    } catch (error) {
      this.logIfDebug('Lead routing error', { error: error.message });
      this.routingStats.failed++;
      return {
        success: false,
        postId: lead.postId,
        error: error.message
      };
    }
  }

  /**
   * Route batch of leads
   */
  async routeBatch(leads) {
    if (!Array.isArray(leads)) {
      return { success: false, error: 'Leads must be an array' };
    }

    this.logIfDebug('Routing batch', { count: leads.length });

    const results = {
      total: leads.length,
      routed: 0,
      unrouted: 0,
      details: []
    };

    for (const lead of leads) {
      const result = await this.routeLead(lead);
      results.details.push(result);
      if (result.success) results.routed++;
      else results.unrouted++;
    }

    return { success: true, ...results };
  }

  /**
   * Send lead to provider webhook
   */
  async sendToProvider(leadData) {
    const { lead, providerId } = leadData;

    if (!lead || !providerId) {
      return { success: false, error: 'Lead and providerId required' };
    }

    const provider = this.matcher.getProvider(providerId);
    if (!provider || !provider.webhook) {
      return { success: false, error: 'Provider not found or no webhook configured' };
    }

    try {
      const payload = this.formatPayload(lead, provider);
      const result = await this.sendWebhook(provider.webhook, payload);

      if (result.success) {
        this.routingStats.successful++;
        const queue = this.queues.get(providerId);
        queue.markProcessed(lead.postId, result);
      } else {
        this.routingStats.failed++;
        const queue = this.queues.get(providerId);
        queue.markFailed(lead.postId, result.error, true);
      }

      return result;
    } catch (error) {
      this.logIfDebug('Webhook send error', { error: error.message });
      return {
        success: false,
        leadId: lead.postId,
        providerId,
        error: error.message
      };
    }
  }

  /**
   * Process and send batch from provider queue
   */
  async processBatch(providerId) {
    const queue = this.queues.get(providerId);
    if (!queue) return { success: false, error: 'Queue not found' };

    const batch = queue.getNextBatch(5);
    const results = [];

    for (const item of batch) {
      const result = await this.sendToProvider({
        lead: item.lead,
        providerId
      });
      results.push(result);
    }

    return { success: true, processed: results.length, results };
  }

  /**
   * Select provider based on strategy
   */
  selectProvider(matches, lead) {
    if (matches.length === 0) return null;

    switch (this.strategy) {
      case 'capacity-based':
        return this.selectByCapacity(matches);
      case 'round-robin':
        return this.selectRoundRobin(matches);
      case 'balanced':
      default:
        return this.selectBalanced(matches);
    }
  }

  /**
   * Select provider with most available capacity
   */
  selectByCapacity(matches) {
    for (const match of matches) {
      const queue = this.queues.get(match.provider);
      if (queue && !queue.getStatus().isAtCapacity) {
        return match;
      }
    }
    return null;
  }

  /**
   * Select provider using round-robin
   */
  selectRoundRobin(matches) {
    // Simple implementation: use first available
    for (const match of matches) {
      const queue = this.queues.get(match.provider);
      if (queue && !queue.getStatus().isAtCapacity) {
        return match;
      }
    }
    return null;
  }

  /**
   * Select provider using balanced scoring
   */
  selectBalanced(matches) {
    const scored = matches.map(match => ({
      ...match,
      capacityScore: this.getCapacityScore(match.provider),
      balancedScore: (match.totalScore * 0.7) + (this.getCapacityScore(match.provider) * 0.3)
    }));

    scored.sort((a, b) => b.balancedScore - a.balancedScore);
    return scored[0];
  }

  /**
   * Calculate capacity score (inverse of utilization)
   */
  getCapacityScore(providerId) {
    const queue = this.queues.get(providerId);
    if (!queue) return 0;

    const status = queue.getStatus();
    return 1 - status.utilizationRate;
  }

  /**
   * Calculate lead priority
   */
  calculatePriority(lead) {
    if (lead.tier === 1) return 'high';
    if (lead.tier === 2) return 'normal';
    return 'low';
  }

  /**
   * Format lead data for webhook
   */
  formatPayload(lead, provider) {
    return {
      leadId: lead.postId,
      title: lead.title,
      author: lead.author,
      subreddit: lead.subreddit,
      url: lead.permalink,
      score: lead.leadScore || 0,
      confidence: lead.confidence || 0,
      tier: lead.tier,
      company: lead.company || {},
      readiness: lead.readiness || {},
      entities: lead.entities || {},
      timestamp: new Date().toISOString(),
      source: 'agent-scout-reddit'
    };
  }

  /**
   * Send webhook to provider
   */
  async sendWebhook(webhookUrl, payload) {
    return new Promise((resolve) => {
      try {
        const url = new URL(webhookUrl);
        const options = {
          hostname: url.hostname,
          path: url.pathname + (url.search || ''),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Agent-Scout-Reddit/1.0'
          },
          timeout: this.requestTimeout
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              success: res.statusCode === 200 || res.statusCode === 201,
              statusCode: res.statusCode,
              response: data
            });
          });
        });

        req.on('error', () => {
          resolve({ success: false, error: 'Webhook request failed' });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, error: 'Webhook timeout' });
        });

        req.write(JSON.stringify(payload));
        req.end();
      } catch (error) {
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Get router status
   */
  getStatus() {
    const health = this.getHealth();

    return {
      success: true,
      agent: this.name,
      status: health.status,
      routingStats: this.routingStats,
      strategy: this.strategy,
      providers: this.matcher.getAllProviders().length,
      queueStats: this.getQueueStats(),
      uptime: health.uptime,
      metrics: health.metrics
    };
  }

  /**
   * Get all queue statistics
   */
  getQueueStats() {
    const stats = {};

    for (const [providerId, queue] of this.queues.entries()) {
      stats[providerId] = queue.getStatus();
    }

    return stats;
  }

  /**
   * Add provider
   */
  addProvider(provider) {
    this.matcher.addProvider(provider);
    this.queues.set(provider.id, new ProviderQueue(provider.id, provider.maxConcurrent || 20));
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

module.exports = RouterAgent;
