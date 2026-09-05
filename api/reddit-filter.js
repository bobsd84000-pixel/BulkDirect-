/**
 * api/reddit-filter.js
 * BulkDirect Filter stage — business rules & format for export
 * Inputs: analyzed posts from Analyst stage
 * Outputs: export-ready leads (CSV/JSON compatible)
 */

// BulkDirect business rules
const BUSINESS_RULES = {
  // Exclude patterns (case-insensitive)
  exclude: [
    'agency',
    'freelancer',
    'marketplace',
    'outsource',
    'cheap labor',
  ],

  // Target keywords (higher priority)
  target: ['saas', 'startup', 'growth', 'b2b', 'enterprise'],

  // Department signals
  departments: {
    sales: ['sales', 'business dev', 'revenue', 'account manager'],
    marketing: ['marketing', 'demand gen', 'growth', 'seo'],
    product: ['product', 'engineering', 'tech', 'dev'],
    ops: ['operations', 'admin', 'hiring', 'recruitment'],
  },
};

function applyBusinessRules(post) {
  const text = `${post.title}`.toLowerCase();
  const verdict = { pass: true, reasons: [] };

  // Exclusion rules
  BUSINESS_RULES.exclude.forEach((pattern) => {
    if (text.includes(pattern)) {
      verdict.pass = false;
      verdict.reasons.push(`excluded: contains "${pattern}"`);
    }
  });

  // Target bonus
  let targetBonus = 0;
  BUSINESS_RULES.target.forEach((pattern) => {
    if (text.includes(pattern)) {
      targetBonus += 1.5;
    }
  });

  // Detect likely department
  let department = 'unknown';
  for (const [dept, keywords] of Object.entries(BUSINESS_RULES.departments)) {
    if (keywords.some((kw) => text.includes(kw))) {
      department = dept;
      break;
    }
  }

  return {
    pass: verdict.pass,
    pass_reasons: verdict.reasons,
    department,
    target_bonus: parseFloat(targetBonus.toFixed(2)),
    final_quality_score: parseFloat(
      (post.quality_score + targetBonus).toFixed(2)
    ),
  };
}

function formatForExport(post, businessRules) {
  // CSV-safe: escape quotes, remove newlines
  const escape = (str) =>
    `"${String(str).replace(/"/g, '""').replace(/\n/g, ' ')}"`;

  return {
    // Raw
    lead_id: `${post.subreddit}_${post.post_id}`,
    subreddit: post.subreddit,
    author: post.author,
    post_date: post.created_at,
    title: post.title,
    url: post.permalink,

    // Scores
    quality_score: post.quality_score,
    engagement_score: post.engagement_score,
    recency_score: post.recency_score,
    final_score: businessRules.final_quality_score,

    // Filtering
    department: businessRules.department,
    pass_business_rules: businessRules.pass,
    pass_reason:
      businessRules.pass_reasons.length > 0
        ? businessRules.pass_reasons.join('; ')
        : 'passed',

    // Engagement
    upvotes: post.score,
    comments: post.comments,

    // Status
    status: businessRules.pass ? 'lead_ready' : 'filtered_out',
    priority: businessRules.final_quality_score > 15 ? 'high' : 'normal',

    // Metadata
    processed_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { analyst_posts = [], export_format = 'json' } = req.body;

  if (!Array.isArray(analyst_posts)) {
    return res.status(400).json({ error: 'analyst_posts must be array' });
  }

  try {
    const filtered = [];
    const rejected = [];
    const summary = {
      total_input: analyst_posts.length,
      passed_filters: 0,
      rejected_filters: 0,
      by_department: {},
      by_priority: { high: 0, normal: 0 },
    };

    analyst_posts.forEach((post) => {
      const rules = applyBusinessRules(post);
      const formatted = formatForExport(post, rules);

      if (rules.pass) {
        filtered.push(formatted);
        summary.passed_filters++;
        summary.by_priority[formatted.priority]++;
        summary.by_department[formatted.department] =
          (summary.by_department[formatted.department] || 0) + 1;
      } else {
        rejected.push(formatted);
        summary.rejected_filters++;
      }
    });

    // Sort by final_score descending
    filtered.sort((a, b) => b.final_score - a.final_score);

    // Build response based on export format
    const response = {
      status: 'filter_complete',
      timestamp: new Date().toISOString(),
      summary,
    };

    if (export_format === 'csv') {
      // CSV header
      const headers = Object.keys(filtered[0] || {});
      const csvHeader = headers.map((h) => `"${h}"`).join(',');
      const csvRows = filtered.map((lead) =>
        headers
          .map((h) => {
            const val = lead[h];
            if (typeof val === 'string') {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(',')
      );

      response.csv = [csvHeader, ...csvRows].join('\n');
    } else {
      response.leads = filtered;
      response.rejected = rejected;
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('Filter error:', err);
    return res.status(500).json({
      error: 'Filter failed',
      detail: err.message,
    });
  }
}
