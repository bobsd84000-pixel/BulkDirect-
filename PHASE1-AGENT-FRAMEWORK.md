# Phase 1: Agent Framework Implementation

## Overview

Phase 1 establishes the foundational Agent Framework for Agent Scout Reddit. This includes:

- **Agent Base Class** - Core agent lifecycle, message handling, and metrics
- **Swarm Manager** - Orchestrates agent startup, shutdown, and communication
- **Message Queue** - Async message processing with retry logic
- **Health Monitoring** - Agent health checks and system metrics
- **Error Handling** - Graceful failures and retry strategies

## Architecture

```
┌─────────────────────────────────────────────┐
│        SwarmManager                         │
│  (Startup, Health, Metrics, Communication) │
└────────────┬────────────┬────────────┬──────┘
             │            │            │
      ┌──────▼──┐  ┌──────▼──┐  ┌────▼─────┐
      │  Agent  │  │  Agent  │  │  Agent   │
      │ Base    │  │ Base    │  │ Base     │
      └─────────┘  └─────────┘  └──────────┘
```

## Key Components

### 1. Agent Base Class (`lib/agent-base.js`)

The foundation for all agents (Scout, Qualifier, Router, Orchestrator).

**Key Features:**
- Async message processing with queue
- Retry logic with exponential backoff
- Timeout handling
- Event emission for lifecycle events
- Metrics tracking (latency, success rate, etc.)
- Health status reporting

**Usage:**
```javascript
const Agent = require('./lib/agent-base');

class MyAgent extends Agent {
  constructor(config) {
    super(config);
    this.type = 'custom';
  }

  async process(message) {
    // Handle message
    return { success: true, result: '...' };
  }
}

const agent = new MyAgent({ name: 'MyAgent', timeout: 30000 });
await agent.initialize();
await agent.handle({ id: 'msg1', payload: '...' });
```

### 2. Swarm Manager (`lib/swarm-manager.js`)

Manages multiple agents as a coordinated swarm.

**Key Features:**
- Agent registration and lifecycle
- Message routing between agents
- Broadcasting to agent types
- Health checks on intervals
- Metrics aggregation
- Event forwarding from agents

**Usage:**
```javascript
const SwarmManager = require('./lib/swarm-manager');

const swarm = new SwarmManager({ name: 'MySwarm' });
swarm.registerAgent(agent1);
swarm.registerAgent(agent2);

await swarm.start();
await swarm.broadcast('scout', { type: 'test', payload: '...' });
await swarm.stop();
```

### 3. Configuration (`config/agents.yaml`)

Central configuration for all agents, providers, and integrations.

**Sections:**
- `agents.*` - Per-agent configuration (timeout, retries, concurrency)
- `swarm` - Swarm-level settings (health check interval, log level)
- `providers` - Service provider routing targets
- `reddit` - Reddit API credentials and settings
- `enrichment` - Third-party APIs for company data
- `database` - PostgreSQL connection settings
- `redis` - Cache and rate limiting
- `monitoring` - Datadog/alerting configuration
- `features` - Feature flags

## Implementation Checklist

### Core Framework (Week 1)

- ✅ Agent Base class with lifecycle management
- ✅ SwarmManager for multi-agent coordination
- ✅ Message queue with async processing
- ✅ Retry logic with exponential backoff
- ✅ Health check mechanism
- ✅ Metrics collection and aggregation
- ✅ Event emission for all lifecycle events
- ✅ Graceful shutdown handling

### Testing (Week 1)

- ✅ Unit tests for Agent Base (20+ test cases)
  - Initialization
  - Message handling & queueing
  - Error handling & retries
  - Metrics tracking
  - Health status
  - State management

- ✅ Unit tests for SwarmManager (15+ test cases)
  - Agent registration
  - Swarm lifecycle (start/stop)
  - Message broadcasting
  - Inter-agent communication
  - Health checks
  - Metrics collection

### Configuration (Week 1)

- ✅ Agent configuration schema (agents.yaml)
- ✅ Environment variable template (.env.example)
- ✅ Provider routing configuration
- ✅ API credential placeholders
- ✅ Monitoring & alerting setup

### Examples & Documentation (Week 1)

- ✅ Basic swarm example (examples/basic-swarm.js)
- ✅ Framework documentation
- ✅ API reference
- ✅ Configuration guide

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/agents/agent-base.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Example Usage

See `examples/basic-swarm.js` for a complete working example:

```bash
node examples/basic-swarm.js
```

This demonstrates:
- Creating custom agent classes
- Registering agents with SwarmManager
- Sending messages between agents
- Broadcasting to agent types
- Monitoring health and metrics

## File Structure

```
BulkDirect-/
├── lib/
│   ├── agent-base.js          # Core Agent class
│   └── swarm-manager.js       # Swarm coordination
├── config/
│   └── agents.yaml            # Agent & provider configuration
├── tests/
│   └── agents/
│       ├── agent-base.test.js
│       └── swarm-manager.test.js
├── examples/
│   └── basic-swarm.js
├── .env.example               # Environment configuration
└── PHASE1-AGENT-FRAMEWORK.md  # This file
```

## Key Concepts

### Message Flow

```
1. External Source → Agent.handle(message)
2. Message queued in Agent.queue
3. processQueue() starts (if not running)
4. For each message:
   a. Call agent.process(message)
   b. Emit 'message:processed' or 'message:error'
   c. Retry on error (up to maxRetries)
   d. Emit 'message:failed' if exhausted
5. SwarmManager forwards events to listeners
```

### Retry Strategy

- **Default:** 3 retries with exponential backoff
- **Backoff:** 1s, 2s, 4s (configurable)
- **Timeout:** 30s per message (configurable per agent)
- **Events:** `message:error`, `message:failed`

### Health Checks

Every `healthCheckInterval` (default 5s):
- Check agent uptime
- Detect stuck agents (processing > 60s)
- Aggregate metrics
- Emit `health:check` event

### Metrics Tracked

**Per Agent:**
- `messagesProcessed` - Total messages handled
- `messagesFailed` - Failed messages
- `successRate` - (processed / total)
- `avgLatency` - Average processing time
- `lastError` - Last error message

**Aggregate:**
- `totalMessages` - Swarm-wide total
- `totalErrors` - Swarm-wide failures
- `avgSuccessRate` - Across all agents
- `avgLatency` - Across all agents

## Next Steps

Once Phase 1 is complete and tested:

1. **Phase 2:** Implement Scout Agent (Reddit API integration)
2. **Phase 3:** Implement Qualifier Agent (company enrichment)
3. **Phase 4:** Implement Router Agent (provider matching)
4. **Phase 5:** Implement Orchestrator Agent (swarm coordination)
5. **Phase 6:** Deploy and monitor

## Troubleshooting

### Tests Failing

1. Ensure Node.js 18+ is installed
2. Install dependencies: `npm install`
3. Check for error messages in test output
4. Run single test: `npm test -- tests/agents/agent-base.test.js`

### Agent Not Processing Messages

1. Verify agent initialized: `await agent.initialize()`
2. Check message queue: `console.log(agent.queue)`
3. Check logs: `logLevel: 'debug'`
4. Verify no timeout errors in metrics

### Swarm Not Starting

1. Ensure all agents are registered before `swarm.start()`
2. Check agent initialization errors
3. Verify configuration in agents.yaml
4. Check environment variables in .env

## References

- [Agent Scout Reddit Architecture](./agent-scout-reddit/docs/ARCHITECTURE.md)
- [Development Skill](./skills/agent-scout-reddit/SKILL.md)
- [ECC Agent Patterns](./agents/)
