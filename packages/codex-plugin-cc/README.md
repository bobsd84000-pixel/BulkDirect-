# Codex Plugin CC

Codex Claude review setup and diagnostics for BulkDirect.

## Installation

```bash
npm install -g codex-plugin-cc
```

## Usage

### Enable Claude Review

```bash
codex-claude-review enable
```

Activates Claude code review with:
- ✅ Auto code review
- ✅ Conflict detection
- ✅ Code quality gates

### Run Diagnostics

```bash
codex-claude-review doctor
```

Checks:
- Node.js version
- npm installed
- Git installed
- Config directory
- Claude review enabled
- Repo initialized

### Help

```bash
codex-claude-review --help
```

## Configuration

Configuration saved to: `~/.codex/claude-review.json`

```json
{
  "enabled": true,
  "enabledAt": "2026-09-18T19:47:00.000Z",
  "version": "1.0.0",
  "features": {
    "autoReview": true,
    "conflictDetection": true,
    "codeQualityGates": true
  }
}
```

## License

MIT
