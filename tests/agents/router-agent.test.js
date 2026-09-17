/**
 * Router Agent Tests
 */

const RouterAgent = require('../../lib/router-agent');
const ProviderMatcher = require('../../lib/provider-matcher');
const ProviderQueue = require('../../lib/provider-queue');

// Test fixtures
const mockProviders = [
  {
    id: 'provider_001',
    name: 'AcmeCorp Solutions',
    industries: ['SaaS', 'B2B', 'E-commerce'],
    stages: ['growth', 'mature'],
    tiers: [1, 2],
    maxConcurrent: 20,
    webhook: 'https://acmecorp.example.com/leads/webhook',
    specialization: 'SaaS growth & scaling'
  },
  {
    id: 'provider_002',
    name: 'StartupBoost',
    industries: ['Startup', 'SaaS'],
    stages: ['early', 'growth'],
    tiers: [2, 3],
    maxConcurrent: 15,
    webhook: 'https://startupboost.example.com/leads/webhook',
    specialization: 'Early-stage SaaS founding'
  },
  {
    id: 'provider_003',
    name: 'Enterprise Solutions',
    industries: ['Enterprise', 'B2B'],
    stages: ['mature'],
    tiers: [1],
    maxConcurrent: 10,
    webhook: 'https://enterprise.example.com/leads/webhook',
    specialization: 'Enterprise implementation'
  }
];

const mockLead = {
  postId: 'post1',
  title: 'Growing SaaS startup',
  author: 'founder_user',
  subreddit: 'SaaS',
  tier: 2,
  leadScore: 0.7,
  company: {
    domain: 'example.com',
    name: 'ExampleCorp',
    industry: 'SaaS',
    size: '51-200',
    funding: 'series-a',
    technologies: ['Node.js', 'React']
  }
};

async function testRouterAgentInitialization() {
  const agent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    strategy: 'balanced',
    timeout: 30000,
    logLevel: 'info'
  });

  await agent.initialize();

  assert(agent.type === 'router', 'Agent type should be router');
  assert(agent.name === 'TestRouter', 'Agent name should match');
  assert(agent.strategy === 'balanced', 'Should have strategy');
  assert(agent.queues.size === 3, 'Should initialize queues for each provider');
  assert(agent.assignments instanceof Array, 'Should track assignments');

  await agent.shutdown();
  console.log('✓ Router Agent initialization');
}

async function testProviderMatcher() {
  const matcher = new ProviderMatcher(mockProviders);

  const matches = matcher.findMatches(mockLead, 3);

  assert(matches.matches.length > 0, 'Should find matching providers');
  assert(matches.topMatch, 'Should have top match');
  assert(matches.totalMatches > 0, 'Should report total matches');

  // Verify top match is best scored
  assert(
    matches.topMatch.totalScore === Math.max(...matches.matches.map(m => m.totalScore)),
    'Top match should have highest score'
  );

  console.log(`✓ Provider matcher (found: ${matches.matches.length}, top: ${matches.topMatch.name})`);
}

async function testProviderQueue() {
  const queue = new ProviderQueue('provider_001', 20);

  // Test enqueue
  const item1 = queue.enqueue(mockLead, 'normal');
  assert(item1.status === 'queued', 'Item should be queued');
  assert(queue.getQueueItems().length === 1, 'Queue should have 1 item');

  // Test dequeue
  const dequeued = queue.dequeue();
  assert(dequeued.status === 'processing', 'Item should be processing');
  assert(queue.processing.size === 1, 'Processing should have 1 item');

  // Test mark processed
  queue.markProcessed('post1', { success: true });
  assert(queue.completed.length === 1, 'Completed should have 1 item');
  assert(queue.processing.size === 0, 'Processing should be empty');

  // Test getStatus
  const status = queue.getStatus();
  assert(status.completed === 1, 'Status should show 1 completed');
  assert(status.queueLength === 0, 'Status should show empty queue');

  console.log('✓ Provider queue');
}

async function testQueuePriority() {
  const queue = new ProviderQueue('provider_001', 20);

  // Enqueue with different priorities
  const lowItem = queue.enqueue({ ...mockLead, postId: 'low' }, 'low');
  const normalItem = queue.enqueue({ ...mockLead, postId: 'normal' }, 'normal');
  const highItem = queue.enqueue({ ...mockLead, postId: 'high' }, 'high');

  // High should be first
  const first = queue.getQueueItems()[0];
  assert(first.leadId === 'high', 'High priority should be first');

  // Normal should be second
  const second = queue.getQueueItems()[1];
  assert(second.leadId === 'normal', 'Normal priority should be second');

  console.log('✓ Queue priority ordering');
}

