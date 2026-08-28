# data-analyze

Analyse les données enrichies et génère un rapport.

## Usage

```bash
/data-analyze [--file PATH] [--format json|csv|text]
```

## Options

- `--file PATH` : Chemin du fichier à analyser (défaut: dernière export)
- `--format` : Format du rapport (défaut: text)

## Description

Ce skill analyse:
- 📊 Statistiques des produits
- 🎯 Distribution des catégories
- 💬 Longueur moyenne des descriptions
- ⭐ Qualité des données
- 🚨 Anomalies détectées

## Exemples

```bash
# Analyser la dernière export
/data-analyze

# Analyser un fichier spécifique
/data-analyze --file ./exports/products-2024.csv

# Générer un rapport JSON
/data-analyze --format json
```

## Output

```
📈 Rapport d'Analyse
├─ Total produits: 1,234
├─ Catégories: 45
├─ Description avg: 125 chars
├─ Taux de complétude: 98.5%
└─ Anomalies: 3
```

## Related Skills

- `/bulk-process` - Traiter les données
- `/csv-export` - Exporter les résultats
