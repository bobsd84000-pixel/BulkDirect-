---
name: Agent Scout Reddit Development
description: Build and deploy the 4-agent swarm for B2B lead discovery and routing from Reddit
---

# Agent Scout Reddit Development

Build a production-grade 4-agent swarm that discovers B2B leads on Reddit and routes them to service providers with intelligent matching.

## When to Use This Skill

- **Building:** Agent Scout Reddit features, agents, integrations
- **Debugging:** Swarm coordination, lead routing, qualification logic
- **Testing:** End-to-end pipeline, agent interactions, provider routing
- **Deploying:** Setup Reddit API access, provider integrations, monitoring
- **Scaling:** Load balancing, performance optimization, capacity planning

## System Architecture

**4-Agent Swarm Pipeline:**
```
Scout → Qualify → Route → Orchestrate
```

1. **Scout Agent:** Find & extract leads from Reddit
2. **Qualifier Agent:** Validate, score, and tier leads
3. **Router Agent:** Match leads to optimal providers
4. **Orchestrator Agent:** Coordinate swarm, track metrics, handle escalations

## Implementation Checklist

### Phase 1: Agent Framework (Week 1)

- [ ] Define agent interfaces and state contracts
- [ ] Implement base Agent class in agents/base.js
- [ ] Setup agent spawning and lifecycle management
- [ ] Create agent communication protocol (message queue or direct)
- [ ] Add logging and observability per agent
- [ ] Write unit tests for agent base behavior

**Key files:**
- `agents/scout.md` → implementation spec
- `lib/agent-base.js` → base agent class
- `tests/agents/*.test.js` → test suite

### Phase 2: Scout Agent (Week 1-2)

- [ ] Integrate Reddit API client (PRAW alternative or REST API)
- [ ] Implement subreddit discovery and post fetching
- [ ] Extract entity mentions (company names, tools)
- [ ] Identify pain points and problems from post text
- [ ] Classify opportunity type (problem-seeking, solution-evaluating)
- [ ] Score lead quality using heuristics
- [ ] Queue leads to Qualifier Agent
- [ ] Add Reddit rate-limiting and retry logic

**Key files:**
- `lib/reddit-client.js` → Reddit API wrapper
- `lib/entity-extractor.js` → Named entity recognition
- `lib/lead-scorer.js` → Quality scoring logic

### Phase 3: Qualifier Agent (Week 2-3)

- [ ] Validate company existence (via APIs: Clearbit, Hunter)
- [ ] Enrich company data (industry, size, stage, revenue)
- [ ] Assess problem severity and urgency
- [ ] Evaluate buyer readiness signals
- [ ] Determine lead tier (Tier 1/2/3)
- [ ] Identify provider recommendation based on fit
- [ ] Calculate qualification confidence score
- [ ] Handle ambiguous/edge cases

**Key files:**
- `lib/company-enricher.js` → Company data enrichment
- `lib/buyer-readiness.js` → Buyer intent signals
- `lib/lead-tiering.js` → Lead tier classification

### Phase 4: Router Agent (Week 3-4)

- [ ] Define provider profile schema (specialization, capacity, tiers)
- [ ] Implement provider matching algorithm
- [ ] Add load balancing across providers
- [ ] Respect provider rules (exclusions, geography, etc.)
- [ ] Calculate routing confidence score
- [ ] Setup fallback provider logic
- [ ] Implement provider notification (webhooks, email, API)
- [ ] Track routing decisions in database

**Key files:**
- `lib/provider-matcher.js` → Matching algorithm
- `lib/load-balancer.js` → Workload distribution
- `config/providers.yaml` → Provider configuration

### Phase 5: Orchestrator Agent (Week 4-5)

- [ ] Implement swarm spawning and lifecycle
- [ ] Setup state management (in-memory + persistence)
- [ ] Add pipeline monitoring and health checks
- [ ] Implement metrics collection (Prometheus format)
- [ ] Create alerting rules (SLA violations, bottlenecks)
- [ ] Handle escalations and recovery
- [ ] Setup logging aggregation
- [ ] Create admin dashboard

**Key files:**
- `lib/orchestrator.js` → Swarm coordinator
- `lib/metrics.js` → Metrics collection
- `hooks/monitoring.json` → Health check hooks

### Phase 6: Integration & Deployment (Week 5-6)