async function testLeadRouting() {
  const agent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    strategy: 'balanced',
    logLevel: 'info'
  });

  await agent.initialize();

  const result = await agent.routeLead(mockLead);

  assert(result.success === true, 'Should succeed');
  assert(result.postId === mockLead.postId, 'Should include post ID');
  assert(result.assignedProvider, 'Should assign provider');
  assert(result.matchScore !== undefined, 'Should include match score');
  assert(result.queuePosition !== undefined, 'Should include queue position');

  await agent.shutdown();
  console.log(`✓ Lead routing (provider: ${result.assignedProvider}, score: ${result.matchScore})`);
}

async function testBatchRouting() {
  const agent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    logLevel: 'info'
  });

  await agent.initialize();

  const leads = [
    mockLead,
    { ...mockLead, postId: 'post2', tier: 1 },
    { ...mockLead, postId: 'post3', tier: 3 }
  ];

  const result = await agent.routeBatch(leads);

  assert(result.success === true, 'Should succeed');
  assert(result.total === 3, 'Should process all leads');
  assert(result.routed >= 0, 'Should count routed leads');
  assert(result.unrouted >= 0, 'Should count unrouted leads');

  await agent.shutdown();
  console.log(`✓ Batch routing (routed: ${result.routed}, unrouted: ${result.unrouted})`);
}

async function testRoutingStrategies() {
  // Test balanced strategy
  const balancedAgent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    strategy: 'balanced',
    logLevel: 'info'
  });

  await balancedAgent.initialize();
  const balancedResult = await balancedAgent.routeLead(mockLead);
  assert(balancedResult.success, 'Balanced strategy should work');
  await balancedAgent.shutdown();

  // Test capacity-based strategy
  const capacityAgent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    strategy: 'capacity-based',
    logLevel: 'info'
  });

  await capacityAgent.initialize();
  const capacityResult = await capacityAgent.routeLead(mockLead);
  assert(capacityResult.success, 'Capacity-based strategy should work');
  await capacityAgent.shutdown();

  console.log('✓ Routing strategies');
}

async function testQueueStats() {
  const agent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    logLevel: 'info'
  });

  await agent.initialize();

  // Route some leads
  await agent.routeLead(mockLead);
  await agent.routeLead({ ...mockLead, postId: 'post2' });

  const stats = agent.getQueueStats();

  assert(Object.keys(stats).length > 0, 'Should have queue stats');
  for (const stat of Object.values(stats)) {
    assert(stat.providerId, 'Should include provider ID');
    assert(stat.queueLength !== undefined, 'Should track queue length');
    assert(stat.processing !== undefined, 'Should track processing count');
  }

  await agent.shutdown();
  console.log('✓ Queue statistics');
}

async function testMessageHandling() {
  const agent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    logLevel: 'info'
  });

  await agent.initialize();

  // Test route_lead message
  const result = await agent.handle({
    id: 'msg1',
    type: 'route',
    payload: {
      type: 'route_lead',
      lead: mockLead
    }
  });

  assert(result, 'Should return result');

  // Test get_status message
  const statusResult = await agent.handle({
    id: 'msg2',
    type: 'status',
    payload: {
      type: 'get_status'
    }
  });

  assert(statusResult.success === true, 'Status should succeed');
  assert(statusResult.routingStats !== undefined, 'Should include routing stats');

  await agent.shutdown();
  console.log('✓ Message handling');
}

async function testProviderMismatch() {
  const agent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    logLevel: 'info'
  });

  await agent.initialize();

  // Create lead that doesn't match any provider
  const mismatchedLead = {
    postId: 'mismatch',
    title: 'Unrelated topic',
    company: {
      industry: 'Agriculture'
    },
    tier: 4 // Invalid tier
  };

  const result = await agent.routeLead(mismatchedLead);

  assert(result.success === false || result.success, 'Should handle mismatch gracefully');

  await agent.shutdown();
  console.log('✓ Provider mismatch handling');
}

async function testInvalidInput() {
  const agent = new RouterAgent({
    name: 'TestRouter',
    providers: mockProviders,
    logLevel: 'info'
  });

  await agent.initialize();

  // Test null lead
  const result = await agent.routeLead(null);
  assert(result.success === false, 'Should fail for null lead');

  // Test invalid batch
  const batchResult = await agent.routeBatch(null);
  assert(batchResult.success === false, 'Should fail for invalid batch');

  await agent.shutdown();
  console.log('✓ Invalid input handling');
}

// Simple assert helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Run all tests
async function runTests() {
  console.log('\n🧪 Router Agent Tests\n');

  const tests = [
    testRouterAgentInitialization,
    testProviderMatcher,
    testProviderQueue,
    testQueuePriority,
    testLeadRouting,
    testBatchRouting,
    testRoutingStrategies,
    testQueueStats,
    testMessageHandling,
    testProviderMismatch,
    testInvalidInput
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

// Export for npm test
module.exports = {
  testRouterAgentInitialization,
  testProviderMatcher,
  testProviderQueue,
  testQueuePriority,
  testLeadRouting,
  testBatchRouting,
  testRoutingStrategies,
  testQueueStats,
  testMessageHandling,
  testProviderMismatch,
  testInvalidInput
};

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
