# Agent Scout Reddit Architecture

## Overview

Agent Scout Reddit est un **swarm de 4 agents autonomes** qui découvrent et qualifient des leads B2B depuis Reddit, puis les route intelligemment vers des providers de services.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                           │
│  ├─ Workflow coordination                                       │
│  ├─ State management                                            │
│  ├─ Metrics & monitoring                                        │
│  └─ Escalation handling                                         │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ↓                    ↓                    ↓
    ┌────────────┐      ┌────────────┐      ┌────────────┐
    │  SCOUT     │      │ QUALIFIER  │      │   ROUTER   │
    │  AGENT     │      │   AGENT    │      │   AGENT    │
    ├────────────┤      ├────────────┤      ├────────────┤
    │ • Find     │      │ • Validate │      │ • Match    │
    │ • Extract  │  →   │ • Score    │  →   │ • Route    │
    │ • Classify │      │ • Segment  │      │ • Track    │
    └────────────┘      └────────────┘      └────────────┘
           ↑                    ↑                    ↑
         Reddit          Database            Providers
```

## Data Flow

### Stage 1: Discovery (Scout Agent)
```
Reddit API → Subreddit Monitor → Post Extractor → Lead Extraction
  ↓
{
  "lead_id": "reddit_123",
  "company": "Acme Corp",
  "pain_points": ["scaling", "automation"],
  "quality_score": 0.85
}
```

### Stage 2: Qualification (Qualifier Agent)
```
Scout Output → Company Research → Problem Analysis → Buyer Readiness
  ↓
{
  "qualified": true,
  "tier": "tier1",
  "opportunity_value": "$25000",
  "qualification_score": 0.92
}
```

### Stage 3: Routing (Router Agent)
```
Qualifier Output → Provider Matching → Capacity Check → Route Decision
  ↓
{
  "routed_to": "provider_001",
  "confidence": 0.94,
  "fallback": ["provider_002"]
}
```

### Stage 4: Tracking (Orchestrator Agent)
```
All Agents → State Aggregation → Metrics Collection → Alert Generation
  ↓
{
  "pipeline_state": {...},
  "performance": {...},
  "escalations": [...]
}
```

## Agent Capabilities

| Agent | Input | Processing | Output | Tools |
|-------|-------|-----------|--------|-------|
| **Scout** | Reddit URLs, keywords | Extract entities, classify problems | Lead object with metadata | WebFetch, Grep, Read |
| **Qualifier** | Lead object | Validate company, assess urgency | Qualified lead + tier + score | Read, Grep, WebFetch |
| **Router** | Qualified lead | Match providers, balance load | Routing decision + fallback | Read, Grep, Cache |
| **Orchestrator** | All pipeline events | Aggregate state, calculate metrics | Pipeline status + alerts | All tools + custom |

## Key Metrics

### Efficiency
- **Discovery Rate:** leads/hour from Reddit
- **Qualification Rate:** % of leads reaching Tier 1+
- **Routing Latency:** time from discovery to provider notification
- **Agent Throughput:** concurrent lead capacity

### Quality
- **Lead Quality Score:** 0-1 scale per lead
- **Provider Match Score:** 0-1 confidence in routing
- **Conversion Rate:** leads → actual deals
- **Customer Satisfaction:** provider feedback

### System Health
- **Agent Uptime:** % of time agents are operational
- **Pipeline Availability:** % time accepting new leads
- **Error Rate:** failures per 1000 leads
- **SLA Compliance:** % of metrics meeting targets

## Scalability

### Horizontal Scaling
- Multiple Scout instances for different subreddit sets
- Parallel Qualifier instances for high volume
- Distributed Router with provider affinity routing

### Vertical Scaling
- Increase concurrent lead limits per agent
- Optimize Reddit API polling frequency
- Cache company/provider lookup results
- Batch process qualification decisions

## Failure Modes & Recovery

| Failure | Impact | Recovery |
|---------|--------|----------|
| Scout timeout | No new leads | Retry with backoff |
| Qualifier crash | Queue backup | Restart, resume from DB |
| Router provider offline | Lead queueing | Use fallback provider |
| Orchestrator down | No visibility | Stateless restart + DB recovery |
| Reddit API rate limit | Discovery pause | Exponential backoff, queue resume |

## Integration Points

- **Reddit API:** Post/comment extraction, user profiles
- **Company Research APIs:** Clearbit, Hunter, Apollo, etc.
- **Provider Systems:** Salesforce, HubSpot, Pipedrive webhooks
- **Analytics:** Google Analytics, Segment tracking
- **Alerting:** Slack, PagerDuty for escalations
- **Storage:** PostgreSQL for lead history, Redis for cache

## Security & Compliance

- ✅ Rate-limited Reddit API access
- ✅ PII masking in logs (handle email/phone)
- ✅ Provider data isolation (no cross-provider visibility)
- ✅ Audit trail for all routing decisions
- ✅ GDPR compliance for lead storage retention
