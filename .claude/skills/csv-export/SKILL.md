# csv-export

Exporte les données dans un format CSV personnalisé.

## Usage

```bash
/csv-export [--columns NAME1,NAME2] [--filter FIELD=VALUE]
```

## Options

- `--columns` : Colonnes à exporter (défaut: toutes)
- `--filter` : Filtrer par champ (ex: status=completed)
- `--output` : Chemin du fichier (défaut: ./exports/products-TIMESTAMP.csv)

## Description

Ce skill:
1. Charge les données enrichies
2. Filtre selon les critères
3. Sélectionne les colonnes
4. Exporte en CSV
5. Compresse optionnellement

## Exemples

```bash
# Exporter toutes les colonnes
/csv-export

# Exporter colonnes spécifiques
/csv-export --columns id,name,description,category

# Exporter uniquement les produits complétés
/csv-export --filter status=completed

# Exporter et compresser
/csv-export --output ./backups/products.csv.gz
```

## Output

```
✅ Export créé: ./exports/products-2024-08-28.csv
📄 Lignes: 1,234
💾 Taille: 2.5MB
🔗 Prêt à partager
```

## Related Skills

- `/bulk-process` - Traiter les données
- `/data-analyze` - Analyser les résultats
