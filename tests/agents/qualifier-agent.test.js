/**
 * Qualifier Agent Tests
 */

const QualifierAgent = require('../../lib/qualifier-agent');
const CompanyEnricher = require('../../lib/company-enricher');
const BuyerReadinessAnalyzer = require('../../lib/buyer-readiness');

// Test fixtures
const mockLead = {
  postId: 'post1',
  title: 'Building SaaS with Stripe and Shopify',
  author: 'founder_user',
  subreddit: 'SaaS',
  leadScore: 0.65,
  entities: {
    companies: ['TechCorp'],
    tools: ['Stripe', 'Shopify'],
    titles: ['CEO'],
    painPoints: ['scaling'],
    budgetSignals: ['funding']
  }
};

async function testQualifierAgentInitialization() {
  const agent = new QualifierAgent({
    name: 'TestQualifier',
    qualityThreshold: 0.4,
    tieringRules: { tier1: 0.85, tier2: 0.60, tier3: 0.40 },
    timeout: 30000,
    logLevel: 'info'
  });

  await agent.initialize();

  assert(agent.type === 'qualifier', 'Agent type should be qualifier');
  assert(agent.name === 'TestQualifier', 'Agent name should match');
  assert(agent.qualityThreshold === 0.4, 'Should have quality threshold');
  assert(agent.qualifiedLeads instanceof Array, 'Should track qualified leads');
  assert(agent.rejectedLeads instanceof Array, 'Should track rejected leads');

  await agent.shutdown();
  console.log('✓ Qualifier Agent initialization');
}

async function testCompanyEnricher() {
  const enricher = new CompanyEnricher(null);

  // Test domain extraction
  const domain1 = enricher.extractDomain('Visit us at https://example.com');
  assert(domain1 === 'example.com', 'Should extract domain from URL');

  const domain2 = enricher.extractDomain('Contact: user@company.io');
  assert(domain2 === 'company.io', 'Should extract domain from email');

  // Test size categorization
  assert(enricher.categorizeSize(5) === '1-10', 'Should categorize small company');
  assert(enricher.categorizeSize(100) === '51-200', 'Should categorize medium company');
  assert(enricher.categorizeSize(5000) === '1000+', 'Should categorize large company');

  console.log('✓ Company enricher');
}

async function testBuyerReadinessAnalyzer() {
  const analyzer = new BuyerReadinessAnalyzer();

  const readiness = analyzer.analyzeBuyer(mockLead, mockLead.entities);

  assert(readiness.budget !== undefined, 'Should assess budget');
  assert(readiness.authority !== undefined, 'Should assess authority');
  assert(readiness.need !== undefined, 'Should assess need');
  assert(readiness.timeline !== undefined, 'Should assess timeline');
  assert(readiness.overallScore >= 0 && readiness.overallScore <= 1, 'Score should be 0-1');
  assert(readiness.readinessLevel !== null, 'Should determine readiness level');
  assert(readiness.bantScore !== null, 'Should calculate BANT score');

  console.log(`✓ Buyer readiness (score: ${readiness.overallScore}, level: ${readiness.readinessLevel})`);
}

async function testLeadQualification() {
  const agent = new QualifierAgent({
    name: 'TestQualifier',
    qualityThreshold: 0.4,
    logLevel: 'info'
  });

  await agent.initialize();

  const result = await agent.qualifyLead(mockLead);

  assert(result.success === true, 'Should succeed');
  assert(result.lead, 'Should return lead');
  assert(result.lead.postId === mockLead.postId, 'Should include post ID');
  assert(result.lead.qualification !== undefined, 'Should have qualification score');
  assert(result.lead.readiness !== undefined, 'Should have readiness assessment');
  assert(result.lead.tier !== null || !result.lead.isQualified, 'Should determine tier for qualified leads');
  assert(result.lead.nextStep !== undefined, 'Should recommend next step');

  await agent.shutdown();
  console.log(`✓ Lead qualification (qualified: ${result.lead.isQualified}, tier: ${result.lead.tier})`);
}

async function testBatchQualification() {
  const agent = new QualifierAgent({
    name: 'TestQualifier',
    qualityThreshold: 0.4,
    logLevel: 'info'
  });

  await agent.initialize();

  const leads = [
    mockLead,
    { ...mockLead, postId: 'post2', leadScore: 0.8 },
    { ...mockLead, postId: 'post3', leadScore: 0.2 }
  ];

  const result = await agent.qualifyBatch(leads);

  assert(result.success === true, 'Should succeed');
  assert(result.total === 3, 'Should process all leads');
  assert(Array.isArray(result.leads), 'Should return leads array');
  assert(result.qualified >= 0, 'Should count qualified leads');
  assert(result.rejected >= 0, 'Should count rejected leads');
  assert(result.qualified + result.rejected === 3, 'Counts should match total');

  await agent.shutdown();
  console.log(`✓ Batch qualification (qualified: ${result.qualified}, rejected: ${result.rejected})`);
}

