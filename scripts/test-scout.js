#!/usr/bin/env node

const BASE_URL = process.env.SCOUT_URL || 'https://bulkdirect-bulk-d.vercel.app';
const SUBREDDIT = 'learnprogramming';
const LIMIT = 5;

async function testScout() {
  console.log('🚀 Scout Agent Test\n');
  console.log(`Testing: ${BASE_URL}/api/scout?subreddit=${SUBREDDIT}&limit=${LIMIT}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `${BASE_URL}/api/scout?subreddit=${SUBREDDIT}&limit=${LIMIT}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}`);
      const error = await response.text();
      console.error(error);
      process.exit(1);
    }

    const data = await response.json();

    // Validate structure
    if (!data.subreddit || !data.posts_fetched || !data.posts_scored) {
      console.error('❌ Invalid response structure');
      console.error('Expected: { subreddit, posts_fetched, posts_scored }');
      console.error('Got:', data);
      process.exit(1);
    }

    // Validate posts
    if (data.posts_fetched === 0) {
      console.error('❌ No posts fetched');
      process.exit(1);
    }

    if (data.posts_scored.length === 0) {
      console.error('❌ No posts scored');
      process.exit(1);
    }

    // Validate post structure and scores
    let minScore = 10;
    let maxScore = 1;
    for (const post of data.posts_scored) {
      if (!post.post_id || !post.title || post.score === undefined || !post.url) {
        console.error('❌ Invalid post structure:', post);
        process.exit(1);
      }

      const score = parseInt(post.score);
      if (isNaN(score) || score < 1 || score > 10) {
        console.error(`❌ Invalid score ${post.score} for post "${post.title}"`);
        process.exit(1);
      }

      minScore = Math.min(minScore, score);
      maxScore = Math.max(maxScore, score);
    }

    // Success!
    console.log('\n✅ Scout test PASS\n');
    console.log(`📊 Results:`);
    console.log(`   Subreddit: ${data.subreddit}`);
    console.log(`   Posts fetched: ${data.posts_fetched}`);
    console.log(`   Posts scored: ${data.posts_scored.length}`);
    console.log(`   Score range: ${minScore}-${maxScore}`);

    if (data.posts_scored.length > 0) {
      const example = data.posts_scored[0];
      console.log(`\n📌 Example post:`);
      console.log(`   Title: ${example.title.substring(0, 60)}...`);
      console.log(`   Score: ${example.score}/10`);
      console.log(`   Author: ${example.author}`);
      console.log(`   URL: ${example.url}`);
    }

    console.log('\n✨ Scout agent is working correctly!\n');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Test failed: ${err.message}`);
    process.exit(1);
  }
}

testScout();
