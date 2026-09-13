# Migration 0012 - Verification Guide

## Avant de merger PR #10

### 1. Appliquer la migration
```bash
psql -U your_user -d your_database -f supabase/migrations/20260913000000_0012_migration_numbering_conflicts.sql
```

### 2. Exécuter le test de conflit
```bash
psql -U your_user -d your_database -f test-conflict-detection.sql
```

### 3. Vérifier les résultats

Le test doit afficher :

**Étape 1 - Premier insert (pas conflit):**
```
 id | entity_id | predicate | value  | is_conflicted | conflict_with
----+-----------+-----------+--------+---------------+---------------
  1 | company-001 | country | France |     f         |     NULL
```

**Étape 2 - Deuxième insert (conflit détecté):**
```
 id | entity_id | predicate | value   | is_conflicted | conflict_with
----+-----------+-----------+---------+---------------+---------------
  2 | company-001 | country | Germany |     t         |       1
```

**Étape 3 - Table complète:**
```
 id | entity_id | predicate | value   | is_conflicted | conflict_with | created_at
----+-----------+-----------+---------+---------------+---------------+---------------
  1 | company-001 | country | France  |     f         |     NULL      | 2026-09-13...
  2 | company-001 | country | Germany |     t         |       1       | 2026-09-13...
```

**Étape 4 - Vue entity_facts_conflicts (doit montrer 1 ligne):**
```
 id | entity_id | predicate | current_value | conflicting_value | is_conflicted | conflict_with
----+-----------+-----------+---------------+-------------------+---------------+---------------
  2 | company-001 | country | Germany       | France            |     t         |       1
```

### ✅ Checklist

- [ ] Migration appliquée sans erreur
- [ ] Premier insert → `is_conflicted = false`, `conflict_with = NULL`
- [ ] Deuxième insert → `is_conflicted = true`, `conflict_with = 1`
- [ ] Vue `entity_facts_conflicts` affiche 1 ligne avec valeurs correctes
- [ ] Cleanup exécuté (DELETE FROM entity_facts)

### 4. Confirmer

Si tous les tests passent, merger PR #10 ✅
