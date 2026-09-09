# Network Orchestrator Skill Reference

## Overview

A system for coordinating parallel network operations across multiple isolated agents with:
- Distributed work queue (JSON-based)
- State machine (backlog → ready → running → review → merged)
- Merge gate (fail-closed boolean checks)
- Timestamped handoff between agents
- No overlapping writes (single owner per card)

---

## Work Queue Schema

```json
{
  "project": "string (project identifier)",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "cards": [
    {
      "id": "string (unique card ID)",
      "title": "string (brief description)",
      "owner": "string (agent name)",
      "state": "backlog|ready|running|review|merged",
      "priority": "number (1-5, higher = urgent)",
      "acceptance_criteria": [
        "criteria 1",
        "criteria 2"
      ],
      "output": "string (agent writes results here)",
      "output_timestamp": "ISO 8601 timestamp",
      "blocks": ["string (IDs of cards blocked by this one)"],
      "blocked_by": ["string (IDs of cards blocking this one)"]
    }
  ],
  "merge_gate": {
    "tests_pass": "boolean",
    "no_dangerous_commands": "boolean",
    "config_validation_score": "number (0-1)",
    "change_window_approved": "boolean",
    "rollback_commands_ready": "boolean",
    "integrator_sign_off": "boolean"
  }
}
```

---

## State Machine

### Backlog
- Card created, not ready for work
- Owner undefined or blocked by dependencies
- Transition to: ready (dependencies resolved)

### Ready
- Card prepared, awaiting execution
- Owner assigned, dependencies clear
- Transition to: running (start work) or backlog (new blocker)

### Running
- Card in progress
- Owner executing acceptance criteria
- Transition to: review (criteria met) or backlog (failure, retry)

### Review
- Work done, pending validation
- Accepts agent output and timestamp
- Transition to: merged (gate passes) or running (gate fails)

### Merged
- Work validated and committed
- Final state, read-only
- Next card unblocks if this was a dependency

---

## Agent Responsibilities

### When Assigned a Card

1. **Check blockers**: Verify `blocked_by` is empty
2. **Read acceptance criteria**: Understand what "done" means
3. **Execute**: Perform the work
4. **Write output**: Update `output` field with results
5. **Set timestamp**: Update `output_timestamp` (ISO 8601)
6. **Move state**: Transition to "review" when complete

### Output Format

- **Structured**: JSON (for dashboards, parsing)
- **Human-readable**: Plain text (for logs, debugging)
- **Timestamped**: ISO 8601 format (UTC)
- **Idempotent**: Safe to re-run (same input → same output)

### No Overlapping Writes

- Only the owner writes to a card's `output` field
- Multiple agents can read all cards
- Use `blocked_by`/`blocks` for sequencing
- Parallel cards have no shared state

---

## Merge Gate

All conditions must pass for merge:

| Gate | Type | Meaning | Fail Behavior |
|------|------|---------|---------------|
| `tests_pass` | boolean | All tests green | Blocks merge |
| `no_dangerous_commands` | boolean | No rm -rf, force-push, etc. | Blocks merge |
| `config_validation_score` | number | Config quality (0-1) | Blocks if < threshold |
| `change_window_approved` | boolean | Maintenance window OK | Blocks merge |
| `rollback_commands_ready` | boolean | Rollback plan exists | Blocks merge |
| `integrator_sign_off` | boolean | Human approval | Blocks merge |

**Fail-Closed**: One false → merge blocked. All true → merge allowed.

---

## Example: BGP Convergence Change

