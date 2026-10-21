/**
 * Swarm Manager
 * Manages lifecycle, coordination, and monitoring of all agents
 */

const EventEmitter = require('events');

class SwarmManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      name: config.name || 'DefaultSwarm',
      healthCheckInterval: config.healthCheckInterval || 5000,
      metricsInterval: config.metricsInterval || 10000,
      logLevel: config.logLevel || 'info',
      ...config
    };

    this.agents = new Map();
    this.running = false;
    this.startTime = null;

    this.globalMetrics = {
      totalMessages: 0,
      totalErrors: 0,
      startTime: Date.now(),
      uptime: 0
    };

    this.logger = config.logger || this.createDefaultLogger();

    // Setup periodic health checks
    this.healthCheckInterval = null;
    this.metricsInterval = null;
  }

  /**
   * Register an agent in the swarm
   * @param {Agent} agent - Agent instance to register
   */
  registerAgent(agent) {
    if (this.agents.has(agent.id)) {
      this.logger.warn(`Agent ${agent.name} already registered`);
      return false;
    }

    this.agents.set(agent.id, agent);

    // Forward agent events to swarm
    agent.on('message:processed', (event) => {
      this.globalMetrics.totalMessages++;
      this.emit('message:processed', { agent: agent.name, ...event });
    });

    agent.on('message:error', (event) => {
      this.globalMetrics.totalErrors++;
      this.emit('message:error', { agent: agent.name, ...event });
    });

    agent.on('message:failed', (event) => {
      this.emit('message:failed', { agent: agent.name, ...event });
    });

    this.logger.info(`Registered agent: ${agent.name} (${agent.id})`);
    return true;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get agent by name (returns first match)
   */
  getAgentByName(name) {
    for (const agent of this.agents.values()) {
      if (agent.name === name) return agent;
    }
    return null;
  }

  /**
   * Broadcast message to all agents of specific type
   * @param {string} type - Agent type to target
   * @param {Object} message - Message to broadcast
   */
  async broadcast(type, message) {
    const targets = Array.from(this.agents.values())
      .filter(agent => agent.type === type);

    this.logger.info(`Broadcasting to ${targets.length} agents of type '${type}'`);

    return Promise.all(targets.map(agent => agent.handle(message)));
  }

  /**
   * Send message from one agent to another
   * @param {string} fromId - Source agent ID
   * @param {string} toId - Target agent ID
   * @param {Object} message - Message to send
   */
  async sendMessage(fromId, toId, message) {
    const from = this.agents.get(fromId);
    const to = this.agents.get(toId);

    if (!from || !to) {
      throw new Error(`Invalid agent IDs: from=${fromId}, to=${toId}`);
    }

    return await from.sendTo(to, message);
  }

  /**
   * Start the swarm (initialize all agents)
   */
  async start() {
    if (this.running) {
      this.logger.warn('Swarm is already running');
      return;
    }

    this.logger.info(`Starting swarm '${this.config.name}' with ${this.agents.size} agents...`);
    this.startTime = Date.now();

    try {
      // Initialize all agents
      const initPromises = Array.from(this.agents.values())
        .map(agent =>
          agent.initialize()
            .catch(err => {
              this.logger.error(`Failed to initialize ${agent.name}: ${err.message}`);
              throw err;
            })
        );

      await Promise.all(initPromises);

      this.running = true;
      this.emit('swarm:started');
      this.logger.info(`✓ Swarm started successfully`);

      // Start periodic health checks
      this.healthCheckInterval = setInterval(
        () => this.healthCheck(),
        this.config.healthCheckInterval
      );

      // Start metrics collection
      this.metricsInterval = setInterval(
        () => this.collectMetrics(),
        this.config.metricsInterval
      );

    } catch (error) {
      this.logger.error(`Swarm startup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the swarm gracefully
   */
  async stop() {
    if (!this.running) {
      this.logger.warn('Swarm is not running');
      return;
    }

    this.logger.info(`Stopping swarm '${this.config.name}'...`);

    // Stop health checks
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    // Shutdown all agents
    const shutdownPromises = Array.from(this.agents.values())
      .map(agent =>
        agent.shutdown()
          .catch(err => this.logger.error(`Failed to shutdown ${agent.name}: ${err.message}`))
      );

    await Promise.all(shutdownPromises);

    this.running = false;
    this.emit('swarm:stopped');
    this.logger.info(`✓ Swarm stopped`);
  }

  /**
   * Perform health check on all agents
   * @private
   */
  async healthCheck() {
    const health = {
      timestamp: Date.now(),
      agents: []
    };

    for (const agent of this.agents.values()) {
      const agentHealth = agent.getHealth();
      health.agents.push(agentHealth);

      // Check for stuck agents
      if (agent.status === 'processing' && agentHealth.lastActivity > 60000) {
        this.logger.warn(`Agent ${agent.name} appears stuck (processing for ${agentHealth.lastActivity}ms)`);
        this.emit('agent:stuck', { agent: agent.name, health: agentHealth });
      }
    }

    this.emit('health:check', health);
  }

  /**
   * Collect and aggregate metrics
   * @private
   */
  async collectMetrics() {
    this.globalMetrics.uptime = Date.now() - this.globalMetrics.startTime;

    const agentMetrics = Array.from(this.agents.values()).map(agent => ({
      name: agent.name,
      type: agent.type,
      ...agent.metrics
    }));

    const metrics = {
      timestamp: Date.now(),
      swarm: {
        name: this.config.name,
        running: this.running,
        agentCount: this.agents.size,
        ...this.globalMetrics
      },
      agents: agentMetrics,
      summary: {
        avgSuccessRate: this.calculateAvgSuccessRate(),
        avgLatency: this.calculateAvgLatency(),
        totalQueueSize: this.calculateTotalQueueSize()
      }
    };

    this.emit('metrics:collected', metrics);
  }

  /**
   * Get current swarm status
   */
  getStatus() {
    const health = [];
    for (const agent of this.agents.values()) {
      health.push(agent.getHealth());
    }

    return {
      name: this.config.name,
      running: this.running,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      agents: health,
      globalMetrics: this.globalMetrics
    };
  }

  /**
   * Calculate aggregate success rate
   * @private
   */
  calculateAvgSuccessRate() {
    if (this.agents.size === 0) return 1.0;

    let totalRate = 0;
    for (const agent of this.agents.values()) {
      totalRate += agent.metrics.successRate;
    }

    return totalRate / this.agents.size;
  }

  /**
   * Calculate average latency across agents
   * @private
   */
  calculateAvgLatency() {
    if (this.agents.size === 0) return 0;

    let totalLatency = 0;
    for (const agent of this.agents.values()) {
      totalLatency += agent.metrics.avgLatency || 0;
    }

    return totalLatency / this.agents.size;
  }

  /**
   * Calculate total queue size
   * @private
   */
  calculateTotalQueueSize() {
    let totalSize = 0;
    for (const agent of this.agents.values()) {
      totalSize += agent.queue.length;
    }
    return totalSize;
  }

  /**
   * Create default logger
   * @private
   */
  createDefaultLogger() {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.config.logLevel] || 1;

    const timestamp = () => new Date().toISOString();

    return {
      debug: (msg) => currentLevel <= 0 && console.debug(`[${timestamp()}] [SWARM DEBUG] ${msg}`),
      info: (msg) => currentLevel <= 1 && console.log(`[${timestamp()}] [SWARM INFO] ${msg}`),
      warn: (msg) => currentLevel <= 2 && console.warn(`[${timestamp()}] [SWARM WARN] ${msg}`),
      error: (msg) => currentLevel <= 3 && console.error(`[${timestamp()}] [SWARM ERROR] ${msg}`)
    };
  }
}

module.exports = SwarmManager;
