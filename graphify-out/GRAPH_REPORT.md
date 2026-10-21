# Graph Report - BulkDirect-  (2026-10-21)

## Corpus Check
- 67 files · ~38,075 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 567 nodes · 611 edges · 54 communities (37 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e33294a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Structures to Avoid
- currency-pulse/package.json
- package.json
- Security and Hardening
- Git Workflow and Versioning
- CI/CD and Automation
- Frontend UI Engineering
- Codex CLI — General-Purpose Diagnostics
- codex.js
- LUMIK + Gemini Vision — Product Describer
- codex-claude-review.js
- ADHD
- Spec-Driven Development
- codex-plugin-cc/package.json
- analyze-v3.js
- gemini-describer.js
- Memory Skill
- Subagent Types
- LumikDescriber
- Codex Plugin CC
- Plugins Reference
- validate-bulkdirect.js
- Skill Categories
- vercel.json
- verify-conflict-logic.js
- Common Hooks
- Available MCP Servers
- Vue entity_facts_conflicts pour flaggage automatique
- App.jsx
- Avant de merger PR #10
- reddit-analyst.js
- export.js
- e2e-test.js
- llm-infer.js
- reddit-filter.js
- vite.config.js
- analyze.js
- scout.js
- validate.js
- BulkDirect
- analyst.js
- filter.js
- suppliers.js
- core.md
- me.md
- README.md
- install.sh
- test-migration-0012.js

## God Nodes (most connected - your core abstractions)
1. `Security and Hardening` - 17 edges
2. `Git Workflow and Versioning` - 15 edges
3. `doctor()` - 14 edges
4. `CI/CD and Automation` - 13 edges
5. `Frontend UI Engineering` - 13 edges
6. `Structures to Avoid` - 12 edges
7. `ADHD` - 10 edges
8. `LumikDescriber` - 9 edges
9. `execAsync` - 9 edges
10. `Phrases to Remove` - 9 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `BulkDirectLanding()`  [EXTRACTED]
  src/App.jsx → src/BulkDirectHeadroom.jsx

## Import Cycles
- None detected.

## Communities (54 total, 17 thin omitted)

### Community 0 - "Structures to Avoid"
Cohesion: 0.05
Nodes (33): Before/After Examples, Example 1: Throat-Clearing + Binary Contrast, Example 2: Filler + Unnecessary Reassurance, Example 3: Business Jargon Stack, Example 4: Dramatic Fragmentation, Example 5: Rhetorical Setup, Adverbs, Business Jargon (+25 more)

### Community 1 - "currency-pulse/package.json"
Cohesion: 0.06
Nodes (32): bin, codex, dependencies, csv-parse, lucide-react, react, react-dom, devDependencies (+24 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (32): bin, codex, dependencies, csv-parse, lucide-react, react, react-dom, devDependencies (+24 more)

### Community 3 - "Security and Hardening"
Cohesion: 0.06
Nodes (31): Always Do (No Exceptions), Ask First (Requires Human Approval), Broken Access Control, Broken Authentication, Common Rationalizations, Cross-Site Scripting (XSS), Data Privacy & Compliance, Destructive Operations on Derived Paths (+23 more)

### Community 4 - "Git Workflow and Versioning"
Cohesion: 0.07
Nodes (26): 1. Commit Early, Commit Often, 2. Atomic Commits, 3. Descriptive Messages, 4. Keep Concerns Separate, 5. Size Your Changes, Branch Naming, Branching Strategy, Change Summaries (+18 more)

### Community 5 - "CI/CD and Automation"
Cohesion: 0.08
Nodes (23): Automation Beyond CI, Basic CI Pipeline, Build Cop Role, CI/CD and Automation, CI Optimization, Common Rationalizations, Dependabot / Renovate, Deployment Strategies (+15 more)

### Community 6 - "Frontend UI Engineering"
Cohesion: 0.08
Nodes (23): Accessibility (WCAG 2.1 AA), ARIA Labels, Avoid the AI Aesthetic, Color, Common Rationalizations, Component Architecture, Component Patterns, Design System Adherence (+15 more)

### Community 7 - "Codex CLI — General-Purpose Diagnostics"
Cohesion: 0.10
Nodes (20): 1. Via npm link (développement local), 2. Via package.json (production), ✅ Checklist Intégration, Codex CLI — General-Purpose Diagnostics, `codex doctor`, `codex --help`, 📖 Commandes, Développement local (+12 more)

### Community 8 - "codex.js"
Cohesion: 0.21
Nodes (19): checkConfigDir(), checkDiskSpace(), checkDocker(), checkEnvFile(), checkGit(), checkGitHubCli(), checkNetwork(), checkNode() (+11 more)

### Community 9 - "LUMIK + Gemini Vision — Product Describer"
Cohesion: 0.10
Nodes (19): 1. Récupère API Key Gemini, 2. Ajoute env var Vercel, 3. Installe dépendances (si absent), 4. Prépare CSV input, CI/CD (Vercel), CSS (LUMIK tokens), "CSV parse error", "GOOGLE_API_KEY manquant" (+11 more)

### Community 10 - "codex-claude-review.js"
Cohesion: 0.18
Nodes (15): checkConfigDir(), checkEnabled(), checkGit(), checkNode(), checkNpm(), checkRepo(), CONFIG_DIR, CONFIG_FILE (+7 more)

### Community 11 - "ADHD"
Cohesion: 0.14
Nodes (13): ADHD, Anti-patterns, Calibration, Companion library and CLI, Cost, Frames, Output shape, Phase 1 — Diverge (no critic) (+5 more)

### Community 12 - "Spec-Driven Development"
Cohesion: 0.14
Nodes (13): Common Rationalizations, Keeping the Spec Alive, Overview, Phase 0: Scope Check, Phase 1: Specify, Phase 2: Plan, Phase 3: Tasks, Phase 4: Implement (+5 more)

### Community 13 - "codex-plugin-cc/package.json"
Cohesion: 0.14
Nodes (13): author, bin, codex-claude-review, description, engines, node, keywords, license (+5 more)

### Community 14 - "analyze-v3.js"
Cohesion: 0.24
Nodes (10): analystStage(), analyzePost(), filterStage(), handler(), scoutStage(), cache, getCacheKey(), handler() (+2 more)

### Community 15 - "gemini-describer.js"
Cohesion: 0.24
Nodes (7): describeProduct(), handler(), readProductsCSV(), describeProductImage(), main(), readProductsCSV(), writeEnrichedCSV()

### Community 16 - "Memory Skill"
Cohesion: 0.15
Nodes (12): Agent-Initiated Actions (Automatic), `load` — Session Start, `/mem forget <topic>` — Remove Entries, `/mem show` — Display State, Memory Skill, Principles, `recall` — Retrieve Context, `save` — Persist Learning (+4 more)

### Community 17 - "Subagent Types"
Cohesion: 0.15
Nodes (12): Accessibility Agent, Code Review Agent, Explore Agent, Feature Development, Integration with Hooks, Performance Agent, PR Review Workflow, Recommended for BulkDirect (+4 more)

### Community 19 - "Codex Plugin CC"
Cohesion: 0.22
Nodes (8): Codex Plugin CC, Configuration, Enable Claude Review, Help, Installation, License, Run Diagnostics, Usage

### Community 20 - "Plugins Reference"
Cohesion: 0.22
Nodes (8): Brand Guidelines, Claude Code Setup, Frontend UI Engineering, Installation, Official Plugins, Plugin Structure, Plugins Reference, Recommended for BulkDirect

### Community 21 - "validate-bulkdirect.js"
Cohesion: 0.42
Nodes (8): failValidation(), testAnalyst(), testExport(), testFilter(), testLLMInfer(), testRedditAuth(), testScout(), validateBulkDirect()

### Community 22 - "Skill Categories"
Cohesion: 0.22
Nodes (8): Architectural Skills, Code Quality, Frontend Skills, Installation, Recommended for BulkDirect, Skill Categories, Skills Reference, Specialized Skills

### Community 23 - "vercel.json"
Cohesion: 0.22
Nodes (8): maxDuration, buildCommand, env, framework, functions, api/**/*.js, outputDirectory, routes

### Community 24 - "verify-conflict-logic.js"
Cohesion: 0.22
Nodes (5): conflicts, db, EntityFactsDB, fact1, fact2

### Community 25 - "Common Hooks"
Cohesion: 0.25
Nodes (7): Auto-Format (session-start), Auto-Lint (pre-commit), Block Sensitive Files (pre-commit), Claude Code Hooks Patterns, Common Hooks, Recommended for BulkDirect, Run Tests (post-save)

### Community 26 - "Available MCP Servers"
Cohesion: 0.25
Nodes (7): Available MCP Servers, Context7 (Documentation), GitHub MCP, MCP Servers Reference, Playwright (Frontend Testing), Recommended for BulkDirect, Supabase (Database)

### Community 27 - "Vue entity_facts_conflicts pour flaggage automatique"
Cohesion: 0.25
Nodes (7): 1. Vérifier la migration en prod, 2. Intégrer QA Reviewer Workflow, 3. Setup Automated QA Workflow, 4. QA Reviewer Dashboard, 5. Scoring Impact, QA Reviewer Integration — Migration 0012, Vue entity_facts_conflicts pour flaggage automatique

### Community 29 - "Avant de merger PR #10"
Cohesion: 0.25
Nodes (7): 1. Appliquer la migration, 2. Exécuter le test de conflit, 3. Vérifier les résultats, 4. Confirmer, Avant de merger PR #10, ✅ Checklist, Migration 0012 - Verification Guide

### Community 30 - "reddit-analyst.js"
Cohesion: 0.38
Nodes (5): analyzePost(), EXCLUDE_KEYWORDS, handler(), LEAD_KEYWORDS, scoreText()

### Community 31 - "export.js"
Cohesion: 0.67
Nodes (5): generateFilename(), handleCSV(), handleJSON(), handleWebhook(), POST()

### Community 32 - "e2e-test.js"
Cohesion: 0.60
Nodes (5): callAnalyst(), callExport(), callFilter(), callScout(), e2eTest()

### Community 33 - "llm-infer.js"
Cohesion: 0.70
Nodes (4): POST(), tryAnthropic(), tryOpenRouter(), tryTogether()

### Community 34 - "reddit-filter.js"
Cohesion: 0.60
Nodes (4): applyBusinessRules(), BUSINESS_RULES, formatForExport(), handler()

### Community 36 - "analyze.js"
Cohesion: 0.83
Nodes (3): fetchPage(), getToken(), handler()

### Community 37 - "scout.js"
Cohesion: 0.83
Nodes (3): fetchRedditPosts(), GET(), scorePost()

### Community 38 - "validate.js"
Cohesion: 0.83
Nodes (3): getRedditToken(), handler(), searchReddit()

### Community 39 - "BulkDirect"
Cohesion: 0.50
Nodes (3): ADHD Skill, BulkDirect, Skills

## Knowledge Gaps
- **18 isolated node(s):** `react`, `react-dom`, `lucide-react`, `csv-parse`, `@vitejs/plugin-react` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 360 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `react`, `react-dom`, `lucide-react` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Structures to Avoid` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `currency-pulse/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Security and Hardening` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Git Workflow and Versioning` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `CI/CD and Automation` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._