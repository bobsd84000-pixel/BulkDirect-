# batch-status

Vérifie l'état du traitement en cours et les résultats.

## Usage

```bash
/batch-status [--watch] [--interval SECONDS]
```

## Options

- `--watch` : Mode surveillance en continu
- `--interval` : Intervalle de rafraîchissement (défaut: 5s)

## Description

Ce skill affiche:
- 🔄 État du batch actuel
- ✅ Produits traités
- ⏳ Produits en attente
- ❌ Erreurs rencontrées
- ⏱️ Temps écoulé
- 📊 ETA de completion

## Exemples

```bash
# Vérifier l'état actuel
/batch-status

# Surveiller en continu (mode watch)
/batch-status --watch

# Surveiller avec intervalle personnalisé
/batch-status --watch --interval 10
```

## Output

```
📊 État du Batch
├─ Status: EN COURS
├─ Produits traités: 234/1000 (23%)
├─ Temps écoulé: 12m 45s
├─ ETA: 42m 15s
├─ Erreurs: 2 ⚠️
└─ Logs: ./logs/batch-2024-08-28.log
```

## Related Skills

- `/bulk-process` - Lancer le traitement
- `/data-analyze` - Analyser les résultats
