# Plugins Reference

Installed Claude plugins extend the agent's capabilities.

## Plugin Structure

```json
{
  "name": "plugin-name",
  "description": "What this plugin does",
  "version": "1.0.0",
  "author": {
    "name": "Author Name",
    "email": "email@example.com"
  },
  "capabilities": ["skill-recommendation", "codebase-analysis"],
  "triggers": ["on-session-start", "manual-invocation"]
}
```

---

## Official Plugins

### Claude Code Setup
**Name:** `claude-code-setup`  
**Purpose:** Analyze codebases and recommend automations  
**Triggers:** Manual (`/setup-claude-code`)  
**Capabilities:**
- Detect project type (React, Node, etc.)
- Recommend MCP servers
- Suggest skills for your workflow
- Propose hooks for automation
- Identify subagent needs

---

### Brand Guidelines
**Name:** `bulkdirect-brand-guidelines`  
**Purpose:** Apply BulkDirect brand identity  
**Triggers:** Manual or on design tasks  
**Capabilities:**
- Color palette enforcement (Cyan, Dark Navy, Red)
- Typography rules (Inter font family)
- Button/component patterns
- Accessibility checks (WCAG AA)

---

### Frontend UI Engineering
**Name:** `frontend-ui-engineering`  
**Purpose:** Build production-quality UIs  
**Triggers:** Manual (`/frontend-ui-engineering`)  
**Capabilities:**
- Component scaffolding
- Responsive design
- State management
- Accessibility validation
- Dark mode support

---

## Installation

**Via CLI:**
```bash
claude plugin install claude-code-setup
```

**Via Settings:**
Claude Code → Settings → Plugins → Install

---

## Recommended for BulkDirect

1. **claude-code-setup** - Project optimization
2. **bulkdirect-brand-guidelines** - Design consistency
3. **frontend-ui-engineering** - React component quality

