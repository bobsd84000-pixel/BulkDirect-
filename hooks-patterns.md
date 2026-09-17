# Claude Code Hooks Patterns

Automated actions that execute on events during development.

## Common Hooks

### Auto-Format (session-start)
Runs formatters on file save or session start.

**Pattern:**
```json
{
  "event": "session-start",
  "hook": "format",
  "files": ["src/**/*.ts", "src/**/*.tsx"],
  "command": "prettier --write"
}
```

**Use case:** Enforce consistent code style without manual runs.

---

### Auto-Lint (pre-commit)
Validates code before commits.

**Pattern:**
```json
{
  "event": "pre-commit",
  "hook": "lint",
  "files": ["**/*.ts", "**/*.tsx"],
  "command": "eslint --fix"
}
```

**Use case:** Catch issues early, block bad commits.

---

### Block Sensitive Files (pre-commit)
Prevents accidental secrets/credentials commits.

**Pattern:**
```json
{
  "event": "pre-commit",
  "hook": "block-sensitive",
  "patterns": [".env", "*.key", "secrets.json"],
  "action": "reject"
}
```

**Use case:** Security gate on commit.

---

### Run Tests (post-save)
Auto-run tests when files change.

**Pattern:**
```json
{
  "event": "post-save",
  "hook": "test",
  "watch": ["src/**/*.test.ts"],
  "command": "npm test -- --related-files"
}
```

**Use case:** Fast feedback loop during development.

---

## Recommended for BulkDirect

1. **Auto-format** (Prettier/ESLint) - Enforce consistency
2. **Block .env files** - Protect API keys
3. **Lint on save** - Catch errors early

