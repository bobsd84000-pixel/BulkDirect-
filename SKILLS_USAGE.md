# 📚 Guide complet des Skills BulkDirect

## ⚡ Démarrage rapide

### 1. Installation (première utilisation)
```bash
# Mettre à jour les skills
npm install

# Vérifier la configuration
cat .claude/settings.json
```

### 2. Workflow de base (5 minutes)
```bash
# Étape 1: Traiter les produits (2-3 min)
/bulk-process --batch-size 50

# Étape 2: Analyser les résultats (30 sec)
/data-analyze

# Étape 3: Exporter en CSV (30 sec)
/csv-export

# Étape 4: Vérifier le statut (10 sec)
/batch-status
```

---

## 📖 Documentation détaillée

### `/bulk-process` - Traitement batch

#### Description
Lance le traitement des produits par batch. Charge les produits du CSV, les traite par lot et exporte les résultats enrichis.

#### Syntaxe
```bash
/bulk-process [OPTIONS]
```

#### Options
| Option | Défaut | Description |
|--------|--------|-------------|
| `--batch-size` | 10 | Nombre de produits par batch |
| `--start-index` | 0 | Index de départ |

#### Exemples
```bash
# Traiter 100 produits par batch
/bulk-process --batch-size 100

# Reprendre à partir du produit 500
/bulk-process --start-index 500 --batch-size 50

# Traitement standard
/bulk-process
```

#### Output
```
✅ 1000 produits chargés
🔄 Traitement de 1000 produits...
📊 Taille batch: 10

[10%] Batch 1: 10 produits...
✅ Batch 1 complété
[20%] Batch 2: 10 produits...
✅ Batch 2 complété
...

📊 Résumé du traitement
✅ Produits traités: 1000
❌ Erreurs: 0
📈 Taux de succès: 100.00%

💾 Résultats exportés: ./exports/products-bulk-2024-08-28.json
```

---

### `/data-analyze` - Analyse des données

#### Description
Analyse les données enrichies et génère un rapport statistique.

#### Syntaxe
```bash
/data-analyze [OPTIONS]
```

#### Options
| Option | Défaut | Description |
|--------|--------|-------------|
| `--file` | Dernière export | Chemin du fichier CSV/JSON |
| `--format` | text | Format du rapport (text/json) |

#### Exemples
```bash
# Analyser la dernière export
/data-analyze

# Analyser un fichier spécifique
/data-analyze --file ./exports/products-2024-08-28.json

# Rapport en JSON
/data-analyze --format json > rapport.json

# Analyser un CSV
/data-analyze --file ./data/products-enrichis.csv
```

#### Output
```
📈 Rapport d'Analyse
══════════════════════════════════════════════════════════
✅ Total produits: 1,234
📊 Catégories: 45
💬 Longueur description moyenne: 125 caractères
✨ Taux de complétude: 98.5%
🚨 Anomalies détectées: 3

Premières anomalies:
  • Ligne 42: description trop courte
  • Ligne 567: nom manquant
  • Ligne 891: catégorie invalide
══════════════════════════════════════════════════════════
```

---

### `/csv-export` - Export personnalisé

#### Description
Exporte les données en CSV avec filtres et colonnes personnalisées.

#### Syntaxe
```bash
/csv-export [OPTIONS]
```

#### Options
| Option | Défaut | Description |
|--------|--------|-------------|
| `--columns` | Toutes | Colonnes à exporter (comma-separated) |
| `--filter` | - | Filtrer par condition (ex: status=completed) |
| `--output` | ./exports/products-DATE.csv | Chemin du fichier output |

#### Exemples
```bash
# Exporter toutes les données
/csv-export

# Colonnes spécifiques
/csv-export --columns id,name,description,price

# Filtrer les produits actifs
/csv-export --filter status=active

# Combiné
/csv-export --columns id,name,description --filter category=electronics

# Destination personnalisée
/csv-export --output ./backups/archive-$(date +%Y%m%d).csv
```

#### Output
```
✅ Export créé: ./exports/products-2024-08-28.csv
📄 Lignes: 1,234
💾 Taille: 2.5MB
🔗 Prêt à partager
```

---

### `/batch-status` - État du traitement

#### Description
Affiche l'état du traitement en cours avec progression, temps écoulé et ETA.

