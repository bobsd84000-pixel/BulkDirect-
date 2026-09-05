#!/usr/bin/env node

const BASE_URL = process.env.SCOUT_URL || 'https://bulkdirect-bulk-d.vercel.app';

async function e2eTest() {
  console.log('🔗 E2E Test: Scout → Analyst → Filter → Export\n');
  const startTime = Date.now();

  try {
    // Step 1: Scout
    console.log('Step 1️⃣  Scout (fetch + score posts)...');
    const scoutResult = await callScout();
    if (!scoutResult.success) {
      console.error('❌ Scout failed:', scoutResult.error);
      process.exit(1);
    }
    const { posts_scored } = scoutResult.data;
    console.log(`  ✅ Fetched ${scoutResult.data.posts_fetched} posts, scored ${posts_scored.length}\n`);

    // Step 2: Analyst
    console.log('Step 2️⃣  Analyst (extract lead info)...');
    const analystResult = await callAnalyst(posts_scored);
    if (!analystResult.success) {
      console.error('❌ Analyst failed:', analystResult.error);
      process.exit(1);
    }
    const { posts_with_leads } = analystResult.data;
    console.log(`  ✅ Analyzed ${posts_with_leads.length} posts\n`);

    // Step 3: Filter
    console.log('Step 3️⃣  Filter (qualify leads)...');
    const filterResult = await callFilter(posts_with_leads);
    if (!filterResult.success) {
      console.error('❌ Filter failed:', filterResult.error);
      process.exit(1);
    }
    const { qualified_leads } = filterResult.data;
    console.log(`  ✅ Found ${qualified_leads.length} qualified leads\n`);

    // Validate: at least 3 qualified leads
    if (qualified_leads.length < 3) {
      console.error(`❌ E2E test FAIL`);
      console.error(`Expected ≥ 3 qualified leads, got ${qualified_leads.length}`);
      process.exit(1);
    }

    // Step 4: Export
    console.log('Step 4️⃣  Export (format results)...');
    const exportResult = await callExport(qualified_leads, 'json');
    if (!exportResult.success) {
      console.error('❌ Export failed:', exportResult.error);
      process.exit(1);
    }
    console.log(`  ✅ Exported ${exportResult.data.count} leads as JSON\n`);

    // Success!
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log('✅ E2E test PASS\n');
    console.log('📊 Results:');
    console.log(`   Scout: ${scoutResult.data.posts_fetched} posts fetched, ${posts_scored.length} scored`);
    console.log(`   Analyst: ${posts_with_leads.length} leads extracted`);
    console.log(`   Filter: ${qualified_leads.length} qualified (score ≥7, has email/business)`);
    console.log(`   Export: JSON format with ${exportResult.data.count} leads`);
    console.log(`   Total time: ${totalTime}s`);

    if (qualified_leads.length > 0) {
      const example = qualified_leads[0];
      console.log(`\n📌 Top qualified lead:`);
      console.log(`   Title: ${example.title.substring(0, 60)}...`);
      console.log(`   Score: ${example.score}/10`);
      console.log(`   Email: ${example.email || 'N/A'}`);
      console.log(`   Business: ${example.business || 'N/A'}`);
      console.log(`   Intent: ${example.intent || 'N/A'}`);
    }

    console.log('\n✨ E2E chain is working correctly!\n');
    process.exit(0);
  } catch (err) {
    console.error(`❌ E2E test error: ${err.message}`);
    process.exit(1);
  }
}

async function callScout() {
  try {
    const response = await fetch(
      `${BASE_URL}/api/scout?subreddit=learnprogramming&limit=10`,
      { timeout: 30000 }
    );
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    if (!data.posts_scored || data.posts_scored.length === 0) {
      return { success: false, error: 'No posts scored' };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function callAnalyst(posts_scored) {
  try {
    const response = await fetch(`${BASE_URL}/api/analyst`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts_scored }),
      timeout: 30000,
    });
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    if (!data.posts_with_leads) {
      return { success: false, error: 'Invalid analyst response' };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function callFilter(posts_with_leads) {
  try {
    const response = await fetch(`${BASE_URL}/api/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts_with_leads }),
      timeout: 30000,
    });
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    if (!data.qualified_leads) {
      return { success: false, error: 'Invalid filter response' };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function callExport(qualified_leads, format = 'json') {
  try {
    const response = await fetch(`${BASE_URL}/api/export?format=${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qualified_leads }),
      timeout: 30000,
    });
    if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    if (data.status !== 'exported') {
      return { success: false, error: 'Export failed' };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

e2eTest();
