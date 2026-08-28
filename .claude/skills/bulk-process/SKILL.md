# bulk-process

Lance le traitement en batch des produits avec Gemini.

## Usage

```bash
/bulk-process [--batch-size N] [--start-index N]
```

## Options

- `--batch-size N` : Taille du batch (défaut: 10)
- `--start-index N` : Index de départ (défaut: 0)

## Description

Ce skill:
1. Charge les produits du CSV
2. Les traite par batches
3. Appelle `/api/describe-products` pour chaque batch
4. Agrège les résultats
5. Exporte le résultat enrichi

## Exemples

```bash
# Traiter les 30 premiers produits
/bulk-process --batch-size 10 --start-index 0

# Traiter 50 produits par batch
/bulk-process --batch-size 50
```

## Output

Affiche:
- ✅ Produits chargés
- 🔄 Progression du traitement
- 📊 Résumé des résultats
- 💾 Fichier d'export

## Related Skills

- `/data-analyze` - Analyser les résultats
- `/csv-export` - Exporter en CSV personnalisé
