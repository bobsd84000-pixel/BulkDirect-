/**
 * Basic Swarm Example
 * Demonstrates Agent Framework usage with a simple 2-agent swarm
 */

const Agent = require('../lib/agent-base');
const SwarmManager = require('../lib/swarm-manager');

// Example 1: Create a simple Producer agent
class ProducerAgent extends Agent {
  constructor(config) {
    super(config);
    this.type = 'producer';
  }

  async process(message) {
    console.log(`[${this.name}] Processing message:`, message.id);

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      processed: true,
      data: message.payload
    };
  }
}

// Example 2: Create a simple Consumer agent
class ConsumerAgent extends Agent {
  constructor(config) {
    super(config);
    this.type = 'consumer';
    this.receivedMessages = [];
  }

  async process(message) {
    console.log(`[${this.name}] Consuming message:`, message.id);

    this.receivedMessages.push(message);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      consumed: true,
      messageCount: this.receivedMessages.length
    };
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Agent Scout Reddit - Basic Swarm Example\n');

  // 1. Create agents
  const producer = new ProducerAgent({
    name: 'ProducerAgent',
    timeout: 5000,
    logLevel: 'info'
  });

  const consumer = new ConsumerAgent({
    name: 'ConsumerAgent',
    timeout: 5000,
    logLevel: 'info'
  });

  // 2. Create swarm manager
  const swarm = new SwarmManager({
    name: 'BasicSwarm',
    healthCheckInterval: 2000,
    metricsInterval: 3000,
    logLevel: 'info'
  });

  // 3. Register agents
  swarm.registerAgent(producer);
  swarm.registerAgent(consumer);

  // 4. Setup event listeners
  swarm.on('message:processed', (event) => {
    console.log(`✓ Message processed: ${event.messageId} (${event.latency}ms)`);
  });

  swarm.on('message:error', (event) => {
    console.error(`✗ Message error: ${event.messageId} - ${event.error}`);
  });

  swarm.on('health:check', (health) => {
    console.log(`📊 Health check: ${health.agents.length} agents running`);
  });

  swarm.on('metrics:collected', (metrics) => {
    console.log(`📈 Metrics - Processed: ${metrics.swarm.totalMessages}, ` +
                `Errors: ${metrics.swarm.totalErrors}, ` +
                `Avg latency: ${Math.round(metrics.summary.avgLatency)}ms`);
  });

  try {
    // 5. Start swarm
    console.log('⏳ Starting swarm...\n');
    await swarm.start();

    // 6. Send messages through producer
    console.log('📤 Sending messages...\n');

    for (let i = 1; i <= 5; i++) {
      await producer.handle({
        id: `msg-${i}`,
        type: 'test',
        payload: { data: `Test message ${i}` }
      });
    }

    // 7. Send from producer to consumer
    console.log('\n🔗 Producer → Consumer communication...\n');

    await producer.sendTo(consumer, {
      id: 'msg-direct',
      type: 'direct',
      payload: { data: 'Direct message from producer' }
    });

    // 8. Broadcast to all consumers
    console.log('\n📢 Broadcasting to consumers...\n');

    await swarm.broadcast('consumer', {
      type: 'broadcast',
      payload: { data: 'Broadcast message to all consumers' }
    });

    // Wait for processing
    console.log('\n⏳ Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 9. Get status
    console.log('\n📋 Swarm Status:');
    const status = swarm.getStatus();
    console.log(JSON.stringify(status, null, 2));

    // 10. Get individual agent health
    console.log('\n🏥 Agent Health:');
    for (const agent of [producer, consumer]) {
      const health = agent.getHealth();
      console.log(`\n${health.name}:`);
      console.log(`  Status: ${health.status}`);
      console.log(`  Messages Processed: ${health.metrics.messagesProcessed}`);
      console.log(`  Success Rate: ${(health.metrics.successRate * 100).toFixed(1)}%`);
      console.log(`  Avg Latency: ${Math.round(health.metrics.avgLatency)}ms`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // 11. Cleanup
    console.log('\n⏹️ Shutting down...');
    await swarm.stop();
    console.log('\n✓ Swarm stopped');
  }
}

// Run the example
main().catch(console.error);
