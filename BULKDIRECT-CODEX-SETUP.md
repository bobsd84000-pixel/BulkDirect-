# Codex CLI — General-Purpose Diagnostics

Guide complet d'installation et d'utilisation du CLI Codex généraliste.

## 📋 Overview

Codex est un CLI généraliste (`codex`) qui expose des outils de diagnostic et de vérification d'environnement pour tout projet.

**Statut:** ✅ Ready to use
**Branche:** `claude/codex-claude-review-setup-nih98l`

---

## 🚀 Installation

### 1. Via npm link (développement local)

```bash
npm link
```

Active le CLI globalement avec symlink local. Permet de tester les modifications immédiatement.

### 2. Via package.json (production)

Le `bin` et `scripts` sont définis dans `package.json`:

```json
{
  "bin": {
    "codex": "./bin/codex.js"
  },
  "scripts": {
    "codex:doctor": "node bin/codex.js doctor"
  }
}
```

Merge le contenu de `package-bin-snippet.json` dans votre `package.json`.

---

## 📖 Commandes

### `codex doctor`

Exécute diagnostics complets de l'environnement.

**Vérifie:**
- ✅ Node.js version
- ✅ npm installed
- ✅ Git installed
- ✅ Config directory (~/.codex)
- ✅ Git repository initialized

**Usage:**
```bash
codex doctor
# ou
npm run codex:doctor
```

**Exemple de sortie:**
```
🔍 Codex diagnostics

✅ Node.js version: v22.22.2
✅ npm installed: 10.9.7
✅ Git installed: git version 2.43.0
✅ Config directory: /home/user/.codex
✅ Git repository: Git repo detected

==================================================
✅ All diagnostics passed
```

### `codex --help`

Affiche l'aide et usage disponible.

```bash
codex --help
# ou
codex -h
```

---

## 🔧 Utilisation

### Étape 1: Cloner/Pull la branche

```bash
git fetch origin claude/codex-claude-review-setup-nih98l
git checkout claude/codex-claude-review-setup-nih98l
```

### Étape 2: Installer dépendances

```bash
npm install
```

### Étape 3: Vérifier setup

```bash
npm link
codex doctor
```

Tous les checks doivent être ✅.

### Étape 4: Configuration

Configuration sauvegardée à: `~/.codex/config.json`

Crée automatiquement à première utilisation.

---

## 📁 Structure

```
Project/
├── bin/
│   └── codex.js                # CLI principal
├── package.json                # bin + scripts définis
├── package-bin-snippet.json    # Snippet à merger
└── BULKDIRECT-CODEX-SETUP.md   # Ce fichier
```

---

## 🎯 Workflows

### Développement local

```bash
# Setup
npm install
npm link

# Utiliser
codex doctor
npm run codex:doctor

# Modifier CLI
# ... edit bin/codex.js
codex doctor  # changements appliqués immédiatement
```

### Production / CI-CD

```bash
# Install + link
npm install
npm link

# Vérifier avant déploiement
npm run codex:doctor
```

### Troubleshooting

**CLI non trouvée globalement:**
```bash
npm link
which codex  # devrait afficher le path
```

**Config directory manquante:**
```bash
mkdir -p ~/.codex
npm run codex:doctor
```

**Node version incompatible:**
```bash
node --version  # Devrait être >= 18.0.0
nvm use 22      # Ou switch to compatible version
```

---

## 🔗 Ressources

- **CLI Code:** `bin/bulkdirect-cli.js`
- **Package Snippet:** `package-bin-snippet.json`
- **Codex Plugin:** `packages/codex-plugin-cc/`
- **Git Branch:** `claude/codex-claude-review-setup-nih98l`

---

## ✅ Checklist Intégration

- [ ] Clone/checkout branche `claude/codex-claude-review-setup-nih98l`
- [ ] Run `npm install`
- [ ] Run `npm link`
- [ ] Run `bulkdirect doctor` → all ✅
- [ ] Merge `package-bin-snippet.json` dans `package.json`
- [ ] Commit changes
- [ ] Push vers main
- [ ] Update docs/onboarding avec CLI commands

---

**Next:** Configure automated review checks et hooks Codex pour CI/CD pipeline.
