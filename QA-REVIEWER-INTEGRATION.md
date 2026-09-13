# QA Reviewer Integration — Migration 0012

## Vue entity_facts_conflicts pour flaggage automatique

### 1. Vérifier la migration en prod

```bash
# Depuis Supabase Studio:
# - Database → Migrations → Vérifier 20260913000000_0012_migration_numbering_conflicts.sql

# Ou via SQL directement:
psql -U postgres -d postgres -h your-supabase.postgres.supabase.co -f verify-prod-migration.sql
```

Expected output:
- ✅ Table `entity_facts` existe
- ✅ Colonnes: id, entity_id, predicate, value, created_at, is_conflicted, conflict_with
- ✅ Trigger `trg_detect_fact_conflicts` existe
- ✅ Vue `entity_facts_conflicts` existe
- ✅ 3 index de performance

### 2. Intégrer QA Reviewer Workflow

Le QA Reviewer peut maintenant:

```sql
-- Afficher TOUS les conflits détectés dans les 30j
SELECT * FROM entity_facts_conflicts ORDER BY created_at DESC;

-- Filtrer par entité
SELECT * FROM entity_facts_conflicts 
WHERE entity_id = 'company-xyz'
ORDER BY created_at DESC;

-- Filtrer par type de fait
SELECT * FROM entity_facts_conflicts 
WHERE predicate = 'country'
ORDER BY created_at DESC;

-- Count total conflicts
SELECT COUNT(*) as conflict_count FROM entity_facts_conflicts;
```

### 3. Setup Automated QA Workflow

Option A: **Scheduled Report** (toutes les 6h)
```javascript
// scripts/qa-conflict-report.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function flagConflicts() {
  const { data: conflicts } = await supabase
    .from('entity_facts_conflicts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (conflicts.length > 0) {
    // Email QA Reviewer
    console.log(`🚩 ${conflicts.length} fact conflicts detected`);
    sendEmailToQA(conflicts);
  }
}

flagConflicts();
```

Option B: **Real-time Notifications** (via Supabase Realtime)
```javascript
const subscription = supabase
  .from('entity_facts_conflicts')
  .on('*', (payload) => {
    console.log('🚩 New conflict detected:', payload);
    notifyQAReviewer(payload);
  })
  .subscribe();
```

### 4. QA Reviewer Dashboard

Link pour accéder directement à la vue en prod:
- Supabase → Database → Editor → `entity_facts_conflicts`

Columns visibles:
- `entity_id` — Entité en conflit
- `predicate` — Type de fait (country, industry, etc.)
- `current_value` — Valeur insérer
- `conflicting_value` — Valeur en conflit
- `created_at` — Timestamp du conflit
- `conflict_with` — ID du fait en conflit (pour audit)

### 5. Scoring Impact

Avant de scorer une entité:
```sql
-- Check si elle a des conflits actifs
SELECT COUNT(*) as active_conflicts 
FROM entity_facts_conflicts 
WHERE entity_id = 'company-xyz' 
AND created_at > NOW() - INTERVAL '30 days';

-- Si active_conflicts > 0 → Flag for manual review
-- Si active_conflicts = 0 → Safe to score
```

---

**Next:** Setup cron job ou email trigger pour notifier QA Reviewer en temps réel 📧
