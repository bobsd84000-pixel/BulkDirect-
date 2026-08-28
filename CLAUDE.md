# 🚀 BulkDirect - Documentation pour Claude Code

Système d'automatisation intelligente du traitement batch de produits avec Gemini.

## Vue d'ensemble

BulkDirect est un projet d'ingénierie qui:
- 📦 Charge des produits en batch
- 🤖 Génère des descriptions avec Gemini
- 📊 Analyse les données enrichies
- 💾 Exporte en CSV personnalisé

## 🎯 Skills personnalisés disponibles

### 1. `/bulk-process`
Lance le traitement batch des produits.

```bash
# Traiter les 30 premiers produits
/bulk-process --batch-size 10

# Traiter 50 produits à la fois
/bulk-process --batch-size 50 --start-index 0
```

**Output:**
- ✅ Produits chargés et traités
- 📊 Taux de succès
- 💾 JSON enrichi exporté

---

### 2. `/data-analyze`
Analyse les résultats et génère un rapport.

```bash
# Analyser la dernière export
/data-analyze

# Analyser un fichier spécifique
/data-analyze --file ./exports/products-2024.csv

# Format JSON
/data-analyze --format json
```

**Statistiques:**
- 📈 Total de produits
- 📊 Distribution des catégories
- 💬 Longueur moyenne des descriptions
- ✨ Taux de complétude
- 🚨 Anomalies détectées

---

### 3. `/csv-export`
Exporte les données en CSV personnalisé.

```bash
# Exporter toutes les colonnes
/csv-export

# Colonnes spécifiques
/csv-export --columns id,name,description,category

# Filtrer les données
/csv-export --filter status=completed

# Personnaliser l'output
/csv-export --output ./backups/archive.csv
```

---

### 4. `/batch-status`
Vérifie l'état du traitement en temps réel.

```bash
# Vérifier l'état une fois
/batch-status

# Mode surveillance continu
/batch-status --watch

# Intervalle personnalisé
/batch-status --watch --interval 10
```

**Affiche:**
- 🔄 État actuel
- ✅ Produits traités / Total
- ⏱️ Temps écoulé
- 📈 ETA de completion
- ❌ Erreurs

---

## 🔄 Workflows recommandés

### Workflow quotidien complet
```bash
# 1. Traiter les produits
/bulk-process --batch-size 50

# 2. Analyser les résultats
/data-analyze

# 3. Exporter en CSV
/csv-export --columns id,name,description,category

# 4. Vérifier le résumé
/batch-status
```

### Workflow rapide
```bash
# Vérifier en surveillance
/batch-status --watch

# Et analyser en parallèle
/data-analyze
```

---

## 📁 Structure du projet

```
BulkDirect-/
├── .claude/
│   ├── settings.json              ← Configuration globale
│   └── skills/
│       ├── bulk-process/
│       │   ├── SKILL.md
│       │   └── index.js
│       ├── data-analyze/
│       ├── csv-export/
│       └── batch-status/
├── data/
│   └── products.csv               ← Input (produits)
├── exports/                       ← CSV/JSON enrichis
├── logs/                          ← Logs du traitement
├── api/
│   ├── describe-products.js
│   ├── analyze.js
│   └── ...
├── src/
├── batch-processor.js
└── CLAUDE.md                      ← Ce fichier
```

---

## 🔧 Configuration

### Permissions
Les skills ont accès à:
- **Read:** `./data/*`, `./exports/*`, `./logs/*`
- **Write:** `./exports/*`, `./logs/*`, `./backups/*`
- **Execute:** `node`, `bash`

### Variables d'environnement
```bash
NODE_ENV=production
LOG_LEVEL=info
DATA_DIR=./data
EXPORT_DIR=./exports
```

---

## 💡 Tips pour votre travail quotidien

1. **Avant de traiter:** Vérifiez avec `/batch-status`
2. **Pendant le traitement:** Surveillez avec `/batch-status --watch`
3. **Après le traitement:** Analysez avec `/data-analyze`
4. **Pour l'export:** Personnalisez avec `/csv-export --columns`
5. **Pour archiver:** Utilisez `/csv-export --output ./backups/`

---

## 📊 Métriques utiles

- **Taux de succès:** `processed / total * 100`
- **Longueur moyenne:** `total chars / total products`
- **Taux de complétude:** `complete items / total * 100`
- **Erreurs:** Anomalies détectées et loggées

---

## 🆘 Dépannage

### "Aucune donnée à analyser"
```bash
# D'abord traiter les produits
/bulk-process

# Puis analyser
/data-analyze
```

### "Fichier source non trouvé"
```bash
# Vérifier l'état
/batch-status

# Ou traiter manuellement
/bulk-process --start-index 0
```

### "Permissions denied"
Vérifier la configuration `.claude/settings.json`.

---

## 🚀 Prochaines étapes

- [ ] Créer des hooks automatisés
- [ ] Ajouter des notifications
- [ ] Intégrer avec votre CI/CD
- [ ] Créer des rapports planifiés
- [ ] Ajouter des alertes d'erreurs

---

**Créé avec ❤️ pour BulkDirect**
Dernière mise à jour: 2024-08-28
