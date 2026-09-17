/**
 * Scout Agent Tests
 */

const ScoutAgent = require('../../lib/scout-agent');

// Mock Reddit client
class MockRedditClient {
  async authenticate() {
    return 'mock_token';
  }

  async getSubredditPosts(subreddit, options = {}) {
    return {
      posts: [
        {
          id: 'post1',
          title: 'Building SaaS startup with Django - need scaling help',
          selftext: 'We use Stripe and Shopify for payments. Looking to optimize our infrastructure.',
          author: 'founder_user',
          subreddit,
          score: 45,
          num_comments: 12,
          url: 'https://example.com',
          permalink: '/r/SaaS/comments/post1',
          is_self: true,
          created_utc: Date.now() / 1000
        },
        {
          id: 'post2',
          title: 'Need advice on marketing automation',
          selftext: 'Just getting started, budget is limited.',
          author: 'startup_founder',
          subreddit,
          score: 8,
          num_comments: 3,
          url: 'https://example.com',
          permalink: '/r/SaaS/comments/post2',
          is_self: true,
          created_utc: Date.now() / 1000
        }
      ]
    };
  }

  async getPostComments(subreddit, postId, options = {}) {
    return {
      comments: [
        {
          id: 'comment1',
          author: 'helpful_user',
          body: 'Have you tried HubSpot? They have good automation features.',
          score: 10,
          created_utc: Date.now() / 1000,
          parent_id: 't3_post1'
        },
        {
          id: 'comment2',
          author: 'cto_user',
          body: 'We migrated from Stripe to another solution and saw 30% cost reduction.',
          score: 5,
          created_utc: Date.now() / 1000,
          parent_id: 't3_post1'
        }
      ]
    };
  }

  async searchSubreddit(subreddit, query, options = {}) {
    return this.getSubredditPosts(subreddit, options);
  }
}

// Test fixtures
const mockRedditConfig = {
  clientId: 'test_id',
  clientSecret: 'test_secret',
  username: 'test_user',
  password: 'test_pass'
};

async function testScoutAgentInitialization() {
  const agent = new ScoutAgent({
    name: 'TestScout',
    reddit: mockRedditConfig,
    subreddits: ['SaaS', 'Entrepreneur'],
    qualityThreshold: 0.4,
    timeout: 30000,
    logLevel: 'info'
  });

  await agent.initialize();

  assert(agent.type === 'scout', 'Agent type should be scout');
  assert(agent.name === 'TestScout', 'Agent name should match');
  assert(agent.subreddits.length === 2, 'Should have 2 subreddits');
  assert(agent.processedPostIds instanceof Set, 'Should track processed posts');
  assert(agent.discoveredLeads instanceof Array, 'Should store leads array');

  await agent.shutdown();
  console.log('✓ Scout Agent initialization');
}

async function testEntityExtraction() {
  const agent = new ScoutAgent({
    name: 'TestScout',
    reddit: mockRedditConfig,
    logLevel: 'info'
  });

  const text = 'We are a SaaS startup using Stripe and Shopify. Our CEO is looking for DevOps solutions. We have funding and want to scale.';
  const entities = agent.entityExtractor.extractAll(text);

  assert(entities.companies && entities.companies.length > 0, 'Should extract companies');
  assert(entities.tools && entities.tools.length > 0, 'Should extract tools');
  assert(entities.titles && entities.titles.length > 0, 'Should extract titles');
  assert(entities.budgetSignals && entities.budgetSignals.length > 0, 'Should extract budget signals');

  console.log('✓ Entity extraction');
}

async function testLeadScoring() {
  const agent = new ScoutAgent({
    name: 'TestScout',
    reddit: mockRedditConfig,
    logLevel: 'info'
  });

  const entities = {
    companies: ['TechCorp'],
    tools: ['Stripe', 'Shopify'],
    titles: ['CEO', 'CTO'],
    painPoints: ['scaling', 'performance'],
    budgetSignals: ['funding', 'budget']
  };

  const post = {
    score: 50,
    num_comments: 10
  };

  const scored = agent.leadScorer.scoreLead(entities, post);

  assert(scored.totalScore > 0, 'Should have positive score');
  assert(scored.confidence >= 0 && scored.confidence <= 1, 'Confidence should be 0-1');
  assert(scored.tier !== null, 'Should determine tier');
  assert(Array.isArray(scored.reasoning), 'Should provide reasoning');

  console.log(`✓ Lead scoring (score: ${scored.totalScore}, tier: ${scored.tier})`);
}

