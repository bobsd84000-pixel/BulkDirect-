/**
 * Unit tests for SwarmManager
 */

const Agent = require('../../lib/agent-base');
const SwarmManager = require('../../lib/swarm-manager');

describe('SwarmManager', () => {

  describe('Agent Registration', () => {
    test('should register agents', () => {
      const swarm = new SwarmManager({ name: 'TestSwarm' });
      const agent = new Agent({ name: 'Agent1' });

      const registered = swarm.registerAgent(agent);

      expect(registered).toBe(true);
      expect(swarm.getAgent(agent.id)).toBe(agent);
    });

    test('should prevent duplicate registration', () => {
      const swarm = new SwarmManager();
      const agent = new Agent({ name: 'Agent1' });

      swarm.registerAgent(agent);
      const duplicate = swarm.registerAgent(agent);

      expect(duplicate).toBe(false);
    });

    test('should retrieve agent by name', () => {
      const swarm = new SwarmManager();
      const agent1 = new Agent({ name: 'ScoutAgent' });
      const agent2 = new Agent({ name: 'RouterAgent' });

      swarm.registerAgent(agent1);
      swarm.registerAgent(agent2);

      expect(swarm.getAgentByName('ScoutAgent')).toBe(agent1);
      expect(swarm.getAgentByName('RouterAgent')).toBe(agent2);
    });
  });

  describe('Swarm Lifecycle', () => {
    test('should start swarm with all agents', async () => {
      const swarm = new SwarmManager({ name: 'TestSwarm' });
      const agent1 = new Agent({ name: 'Agent1' });
      const agent2 = new Agent({ name: 'Agent2' });

      swarm.registerAgent(agent1);
      swarm.registerAgent(agent2);

      let startEventFired = false;
      swarm.on('swarm:started', () => {
        startEventFired = true;
      });

      await swarm.start();

      expect(swarm.running).toBe(true);
      expect(startEventFired).toBe(true);
      expect(agent1.status).toBe('ready');
      expect(agent2.status).toBe('ready');

      await swarm.stop();
    });

    test('should stop swarm gracefully', async () => {
      const swarm = new SwarmManager({ name: 'TestSwarm' });
      const agent = new Agent({ name: 'TestAgent' });

      swarm.registerAgent(agent);
      await swarm.start();

      let stopEventFired = false;
      swarm.on('swarm:stopped', () => {
        stopEventFired = true;
      });

      await swarm.stop();

      expect(swarm.running).toBe(false);
      expect(stopEventFired).toBe(true);
      expect(agent.status).toBe('stopped');
    });
  });

  describe('Message Broadcasting', () => {
    test('should broadcast to agents of specific type', async () => {
      const swarm = new SwarmManager();

      class TestAgent extends Agent {
        async process(message) {
          return { received: true };
        }
      }

      const agent1 = new TestAgent({ name: 'Scout1', type: 'scout' });
      const agent2 = new TestAgent({ name: 'Scout2', type: 'scout' });
      const agent3 = new TestAgent({ name: 'Router1', type: 'router' });

      swarm.registerAgent(agent1);
      swarm.registerAgent(agent2);
      swarm.registerAgent(agent3);

      await swarm.start();

      await swarm.broadcast('scout', { type: 'test', payload: 'data' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(agent1.metrics.messagesProcessed).toBeGreaterThan(0);
      expect(agent2.metrics.messagesProcessed).toBeGreaterThan(0);
      expect(agent3.metrics.messagesProcessed).toBe(0);

      await swarm.stop();
    });
  });

  describe('Inter-Agent Communication', () => {
    test('should send message between agents', async () => {
      const swarm = new SwarmManager();

      class TestAgent extends Agent {
        async process(message) {
          return { success: true };
        }
      }

      const agent1 = new TestAgent({ name: 'Agent1' });
      const agent2 = new TestAgent({ name: 'Agent2' });

      swarm.registerAgent(agent1);
      swarm.registerAgent(agent2);

      await swarm.start();

      const result = await swarm.sendMessage(agent1.id, agent2.id, {
        type: 'test',
        payload: 'data'
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(agent2.metrics.messagesProcessed).toBeGreaterThan(0);

      await swarm.stop();
    });

    test('should error on invalid agent IDs', async () => {
      const swarm = new SwarmManager();

      await expect(
        swarm.sendMessage('invalid1', 'invalid2', { type: 'test' })
      ).rejects.toThrow('Invalid agent IDs');
    });
  });

  describe('Health Checks', () => {
    test('should perform health checks', async () => {
      const swarm = new SwarmManager({
        name: 'TestSwarm',
        healthCheckInterval: 100
      });

      const agent = new Agent({ name: 'TestAgent' });
      swarm.registerAgent(agent);

      await swarm.start();

      let healthCheckFired = false;
      swarm.on('health:check', (health) => {
        healthCheckFired = true;
        expect(health.agents).toBeDefined();
        expect(health.agents.length).toBeGreaterThan(0);
      });

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(healthCheckFired).toBe(true);

      await swarm.stop();
    });
  });

  describe('Metrics Collection', () => {
    test('should collect and aggregate metrics', async () => {
      const swarm = new SwarmManager({
        name: 'TestSwarm',
        metricsInterval: 100
      });

      class TestAgent extends Agent {
        async process(message) {
          return { success: true };
        }
      }

      const agent1 = new TestAgent({ name: 'Agent1', type: 'scout' });
      const agent2 = new TestAgent({ name: 'Agent2', type: 'router' });

      swarm.registerAgent(agent1);
      swarm.registerAgent(agent2);

      await swarm.start();

      // Send some messages
      await agent1.handle({ id: 'msg1' });
      await agent2.handle({ id: 'msg2' });

      let metricsCollected = false;
      swarm.on('metrics:collected', (metrics) => {
        metricsCollected = true;
        expect(metrics.swarm).toBeDefined();
        expect(metrics.agents).toBeDefined();
        expect(metrics.summary).toBeDefined();
      });

      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(metricsCollected).toBe(true);

      await swarm.stop();
    });
  });

  describe('Status Reporting', () => {
    test('should report swarm status', async () => {
      const swarm = new SwarmManager({ name: 'StatusSwarm' });
      const agent = new Agent({ name: 'TestAgent' });

      swarm.registerAgent(agent);
      await swarm.start();

      const status = swarm.getStatus();

      expect(status.name).toBe('StatusSwarm');
      expect(status.running).toBe(true);
      expect(status.agents).toBeDefined();
      expect(status.agents.length).toBe(1);
      expect(status.globalMetrics).toBeDefined();

      await swarm.stop();
    });
  });
});
