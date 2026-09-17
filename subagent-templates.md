# Subagent Templates

Specialized agents for dedicated review and analysis tasks.

## Subagent Types

### Code Review Agent
**Purpose:** Independent code review for bugs and optimization  
**When to use:** PR reviews, architectural validation  
**Specialization:** Bug detection, performance, security

**Template:**
```
Agent spawn:
  type: code-reviewer
  prompt: "Review this PR for security issues and performance"
  isolation: worktree
```

**Output:**
- Line-by-line findings
- Severity levels (high/medium/low)
- Fix suggestions
- Test impact analysis

---

### Security Review Agent
**Purpose:** Dedicated security auditing  
**When to use:** Sensitive features, authentication flows, data handling  
**Specialization:** OWASP top 10, encryption, auth patterns

**Template:**
```
Agent spawn:
  type: security-reviewer
  prompt: "Audit the payment flow for vulnerabilities"
  isolation: worktree
```

**Output:**
- Vulnerability assessment
- Risk ratings
- Mitigation strategies
- Compliance check

---

### Performance Agent
**Purpose:** Performance analysis and optimization  
**When to use:** Slow queries, bundle size, rendering performance  
**Specialization:** Profiling, bottleneck detection, optimization

**Template:**
```
Agent spawn:
  type: performance-analyzer
  prompt: "Profile the dashboard load time and identify bottlenecks"
  isolation: worktree
```

**Output:**
- Performance metrics
- Bottleneck identification
- Optimization recommendations
- Before/after estimates

---

### Accessibility Agent
**Purpose:** WCAG compliance and inclusive design review  
**When to use:** UI components, form validation, keyboard navigation  
**Specialization:** A11y standards, screen reader compatibility, color contrast

**Template:**
```
Agent spawn:
  type: accessibility-reviewer
  prompt: "Check the form component for WCAG AA compliance"
  isolation: worktree
```

**Output:**
- Accessibility violations
- WCAG level (A/AA/AAA)
- Remediation guidance
- Testing checklist

---

### Explore Agent
**Purpose:** Fast codebase search and pattern discovery  
**When to use:** "Where is X defined?", "Which files reference Y?"  
**Specialization:** Pattern matching, cross-file analysis, architecture discovery

**Template:**
```
Agent spawn:
  type: explore
  prompt: "Find all API endpoints and their auth middleware"
  isolation: read-only
  breadth: medium
```

**Output:**
- File locations
- Pattern instances
- Relationships
- Architecture summary

---

## Recommended for BulkDirect

1. **Code Review Agent** - PR automation
2. **Security Review Agent** - Lead validation features
3. **Performance Agent** - Dashboard optimization
4. **Accessibility Agent** - WCAG compliance (B2B requirement)

## Usage Patterns

### PR Review Workflow
```
1. User creates PR
2. Spawn code-review agent (architecture, bugs)
3. Spawn security agent (B2B lead data)
4. Merge if both pass, iterate if issues found
```

### Feature Development
```
1. Draft feature
2. Spawn explore agent (similar patterns)
3. Spawn accessibility agent (form accessibility)
4. Spawn performance agent (load impact)
5. Iterate based on findings
```

## Integration with Hooks

Subagents can be triggered automatically:
```json
{
  "event": "pull-request-created",
  "trigger": "subagent",
  "agents": ["code-reviewer", "security-reviewer"]
}
```