```json
{
  "project": "bgp-route-optimization",
  "cards": [
    {
      "id": "bgp-1",
      "title": "Baseline BGP convergence metrics",
      "owner": "bgp-agent",
      "state": "running",
      "priority": 5,
      "acceptance_criteria": [
        "Measure time to BGP convergence in current state",
        "Record per-router convergence deltas",
        "Store baseline in work-queue output"
      ],
      "output": "Baseline convergence time: 4.2s, delta per router: [0.1s, 0.15s, 0.08s]",
      "output_timestamp": "2025-09-09T14:32:00Z",
      "blocks": ["bgp-4"]
    },
    {
      "id": "bgp-2",
      "title": "Validate BGP config syntax",
      "owner": "config-validator",
      "state": "ready",
      "priority": 5,
      "acceptance_criteria": [
        "Lint BGP config against RFC 4271",
        "Check for duplicate RDs, ASNs",
        "Confirm no deprecated syntax"
      ],
      "blocks": ["bgp-4"]
    },
    {
      "id": "bgp-3",
      "title": "Health check baseline",
      "owner": "health-check",
      "state": "ready",
      "priority": 4,
      "acceptance_criteria": [
        "Verify all peers are up",
        "Confirm no route flaps in last 5min",
        "Log interface stats"
      ],
      "blocks": ["bgp-4"]
    },
    {
      "id": "bgp-4",
      "title": "Dry-run convergence test",
      "owner": "test-agent",
      "state": "backlog",
      "priority": 5,
      "acceptance_criteria": [
        "Apply config in test environment",
        "Measure new convergence time",
        "Verify improvement over baseline",
        "No regressions on other prefixes"
      ],
      "blocked_by": ["bgp-1", "bgp-2", "bgp-3"]
    },
    {
      "id": "bgp-5",
      "title": "Deploy to production + verify",
      "owner": "deploy-agent",
      "state": "backlog",
      "priority": 5,
      "acceptance_criteria": [
        "Execute during change window",
        "Monitor convergence in real time",
        "Confirm no flaps or unintended withdrawals",
        "Ready rollback if needed"
      ],
      "blocked_by": ["bgp-4"],
      "blocks": []
    }
  ],
  "merge_gate": {
    "tests_pass": false,
    "no_dangerous_commands": true,
    "config_validation_score": 0.95,
    "change_window_approved": true,
    "rollback_commands_ready": true,
    "integrator_sign_off": false
  }
}
```

---

## Usage Patterns

### Pattern 1: Sequential with Merge Gate

```
Card 1 → Card 2 → Card 3 → Merge Gate → Deploy
```

### Pattern 2: Parallel Validation

```
Card 1 (BGP baseline)
  ├─ Card 2 (config validation) [parallel]
  ├─ Card 3 (health check) [parallel]
  └─→ Card 4 (dry-run test) [sequential, after 1+2+3]
      └─→ Card 5 (deploy) [sequential, after 4]
```

### Pattern 3: Multi-Team Workflow

```
Network Team:  Card 1 → Card 2 → Card 3
Security Team:                     Card 4 (parallel)
DevOps Team:                               Card 5
Integrator:                                      ↓ Merge Gate ↓ Deploy
```

---

## Integration with Claude Code

### Invoke from /adhd or /loop

```
/loop 5m network-orchestrator <work-queue.json>
```

### Agents Read/Write

```bash
# Read current state
cat work-queue.json | jq '.cards[] | select(.state == "ready")'

# Update state after execution
jq '.cards[0].state = "review" | .cards[0].output = "..." | .cards[0].output_timestamp = "..."' work-queue.json > work-queue.tmp
mv work-queue.tmp work-queue.json
```

### Monitoring

```bash
# See all running cards
jq '.cards[] | select(.state == "running")' work-queue.json

# Check merge gate
jq '.merge_gate' work-queue.json

# See blockers
jq '.cards[] | select(.blocked_by | length > 0)' work-queue.json
```

---

## Best Practices

1. **One owner per card**: No concurrent writes
2. **Clear criteria**: Acceptance criteria must be testable
3. **Idempotent operations**: Re-running should be safe
4. **Timestamped output**: All agent writes include ISO 8601 UTC
5. **Atomic transitions**: One agent moves state, one field update per transition
6. **Block dependencies**: Use `blocked_by`/`blocks` for DAG, not ad-hoc sequencing
7. **Readable output**: Include enough detail for auditing and rollback

---

## Troubleshooting

### Card Stuck in "Running"

- Check agent logs for errors
- Verify acceptance criteria are achievable
- Look for deadlock: circular `blocked_by` references

### Merge Gate Always Fails

- Identify the false gate check
- Fix root cause (failing test, missing approval, etc.)
- Don't suppress gates — make work pass them

### Agent Writes Conflict

- Verify only one owner per card
- Use `jq` locking if needed (atomic JSON writes)
- Stash conflicting writes as notes, resolve manually

---

## Files

- `SKILL.md`: This file (reference)
- `README.md`: Quick start guide
- `work-queue.example.json`: Template to copy and customize