async function testPostAnalysis() {
  const agent = new ScoutAgent({
    name: 'TestScout',
    reddit: mockRedditConfig,
    logLevel: 'info'
  });

  // Override reddit client with mock
  agent.redditClient = new MockRedditClient();

  const post = {
    id: 'test_post',
    title: 'Building SaaS with Stripe',
    selftext: 'Our CEO needs help scaling. We have Series A funding.',
    author: 'founder',
    subreddit: 'SaaS',
    score: 40,
    num_comments: 8,
    url: 'https://example.com',
    permalink: '/r/SaaS/comments/test',
    is_self: true,
    created_utc: Date.now() / 1000
  };

  const analyzed = await agent.analyzePostData(post);

  assert(analyzed.postId === 'test_post', 'Should extract post ID');
  assert(analyzed.entities, 'Should extract entities');
  assert(analyzed.leadScore !== undefined, 'Should have lead score');
  assert(typeof analyzed.isLead === 'boolean', 'Should determine if lead');

  console.log(`✓ Post analysis (score: ${analyzed.leadScore}, is_lead: ${analyzed.isLead})`);
}

async function testScanSubreddit() {
  const agent = new ScoutAgent({
    name: 'TestScout',
    reddit: mockRedditConfig,
    subreddits: ['SaaS'],
    logLevel: 'info'
  });

  await agent.initialize();

  // Override reddit client with mock
  agent.redditClient = new MockRedditClient();

  const result = await agent.scanSubreddit('SaaS', 25);

  assert(result.success === true, 'Should succeed');
  assert(result.subreddit === 'SaaS', 'Should include subreddit');
  assert(result.totalPostsScanned > 0, 'Should scan posts');
  assert(Array.isArray(result.leads), 'Should return leads array');
  assert(result.leadsFound === result.leads.length, 'Lead count should match');

  await agent.shutdown();
  console.log(`✓ Scan subreddit (scanned: ${result.totalPostsScanned}, leads: ${result.leadsFound})`);
}

async function testMessageHandling() {
  const agent = new ScoutAgent({
    name: 'TestScout',
    reddit: mockRedditConfig,
    logLevel: 'info'
  });

  await agent.initialize();

  // Override reddit client with mock
  agent.redditClient = new MockRedditClient();

  // Test scan_subreddit message
  const result = await agent.handle({
    id: 'msg1',
    type: 'scan',
    payload: {
      type: 'scan_subreddit',
      subreddit: 'SaaS',
      limit: 10
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
  assert(statusResult.metrics, 'Should include metrics');

  await agent.shutdown();
  console.log('✓ Message handling');
}

async function testDuplicatePrevention() {
  const agent = new ScoutAgent({
    name: 'TestScout',
    reddit: mockRedditConfig,
    logLevel: 'info'
  });

  await agent.initialize();

  // Override reddit client with mock
  agent.redditClient = new MockRedditClient();

  // First scan
  const result1 = await agent.scanSubreddit('SaaS', 25);
  const foundCount1 = result1.leadsFound;

  // Add post to processed
  agent.processedPostIds.add('post1');

  // Second scan
  const result2 = await agent.scanSubreddit('SaaS', 25);
  const foundCount2 = result2.leadsFound;

  assert(foundCount2 <= foundCount1, 'Should find fewer leads on second scan (duplicate prevention)');

  await agent.shutdown();
  console.log('✓ Duplicate prevention');
}

async function testUnknownMessageType() {
  const agent = new ScoutAgent({
    name: 'TestScout',
    reddit: mockRedditConfig,
    logLevel: 'info'
  });

  await agent.initialize();

  const result = await agent.handle({
    id: 'msg1',
    type: 'unknown',
    payload: {
      type: 'unknown_type'
    }
  });

  assert(result.success === false, 'Should fail for unknown type');
  assert(result.error, 'Should include error message');

  await agent.shutdown();
  console.log('✓ Unknown message type handling');
}

// Simple assert helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Run all tests
async function runTests() {
  console.log('\n🧪 Scout Agent Tests\n');

  const tests = [
    testScoutAgentInitialization,
    testEntityExtraction,
    testLeadScoring,
    testPostAnalysis,
    testScanSubreddit,
    testMessageHandling,
    testDuplicatePrevention,
    testUnknownMessageType
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
  testScoutAgentInitialization,
  testEntityExtraction,
  testLeadScoring,
  testPostAnalysis,
  testScanSubreddit,
  testMessageHandling,
  testDuplicatePrevention,
  testUnknownMessageType
};

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