- [ ] Setup Reddit API credentials (OAuth or app access)
- [ ] Configure provider integrations (Salesforce, HubSpot, etc.)
- [ ] Setup database schema for leads and analytics
- [ ] Configure Redis for caching and rate limiting
- [ ] Setup monitoring and alerting (Datadog, New Relic)
- [ ] Create runbooks for common issues
- [ ] Deploy to production with blue-green strategy
- [ ] Setup CI/CD pipeline with automated tests

**Key files:**
- `.env.example` → Configuration template
- `schema/` → Database migrations
- `.github/workflows/deploy.yml` → CI/CD

## Key Decisions & Tradeoffs

### Scout Frequency vs. API Rate Limits
- **Higher frequency:** More leads discovered, hits Reddit rate limits
- **Lower frequency:** Fewer leads, but stable operations
- **Decision:** Start 5-minute intervals, adjust based on limits

### Lead Scoring: Rules vs. ML
- **Rules-based:** Fast, interpretable, hand-tuned heuristics
- **ML-based:** Better accuracy, requires training data, complex
- **Decision:** Start rules-based, migrate to ML if data accumulates

### Provider Routing: Direct vs. Batched
- **Direct:** Route immediately, faster provider action
- **Batched:** Aggregate leads, reduce API calls, delayed action
- **Decision:** Direct for Tier 1, batched for Tier 2/3

### State Management: In-Memory vs. Database
- **In-memory:** Fast, simple, lost on restart
- **Database:** Persistent, queryable, slightly slower
- **Decision:** Hybrid: Redis for speed, PostgreSQL for durability

## Testing Strategy

### Unit Tests
```bash
npm test -- tests/lib/
```
Test individual components: scorers, matchers, enrichers

### Integration Tests
```bash
npm test -- tests/integration/
```
Test agent communication, data flow through pipeline

### End-to-End Tests
```bash
npm test -- tests/e2e/ --env=staging
```
Test full pipeline with real Reddit data (staging)

### Load Tests
```bash
npm run test:load -- --leads=1000 --concurrent=5
```
Test swarm under load: throughput, latency, resource usage

## Monitoring & Observability

### Key Metrics to Track

**Throughput:**
- Leads discovered/hour
- Leads qualified/hour
- Leads routed/hour
- Avg latency per stage

**Quality:**
- % qualified (Tier 1+)
- Avg quality score
- Provider match confidence
- Conversion rate

**Health:**
- Agent uptime
- Error rate per stage
- Queue depth per agent
- Reddit API quota remaining

### Dashboards

- **Overview:** Pipeline health, key metrics, recent leads
- **Scout:** Discovery rate, sources, quality distribution
- **Qualifier:** Qualification rate by tier, company profile insights
- **Router:** Provider distribution, confidence scores, fallback usage
- **Orchestrator:** Agent health, SLA compliance, alerts

## Common Tasks

### Add a New Subreddit
```js
// config/reddit.yaml
subreddits:
  - r/SaaS
  - r/startups
  - r/Entrepreneur  # ← Add here
```

### Adjust Lead Scoring
```js
// lib/lead-scorer.js
function scoreQuality(lead) {
  let score = 0;
  score += lead.company ? 0.3 : 0;
  score += lead.painPoints.length > 2 ? 0.3 : 0.1;
  score += lead.decisionMaker ? 0.2 : 0;
  score += lead.budget ? 0.2 : 0;
  return score;
}
```

### Add a New Provider
```yaml
# config/providers.yaml
providers:
  - id: provider_003
    name: "NewCorp Solutions"
    industries: [SaaS, E-commerce]
    stages: [Growth, Mature]
    tiers: [1, 2]
    webhook: https://newcorp.example.com/leads
```

## Troubleshooting

**Scout not finding leads?**
- Check Reddit API rate limits
- Verify subreddit list is accurate
- Review entity extraction patterns

**Qualification bottleneck?**
- Increase Qualifier agent concurrency
- Optimize company enrichment API calls (batch requests)
- Check database query performance

**Provider routing issues?**
- Verify provider webhooks are reachable
- Check provider capacity limits
- Review matching algorithm scoring

**Orchestrator not responding?**
- Check logs for crashes
- Verify database connectivity
- Ensure Redis is running

## References

- [Agent Scout Reddit Architecture](./docs/ARCHITECTURE.md)
- [Scout Agent Spec](./agents/scout.md)
- [Qualifier Agent Spec](./agents/qualifier.md)
- [Router Agent Spec](./agents/router.md)
- [Orchestrator Agent Spec](./agents/orchestrator.md)
- [Reddit API Docs](https://www.reddit.com/dev/api)
- [ECC Agent Patterns](../agents/)