async function testTieringRules() {
  const agent = new QualifierAgent({
    name: 'TestQualifier',
    tieringRules: { tier1: 0.85, tier2: 0.60, tier3: 0.40 },
    logLevel: 'info'
  });

  assert(agent.determineTier(0.9) === 1, 'Should assign tier 1 for score 0.9');
  assert(agent.determineTier(0.7) === 2, 'Should assign tier 2 for score 0.7');
  assert(agent.determineTier(0.5) === 3, 'Should assign tier 3 for score 0.5');
  assert(agent.determineTier(0.3) === null, 'Should reject for score 0.3');

  await agent.initialize();
  await agent.shutdown();

  console.log('✓ Tiering rules');
}

async function testQualificationScoring() {
  const agent = new QualifierAgent({
    name: 'TestQualifier',
    qualityThreshold: 0.4,
    logLevel: 'info'
  });

  const enriched = {
    title: 'High quality lead',
    company: {
      domain: 'example.com',
      name: 'Example Corp',
      industry: 'SaaS',
      size: '51-200',
      funding: 'series-a'
    }
  };

  const readiness = {
    budget: { score: 0.8 },
    authority: { score: 0.7 },
    need: { score: 0.9 },
    timeline: { score: 0.6 },
    overallScore: 0.75,
    readinessLevel: 'high',
    bantScore: 'complete'
  };

  const qualified = agent.calculateQualificationScore(mockLead, enriched, readiness);

  assert(qualified.overallScore > 0, 'Should calculate positive score');
  assert(qualified.overallScore <= 1, 'Score should not exceed 1.0');
  assert(typeof qualified.isQualified === 'boolean', 'Should determine qualification');
  assert(Array.isArray(qualified.reason), 'Should provide reasoning');

  console.log(`✓ Qualification scoring (score: ${qualified.overallScore}, qualified: ${qualified.isQualified})`);
}

async function testMessageHandling() {
  const agent = new QualifierAgent({
    name: 'TestQualifier',
    logLevel: 'info'
  });

  await agent.initialize();

  // Test qualify_lead message
  const result = await agent.handle({
    id: 'msg1',
    type: 'qualify',
    payload: {
      type: 'qualify_lead',
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
  assert(statusResult.qualifiedLeads !== undefined, 'Should include qualified count');
  assert(statusResult.rejectedLeads !== undefined, 'Should include rejected count');

  await agent.shutdown();
  console.log('✓ Message handling');
}

async function testGetLeadsByTier() {
  const agent = new QualifierAgent({
    name: 'TestQualifier',
    qualityThreshold: 0.3,
    logLevel: 'info'
  });

  await agent.initialize();

  // Qualify multiple leads
  await agent.qualifyLead(mockLead);
  await agent.qualifyLead({ ...mockLead, postId: 'post2', leadScore: 0.9 });

  // Get by tier
  const tier1Leads = agent.getLeadsByTier(1);
  const tier2Leads = agent.getLeadsByTier(2);

  assert(Array.isArray(tier1Leads), 'Should return tier 1 leads');
  assert(Array.isArray(tier2Leads), 'Should return tier 2 leads');

  await agent.shutdown();
  console.log(`✓ Get leads by tier (tier1: ${tier1Leads.length}, tier2: ${tier2Leads.length})`);
}

async function testInvalidInput() {
  const agent = new QualifierAgent({
    name: 'TestQualifier',
    logLevel: 'info'
  });

  await agent.initialize();

  // Test null lead
  const result = await agent.qualifyLead(null);
  assert(result.success === false, 'Should fail for null lead');
  assert(result.error, 'Should include error message');

  // Test invalid batch
  const batchResult = await agent.qualifyBatch(null);
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
  console.log('\n🧪 Qualifier Agent Tests\n');

  const tests = [
    testQualifierAgentInitialization,
    testCompanyEnricher,
    testBuyerReadinessAnalyzer,
    testLeadQualification,
    testBatchQualification,
    testTieringRules,
    testQualificationScoring,
    testMessageHandling,
    testGetLeadsByTier,
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
  testQualifierAgentInitialization,
  testCompanyEnricher,
  testBuyerReadinessAnalyzer,
  testLeadQualification,
  testBatchQualification,
  testTieringRules,
  testQualificationScoring,
  testMessageHandling,
  testGetLeadsByTier,
  testInvalidInput
};

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}
