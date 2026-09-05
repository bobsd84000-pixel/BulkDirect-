#!/usr/bin/env node

const BASE_URL = process.env.SCOUT_URL || 'https://bulkdirect-bulk-d.vercel.app';

async function validateBulkDirect() {
  console.log('🔍 BulkDirect Validation\n');
  const startTime = Date.now();
  const results = [];

  // Test 1: Reddit Auth
  console.log('1️⃣  Testing reddit-auth...');
  const authResult = await testRedditAuth();
  results.push({ name: 'reddit-auth', ...authResult });
  console.log(`   ${authResult.success ? '✅' : '⚠️'} ${authResult.time}ms - ${authResult.status}\n`);

  // Test 2: LLM Inference
  console.log('2️⃣  Testing llm-infer...');
  const llmResult = await testLLMInfer();
  results.push({ name: 'llm-infer', ...llmResult });
  console.log(`   ${llmResult.success ? '✅' : '⚠️'} ${llmResult.time}ms - ${llmResult.status} (${llmResult.provider || 'N/A'})\n`);

  // Test 3: Scout
  console.log('3️⃣  Testing scout...');
  const scoutResult = await testScout();
  results.push({ name: 'scout', ...scoutResult });
  console.log(`   ${scoutResult.success ? '✅' : '⚠️'} ${scoutResult.time}ms - ${scoutResult.status} (${scoutResult.posts || 0} posts)\n`);

  // If scout failed, skip remaining tests
  if (!scoutResult.success) {
    console.error('❌ Scout endpoint failed. Cannot continue chain.\n');
    return failValidation(results, startTime);
  }

  // Test 4: Analyst
  console.log('4️⃣  Testing analyst...');
  const analystResult = await testAnalyst(scoutResult.data);
  results.push({ name: 'analyst', ...analystResult });
  console.log(`   ${analystResult.success ? '✅' : '⚠️'} ${analystResult.time}ms - ${analystResult.status} (${analystResult.leads || 0} leads)\n`);

  if (!analystResult.success) {
    console.error('❌ Analyst endpoint failed. Cannot continue chain.\n');
    return failValidation(results, startTime);
  }

  // Test 5: Filter
  console.log('5️⃣  Testing filter...');
  const filterResult = await testFilter(analystResult.data);
  results.push({ name: 'filter', ...filterResult });
  console.log(`   ${filterResult.success ? '✅' : '⚠️'} ${filterResult.time}ms - ${filterResult.status} (${filterResult.qualified || 0} qualified)\n`);

  if (!filterResult.success) {
    console.error('❌ Filter endpoint failed. Cannot continue chain.\n');
    return failValidation(results, startTime);
  }

  // Test 6: Export
  console.log('6️⃣  Testing export...');
  const exportResult = await testExport(filterResult.data);
  results.push({ name: 'export', ...exportResult });
  console.log(`   ${exportResult.success ? '✅' : '⚠️'} ${exportResult.time}ms - ${exportResult.status}\n`);

  // Summary
  const totalTime = Math.round((Date.now() - startTime) / 10) / 100;
  const allPass = results.every(r => r.success);

  console.log('═'.repeat(50));
  if (allPass) {
    console.log('✅ BulkDirect Validation PASS\n');
    console.log('Endpoints tested:');
    for (const r of results) {
      console.log(`  ${r.name.padEnd(15)} ${r.time.toString().padEnd(6)}ms ✅`);
    }
    console.log(`\nTotal time: ${totalTime}s`);
    console.log('Status: ALL ENDPOINTS LIVE ✅\n');
    process.exit(0);
  } else {
    console.log('❌ BulkDirect Validation FAIL\n');
    for (const r of results) {
      console.log(`  ${r.name.padEnd(15)} ${r.time.toString().padEnd(6)}ms ${r.success ? '✅' : '❌'}`);
    }
    process.exit(1);
  }
}

async function testRedditAuth() {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/reddit-auth?code=test_code`, { timeout: 10000 });
    const time = Date.now() - start;
    if (response.ok || response.status === 400 || response.status === 401) {
      return { success: true, status: `HTTP ${response.status}`, time };
    }
    return { success: false, status: `HTTP ${response.status}`, time };
  } catch (err) {
    const time = Date.now() - start;
    return { success: false, status: err.message, time };
  }
}

async function testLLMInfer() {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/llm-infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Say hello',
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
      }),
      timeout: 15000,
    });
    const time = Date.now() - start;
    if (!response.ok) {
      return { success: false, status: `HTTP ${response.status}`, time };
    }
    const data = await response.json();
    const provider = data.provider || 'unknown';
    return { success: !!data.result, status: `HTTP 200`, provider, time };
  } catch (err) {
    const time = Date.now() - start;
    return { success: false, status: err.message, time };
  }
}

async function testScout() {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/scout?subreddit=learnprogramming&limit=5`, {
      timeout: 30000,
    });
    const time = Date.now() - start;
    if (!response.ok) {
      return { success: false, status: `HTTP ${response.status}`, time };
    }
    const data = await response.json();
    const posts = data.posts_scored || [];
    if (posts.length === 0) {
      return { success: false, status: 'No posts scored', posts: 0, time };
    }
    return { success: true, status: `HTTP 200`, posts: posts.length, data: data, time };
  } catch (err) {
    const time = Date.now() - start;
    return { success: false, status: err.message, time };
  }
}

async function testAnalyst(scoutData) {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/analyst`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts_scored: scoutData.posts_scored }),
      timeout: 30000,
    });
    const time = Date.now() - start;
    if (!response.ok) {
      return { success: false, status: `HTTP ${response.status}`, time };
    }
    const data = await response.json();
    const leads = data.posts_with_leads || [];
    return { success: leads.length > 0, status: `HTTP 200`, leads: leads.length, data: data, time };
  } catch (err) {
    const time = Date.now() - start;
    return { success: false, status: err.message, time };
  }
}

async function testFilter(analystData) {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts_with_leads: analystData.posts_with_leads }),
      timeout: 10000,
    });
    const time = Date.now() - start;
    if (!response.ok) {
      return { success: false, status: `HTTP ${response.status}`, time };
    }
    const data = await response.json();
    const qualified = data.qualified_leads || [];
    return { success: true, status: `HTTP 200`, qualified: qualified.length, data: data, time };
  } catch (err) {
    const time = Date.now() - start;
    return { success: false, status: err.message, time };
  }
}

async function testExport(filterData) {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/export?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qualified_leads: filterData.qualified_leads }),
      timeout: 10000,
    });
    const time = Date.now() - start;
    if (!response.ok) {
      return { success: false, status: `HTTP ${response.status}`, time };
    }
    const data = await response.json();
    return { success: data.status === 'exported', status: `HTTP 200`, time };
  } catch (err) {
    const time = Date.now() - start;
    return { success: false, status: err.message, time };
  }
}

function failValidation(results, startTime) {
  const totalTime = Math.round((Date.now() - startTime) / 10) / 100;
  console.log('═'.repeat(50));
  console.log('❌ BulkDirect Validation FAIL\n');
  for (const r of results) {
    console.log(`  ${r.name.padEnd(15)} ${r.time.toString().padEnd(6)}ms ${r.success ? '✅' : '❌'}`);
  }
  console.log(`\nTotal time: ${totalTime}s\n`);
  process.exit(1);
}

validateBulkDirect();
