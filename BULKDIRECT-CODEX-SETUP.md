# BulkDirect Codex Integration Setup

Guide complet d'installation et d'intégration Codex Claude review pour BulkDirect.

## 📋 Overview

BulkDirect inclut un CLI intégré (`bulkdirect`) qui expose des outils de diagnostic et d'intégration Codex Claude.

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
    "bulkdirect": "./bin/bulkdirect-cli.js"
  },
  "scripts": {
    "bulkdirect:doctor": "node bin/bulkdirect-cli.js doctor"
  }
}
```

Merge le contenu de `package-bin-snippet.json` dans votre `package.json`.

---

## 📖 Commandes

### `bulkdirect doctor`

Exécute diagnostics complets de l'environnement.

**Vérifie:**
- ✅ Node.js version
- ✅ npm installed
- ✅ Git installed
- ✅ Config directory (~/.bulkdirect)
- ✅ BulkDirect repo initialized

**Usage:**
```bash
bulkdirect doctor
# ou
npm run bulkdirect:doctor
```

**Exemple de sortie:**
```
🏥 BulkDirect diagnostics

✅ Node.js version: v22.22.2
✅ npm installed: 10.9.7
✅ Git installed: git version 2.43.0
✅ Config directory: /home/user/.bulkdirect
✅ BulkDirect repo initialized: Git repo detected

==================================================
✅ All diagnostics passed
```

### `bulkdirect --help`

Affiche l'aide et usage disponible.

```bash
bulkdirect --help
# ou
bulkdirect -h
```

---

## 🔧 Intégration Codex

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
bulkdirect doctor
```

Tous les checks doivent être ✅.

### Étape 4: Configuration

Configuration sauvegardée à: `~/.bulkdirect/config.json`

Crée automatiquement à première utilisation.

---

## 📁 Structure

```
BulkDirect/
├── bin/
│   └── bulkdirect-cli.js        # CLI principal
├── package.json                  # bin + scripts définis
├── package-bin-snippet.json      # Snippet à merger
├── CODEX-SETUP.md               # Guide Codex plugin
├── BULKDIRECT-CODEX-SETUP.md   # Ce fichier
└── packages/
    └── codex-plugin-cc/         # Package npm global (optionnel)
        ├── bin/
        ├── package.json
        └── README.md
```

---

## 🎯 Workflows

### Développement local

```bash
# Setup
git checkout claude/codex-claude-review-setup-nih98l
npm install
npm link

# Utiliser
bulkdirect doctor
npm run bulkdirect:doctor

# Modifier CLI
# ... edit bin/bulkdirect-cli.js
bulkdirect doctor  # changements appliqués immédiatement
```

### Production / CI-CD

```bash
# Merge vers main
git merge claude/codex-claude-review-setup-nih98l

# Install + link
npm install
npm link

# Vérifier avant déploiement
npm run bulkdirect:doctor
```

### Troubleshooting

**CLI non trouvée globalement:**
```bash
npm link
which bulkdirect  # devrait afficher le path
```

**Config directory manquante:**
```bash
mkdir -p ~/.bulkdirect
npm run bulkdirect:doctor
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
