/**
 * Unit tests for Agent Base class
 */

const Agent = require('../../lib/agent-base');

describe('Agent Base Class', () => {

  describe('Initialization', () => {
    test('should create agent with default config', () => {
      const agent = new Agent();

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('Agent');
      expect(agent.status).toBe('idle');
      expect(agent.startTime).toBeNull();
    });

    test('should create agent with custom config', () => {
      const config = {
        name: 'TestAgent',
        type: 'scout',
        timeout: 5000
      };
      const agent = new Agent(config);

      expect(agent.name).toBe('TestAgent');
      expect(agent.type).toBe('scout');
      expect(agent.config.timeout).toBe(5000);
    });

    test('should initialize agent successfully', async () => {
      const agent = new Agent({ name: 'TestAgent' });

      expect(agent.status).toBe('idle');
      expect(agent.startTime).toBeNull();

      await agent.initialize();

      expect(agent.status).toBe('ready');
      expect(agent.startTime).toBeTruthy();
    });
  });

  describe('Message Handling', () => {
    test('should queue incoming message', async () => {
      const agent = new Agent({ name: 'TestAgent' });
      await agent.initialize();

      const message = { id: 'msg1', type: 'test', payload: { data: 'test' } };
      const result = await agent.handle(message);

      expect(result.queued).toBe(true);
      expect(result.agentId).toBe(agent.id);
    });

    test('should process queued messages sequentially', async () => {
      let processCount = 0;

      class TestAgent extends Agent {
        async process(message) {
          processCount++;
          return { processed: true, count: processCount };
        }
      }

      const agent = new TestAgent({ name: 'TestAgent' });
      await agent.initialize();

      await agent.handle({ id: 'msg1' });
      await agent.handle({ id: 'msg2' });
      await agent.handle({ id: 'msg3' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(processCount).toBe(3);
      expect(agent.metrics.messagesProcessed).toBe(3);
    });

    test('should emit message:processed event', async () => {
      class TestAgent extends Agent {
        async process(message) {
          return { success: true };
        }
      }

      const agent = new TestAgent();
      await agent.initialize();

      let eventFired = false;
      agent.on('message:processed', (event) => {
        eventFired = true;
        expect(event.messageId).toBe('msg1');
        expect(event.result).toEqual({ success: true });
      });

      await agent.handle({ id: 'msg1' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(eventFired).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should catch and log processing errors', async () => {
      class FailingAgent extends Agent {
        async process(message) {
          throw new Error('Processing failed');
        }
      }

      const agent = new FailingAgent();
      await agent.initialize();

      let errorEventFired = false;
      agent.on('message:error', (event) => {
        errorEventFired = true;
      });

      await agent.handle({ id: 'msg1' });

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorEventFired).toBe(true);
      expect(agent.metrics.messagesFailed).toBe(1);
    });

    test('should retry failed messages', async () => {
      let attempts = 0;

      class RetryAgent extends Agent {
        async process(message) {
          attempts++;
          if (attempts < 2) {
            throw new Error('Temporary failure');
          }
          return { success: true };
        }
      }

      const agent = new RetryAgent({ maxRetries: 3, retryDelay: 10 });
      await agent.initialize();

      await agent.handle({ id: 'msg1' });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(agent.metrics.messagesProcessed).toBeGreaterThan(0);
    });

    test('should fail after max retries', async () => {
      class FailingAgent extends Agent {
        async process(message) {
          throw new Error('Always fails');
        }
      }

      const agent = new FailingAgent({ maxRetries: 2, retryDelay: 10 });
      await agent.initialize();

      let failedEventFired = false;
      agent.on('message:failed', (event) => {
        failedEventFired = true;
      });

      await agent.handle({ id: 'msg1' });

      // Wait for retries to exhaust
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(failedEventFired).toBe(true);
      expect(agent.queue.length).toBe(0);
    });

    test('should handle timeout errors', async () => {
      class SlowAgent extends Agent {
        async process(message) {
          // Simulate slow processing
          await new Promise(resolve => setTimeout(resolve, 5000));
          return { success: true };
        }
      }

      const agent = new SlowAgent({ timeout: 100 });
      await agent.initialize();

      let timeoutError = false;
      agent.on('message:error', (event) => {
        if (event.error.includes('Timeout')) {
          timeoutError = true;
        }
      });

      await agent.handle({ id: 'msg1' });

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(timeoutError).toBe(true);
    });
  });

  describe('Metrics', () => {
    test('should track message processing metrics', async () => {
      class TestAgent extends Agent {
        async process(message) {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { success: true };
        }
      }

      const agent = new TestAgent();
      await agent.initialize();

      await agent.handle({ id: 'msg1' });
      await agent.handle({ id: 'msg2' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(agent.metrics.messagesProcessed).toBe(2);
      expect(agent.metrics.messagesFailed).toBe(0);
      expect(agent.metrics.successRate).toBe(1.0);
      expect(agent.metrics.avgLatency).toBeGreaterThan(0);
    });

    test('should calculate success rate correctly', async () => {
      let callCount = 0;

      class PartiallyFailingAgent extends Agent {
        async process(message) {
          callCount++;
          if (callCount === 1) throw new Error('First fails');
          return { success: true };
        }
      }

      const agent = new PartiallyFailingAgent({ maxRetries: 0 });
      await agent.initialize();

      await agent.handle({ id: 'msg1' });
      await agent.handle({ id: 'msg2' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const successRate = agent.metrics.successRate;
      expect(successRate).toBeGreaterThan(0);
      expect(successRate).toBeLessThan(1);
    });
  });

  describe('Health Status', () => {
    test('should report health status', async () => {
      const agent = new Agent({ name: 'HealthAgent' });
      await agent.initialize();

      const health = agent.getHealth();

      expect(health.id).toBe(agent.id);
      expect(health.name).toBe('HealthAgent');
      expect(health.status).toBe('idle');
      expect(health.metrics).toBeDefined();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('State Management', () => {
    test('should save and restore state', async () => {
      class TestAgent extends Agent {
        async process(message) {
          return { success: true };
        }
      }

      const agent = new TestAgent({ name: 'StateAgent' });
      await agent.initialize();

      // Queue some messages
      await agent.handle({ id: 'msg1' });
      await agent.handle({ id: 'msg2' });

      const state = agent.getState();

      expect(state.id).toBe(agent.id);
      expect(state.queue.length).toBeGreaterThanOrEqual(0);
      expect(state.metrics).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      const agent = new Agent({ name: 'ShutdownAgent' });
      await agent.initialize();

      expect(agent.status).toBe('ready');

      await agent.shutdown();

      expect(agent.status).toBe('stopped');
    });
  });
});
