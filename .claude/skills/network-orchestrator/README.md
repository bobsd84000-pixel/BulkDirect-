# Network Orchestrator Skill

Orchestrate parallel network operations (diagnosis, validation, testing, deployment) with team-kanban workflow and merge gates.

## Quick Start

1. Copy `work-queue.example.json` → `work-queue.json` in your project
2. Define your work cards with acceptance criteria
3. Assign agents to cards (parallel, isolated scopes)
4. Track state: backlog → ready → running → review → merged
5. Merge gate blocks on any boolean failure

## Core Pattern

- **Work Queue**: JSON cards with owner + acceptance criteria
- **Agents**: Parallel execution, no overlapping writes
- **State Machine**: backlog → ready → running → review → merged
- **Merge Gate**: Boolean checks, fail-closed (one false = blocked)
- **Handoff**: Readable output per agent, timestamped

## Example Flow

```
Card 1: bgp-agent → BGP convergence baseline (ready)
Card 2: config-validator → Linting (running, parallel)
Card 3: health-check → Health baseline (ready, parallel)
Card 4: test-agent → Dry-run convergence (backlog)
Card 5: deploy-agent → Execute change + verify (backlog)
```

## Merge Gate

All checks must pass before merging:
```json
{
  "tests_pass": true,
  "no_dangerous_commands": true,
  "config_validation_score": 0.98,
  "change_window_approved": true,
  "rollback_commands_ready": true,
  "integrator_sign_off": false  ← Blocks merge
}
```

## Full Reference

See `SKILL.md` for complete documentation.
