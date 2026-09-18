# Codex Claude Review Setup

Installation guide pour le plugin Claude review intégré à BulkDirect.

## Installation globale

```bash
npm install -g codex-plugin-cc
```

Ou depuis ce repo:

```bash
npm link packages/codex-plugin-cc
```

## Commandes

### 1. Enable Claude Review

Active la review Claude pour votre projet avec détection de conflits et gates qualité.

```bash
codex-claude-review enable
```

✅ Active:
- Auto code review
- Conflict detection  
- Code quality gates

Configuration sauvegardée à: `~/.codex/claude-review.json`

### 2. Doctor (Diagnostics)

Vérifie que tout est correctement configuré.

```bash
codex-claude-review doctor
```

Valide:
- ✅ Node.js version
- ✅ npm installed
- ✅ Git installed
- ✅ Config directory
- ✅ Claude review enabled
- ✅ Repo initialized

### 3. Help

```bash
codex-claude-review --help
```

## Workflow

1. **Setup initial:**
   ```bash
   npm install -g codex-plugin-cc
   codex-claude-review enable
   codex-claude-review doctor
   ```

2. **Vérifier après mise à jour:**
   ```bash
   codex-claude-review doctor
   ```

3. **Consulter config:**
   ```bash
   cat ~/.codex/claude-review.json
   ```

## Configuration

Le fichier `~/.codex/claude-review.json` contient:

```json
{
  "enabled": true,
  "enabledAt": "2026-09-18T19:48:12.224Z",
  "version": "1.0.0",
  "features": {
    "autoReview": true,
    "conflictDetection": true,
    "codeQualityGates": true
  }
}
```

## Development

Pour tester localement:

```bash
cd packages/codex-plugin-cc
npm link
codex-claude-review doctor
```

Pour utiliser avec npm sans global install:

```bash
npx codex-plugin-cc doctor
```
