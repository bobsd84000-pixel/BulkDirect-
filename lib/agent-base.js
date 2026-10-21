/**
 * Base Agent Class
 * Foundation for all swarm agents (Scout, Qualifier, Router, Orchestrator)
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('crypto').randomUUID || (() => Math.random().toString(36).substr(2, 9));

class Agent extends EventEmitter {
  constructor(config = {}) {
    super();

    this.id = config.id || this.constructor.name + '_' + generateId();
    this.name = config.name || this.constructor.name;
    this.type = config.type || 'generic';
    this.status = 'idle'; // idle, running, processing, error, failed
    this.startTime = null;
    this.lastActivityTime = Date.now();

    this.config = {
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      logLevel: config.logLevel || 'info',
      ...config
    };

    this.metrics = {
      messagesProcessed: 0,
      messagesFailed: 0,
      totalProcessingTime: 0,
      successRate: 1.0,
      avgLatency: 0,
      lastError: null
    };

    this.queue = [];
    this.processing = false;
    this.logger = config.logger || createDefaultLogger(this.name, this.config.logLevel);
  }

  /**
   * Initialize agent (override in subclass)
   */
  async initialize() {
    this.logger.info(`[${this.name}] Initializing...`);
    this.startTime = Date.now();
    this.status = 'ready';
    return this;
  }

  /**
   * Process a message (override in subclass)
   * @param {Object} message - Message to process
   * @returns {Promise<Object>} - Processing result
   */
  async process(message) {
    throw new Error(`process() not implemented in ${this.name}`);
  }

  /**
   * Main entry point: handle incoming message
   * @param {Object} message - Message with type, payload, and metadata
   * @returns {Promise<Object>} - Result or null if queued
   */
  async handle(message) {
    this.queue.push(message);
    this.lastActivityTime = Date.now();

    if (!this.processing) {
      this.processQueue();
    }

    return { queued: true, agentId: this.id, messageId: message.id };
  }

  /**
   * Process all queued messages sequentially
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    this.status = 'running';

    while (this.queue.length > 0) {
      const message = this.queue.shift();

      try {
        const startTime = Date.now();
        this.status = 'processing';

        const result = await this.executeWithTimeout(
          () => this.process(message),
          this.config.timeout
        );

        const latency = Date.now() - startTime;
        this.metrics.messagesProcessed++;
        this.metrics.totalProcessingTime += latency;
        this.metrics.avgLatency = this.metrics.totalProcessingTime / this.metrics.messagesProcessed;

        this.emit('message:processed', {
          messageId: message.id,
          result,
          latency,
          timestamp: Date.now()
        });

        this.logger.debug(`[${this.name}] Processed message ${message.id} in ${latency}ms`);

      } catch (error) {
        this.metrics.messagesFailed++;
        this.metrics.lastError = error.message;
        this.metrics.successRate = this.metrics.messagesProcessed /
          (this.metrics.messagesProcessed + this.metrics.messagesFailed);

        this.emit('message:error', {
          messageId: message.id,
          error: error.message,
          timestamp: Date.now()
        });

        this.logger.error(`[${this.name}] Error processing message ${message.id}: ${error.message}`);

        // Retry logic
        if (!message.retries) message.retries = 0;
        if (message.retries < this.config.maxRetries) {
          message.retries++;
          this.logger.info(`[${this.name}] Retrying message ${message.id} (attempt ${message.retries})`);

          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          this.queue.push(message);
        } else {
          this.logger.error(`[${this.name}] Max retries exceeded for message ${message.id}`);

          this.emit('message:failed', {
            messageId: message.id,
            error: error.message,
            retries: message.retries
          });
        }
      }
    }

    this.processing = false;
    this.status = 'idle';
  }

  /**
   * Execute function with timeout
   * @private
   */
  async executeWithTimeout(fn, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Send message to another agent
   * @param {Agent} targetAgent - Target agent instance
   * @param {Object} message - Message to send
   */
  async sendTo(targetAgent, message) {
    const wrappedMessage = {
      id: generateId(),
      type: message.type || 'message',
      from: this.id,
      to: targetAgent.id,
      payload: message.payload || message,
      timestamp: Date.now(),
      ...message
    };

    this.emit('message:sent', wrappedMessage);
    return await targetAgent.handle(wrappedMessage);
  }

  /**
   * Get agent health status
   */
  getHealth() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      uptime,
      lastActivity: Date.now() - this.lastActivityTime,
      metrics: {
        messagesProcessed: this.metrics.messagesProcessed,
        messagesFailed: this.metrics.messagesFailed,
        successRate: this.metrics.successRate.toFixed(3),
        avgLatency: Math.round(this.metrics.avgLatency),
        queueSize: this.queue.length,
        isProcessing: this.processing,
        lastError: this.metrics.lastError
      }
    };
  }

  /**
   * Get current state for persistence
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      queue: this.queue,
      metrics: this.metrics,
      config: this.config
    };
  }

  /**
   * Restore state from persistence
   */
  async restoreState(state) {
    this.queue = state.queue || [];
    this.metrics = { ...this.metrics, ...state.metrics };
    this.status = state.status || 'idle';

    if (this.queue.length > 0) {
      this.logger.info(`[${this.name}] Restored ${this.queue.length} queued messages`);
      this.processQueue();
    }
  }

  /**
   * Shutdown agent gracefully
   */
  async shutdown() {
    this.logger.info(`[${this.name}] Shutting down...`);
    this.status = 'shutting_down';

    // Wait for current message to finish
    while (this.processing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.status = 'stopped';
    this.removeAllListeners();
    this.logger.info(`[${this.name}] Shutdown complete`);
  }
}

/**
 * Generate unique ID
 * @private
 */
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Create default logger
 * @private
 */
function createDefaultLogger(name, level = 'info') {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[level] || 1;

  return {
    debug: (msg) => currentLevel <= 0 && console.debug(`[DEBUG] ${msg}`),
    info: (msg) => currentLevel <= 1 && console.log(`[INFO] ${msg}`),
    warn: (msg) => currentLevel <= 2 && console.warn(`[WARN] ${msg}`),
    error: (msg) => currentLevel <= 3 && console.error(`[ERROR] ${msg}`)
  };
}

module.exports = Agent;
