# MCP Servers Reference

External integrations that extend Claude's capabilities.

## Available MCP Servers

### Context7 (Documentation)
Fetch current docs for libraries, frameworks, APIs.

**Setup:**
```json
{
  "name": "context7",
  "type": "mcp",
  "capabilities": ["fetch-docs", "api-reference"]
}
```

**Best for:**
- React, Next.js, Node.js docs
- Framework version migration
- API syntax lookup
- CLI tool usage

**Example:** `"search React 18 hooks patterns"`

---

### Playwright (Frontend Testing)
Browser automation and E2E testing.

**Setup:**
```json
{
  "name": "playwright",
  "type": "mcp",
  "capabilities": ["browser-automation", "screenshot", "test-generation"]
}
```

**Best for:**
- E2E test writing
- Visual regression detection
- Component interaction testing
- Cross-browser compatibility

**Example:** `"create Playwright test for checkout flow"`

---

### GitHub MCP
Read/write GitHub issues, PRs, workflows.

**Setup:**
```json
{
  "name": "github",
  "type": "mcp",
  "capabilities": ["issues", "pull-requests", "workflows"]
}
```

**Best for:**
- PR reviews and comments
- Issue automation
- CI/CD workflow inspection
- Release management

---

### Supabase (Database)
Manage PostgreSQL, auth, edge functions.

**Setup:**
```json
{
  "name": "supabase",
  "type": "mcp",
  "capabilities": ["sql-execution", "migrations", "edge-functions"]
}
```

**Best for:**
- Schema inspection
- Migration generation
- Real-time database queries
- Edge function deployment

---

## Recommended for BulkDirect

1. **Context7** - Docs lookup (React, Node, SaaS patterns)
2. **GitHub** - PR automation, workflow inspection

