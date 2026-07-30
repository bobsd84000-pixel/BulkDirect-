// api/lib/task-graph.js — Orchestrateur agents BulkDirect
// Scout -> Analyst -> Filter -> Export, verifier separe
// Base sur pattern graph-engineering (task-graphs.md)

async function runPipeline({ scout, analyst, filter, exportFn, verifier }, query) {
  const trace = { query, steps: {}, halted: false };

  // 1. SCOUT — fetch brut (deja existant: fetchAllPosts)
  const scoutOut = await scout(query);
  trace.steps.scout = { posts: scoutOut.posts.length, pages: scoutOut.pages, truncated: scoutOut.truncated };

  if (scoutOut.posts.length === 0) {
    trace.halted = true;
    trace.reason = 'aucun post Reddit trouve';
    return trace;
  }

  // 2. ANALYST — calcule score intention/demande sur les posts bruts
  const analystOut = await analyst(scoutOut.posts);
  trace.steps.analyst = {
    avg_comments: analystOut.avgComments,
    avg_score: analystOut.avgScore,
    intent_score: analystOut.intentScore
  };

  // 3. FILTER — garde top subreddits + top posts (deja dans analyze.js actuel)
  const filterOut = await filter(scoutOut.posts, analystOut);
  trace.steps.filter = {
    subreddits_kept: filterOut.subreddits.length,
    top_posts_kept: filterOut.topPosts.length
  };

  // 4. EXPORT — formate reponse finale
  const exportOut = await exportFn({
    query,
    scout: scoutOut,
    analyst: analystOut,
    filter: filterOut
  });
  trace.steps.export = { ready: true };

  // 5. VERIFIER — agent separe, ne genere rien, verifie seulement
  const verdict = await verifier(exportOut, scoutOut);
  trace.verified = verdict;

  if (!verdict.passed) {
    trace.halted = true;
    trace.reason = verdict.reason;
    return trace;
  }

  return { ...trace, result: exportOut };
}

module.exports = { runPipeline };