#### Syntaxe
```bash
/batch-status [OPTIONS]
```

#### Options
| Option | Défaut | Description |
|--------|--------|-------------|
| `--watch` | false | Surveillance en continu |
| `--interval` | 5 | Intervalle de rafraîchissement (sec) |

#### Exemples
```bash
# Vérifier l'état une fois
/batch-status

# Surveillance continue
/batch-status --watch

# Surveillance rapide (1 sec)
/batch-status --watch --interval 1

# Surveillance lente (30 sec)
/batch-status --watch --interval 30
```

#### Output
```
📊 État du Batch BulkDirect
════════════════════════════════════════════════════════════
Status: 🔄 EN COURS
Produits traités: 234/1000 (23.4%)
Temps écoulé: 00:12:45
ETA: 00:42:15
Erreurs: 0
Logs: ./logs/batch-status.log
════════════════════════════════════════════════════════════

⏰ Rafraîchi: 15:42:30
```

---

## 🎯 Cas d'usage courants

### Cas 1: Traitement quotidien simple
```bash
# Le matin, lancer le traitement
/bulk-process --batch-size 50

# Pendant la journée, surveiller
/batch-status --watch

# En fin de journée, analyser et exporter
/data-analyze
/csv-export
```

### Cas 2: Export sélectif
```bash
# Analyser d'abord
/data-analyze

# Puis exporter uniquement certaines colonnes
/csv-export --columns id,name,description,created_at
```

### Cas 3: Archivage hebdomadaire
```bash
# Exporter et archiver avec date
/csv-export --output ./archives/bulk-direct-$(date +%Y-week-%V).csv

# Analyser pour rapport
/data-analyze --format json > ./reports/stats-$(date +%Y-%m-%d).json
```

### Cas 4: Reprendre après erreur
```bash
# Vérifier l'état
/batch-status

# Reprendre à partir d'un index spécifique
/bulk-process --start-index 500 --batch-size 50

# Ré-exporter après correction
/csv-export
```

---

## 🔗 Workflows chainés

### Automatiser un workflow complet
```bash
# Créer un script wrapper
cat > workflow-daily.sh << 'EOF'
#!/bin/bash

echo "🚀 Démarrage du workflow BulkDirect..."

# 1. Traiter
echo "1️⃣ Traitement en cours..."
/bulk-process --batch-size 50

# 2. Analyser
echo "2️⃣ Analyse en cours..."
/data-analyze

# 3. Exporter
echo "3️⃣ Export en cours..."
/csv-export --columns id,name,description,category,price

# 4. Archiver
echo "4️⃣ Archivage..."
DATE=$(date +%Y-%m-%d)
cp ./exports/products-*.csv ./backups/products-$DATE.csv

echo "✅ Workflow complété!"
EOF

chmod +x workflow-daily.sh
./workflow-daily.sh
```

---

## 📊 Interprétation des résultats

### Taux de succès bas (< 90%)
- Vérifier les erreurs: `/batch-status`
- Analyser les anomalies: `/data-analyze`
- Reprendre le traitement: `/bulk-process --start-index X`

### Longueur description courte (< 50 chars)
- Vérifier la qualité Gemini
- Peut indiquer un timeout ou limitation API

### Taux de complétude bas (< 95%)
- Certains produits manquent des champs
- Exporter avec filtres: `/csv-export --filter status=complete`

---

## 🆘 FAQ et dépannage

**Q: Comment relancer après une interruption?**
```bash
/batch-status
/bulk-process --start-index <index> --batch-size 50
```

**Q: Comment exporter uniquement un sous-ensemble?**
```bash
/csv-export --columns id,name --filter category=electronics
```

**Q: Comment vérifier le log complet?**
```bash
tail -f ./logs/batch-status.log
```

**Q: Comment nettoyer les anciens exports?**
```bash
rm ./exports/products-2024-08-*.json
```

---

## 💾 Archivage

```bash
# Archiver et compresser
tar -czf backups/bulkdirect-$(date +%Y%m%d).tar.gz ./exports

# Nettoyer les anciens fichiers
find ./exports -name "*.json" -mtime +7 -delete
```

---

**Besoin d'aide?** Vérifiez `CLAUDE.md` pour plus de détails.
