#!/usr/bin/env node
/**
 * Test Migration 0012: Entity Facts Conflict Detection
 *
 * Simule les inserts et vérifie le comportement du trigger
 * (Simulation logique - nécessite une vraie DB pour l'exécution SQL)
 */

const testCases = [
  {
    name: "Test 1: Insert première valeur",
    sql: "INSERT INTO entity_facts (entity_id, predicate, value) VALUES ('company-001', 'country', 'France')",
    expectedResult: {
      is_conflicted: false,
      conflict_with: null
    },
    description: "Premier insert - pas de conflit"
  },
  {
    name: "Test 2: Insert valeur différente (même entity/predicate)",
    sql: "INSERT INTO entity_facts (entity_id, predicate, value) VALUES ('company-001', 'country', 'Germany')",
    expectedResult: {
      is_conflicted: true,
      conflict_with: "id_du_premier_insert"
    },
    description: "Valeur différente → trigger flag is_conflicted=true"
  },
  {
    name: "Test 3: Même valeur (pas de conflit)",
    sql: "INSERT INTO entity_facts (entity_id, predicate, value) VALUES ('company-001', 'country', 'France')",
    expectedResult: {
      is_conflicted: false,
      conflict_with: null
    },
    description: "Même valeur → pas de flag"
  },
  {
    name: "Test 4: Valeur après 31 jours (hors fenêtre)",
    sql: "INSERT INTO entity_facts (entity_id, predicate, value, created_at) VALUES ('company-001', 'country', 'Spain', NOW() - INTERVAL '31 days')",
    expectedResult: {
      is_conflicted: false,
      conflict_with: null
    },
    description: "Hors fenêtre 30j → pas de conflit"
  }
];

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Migration 0012: Conflict Detection Tests              ║
╚════════════════════════════════════════════════════════════════╝

SETUP REQUIS:
- Appliquer migration: supabase/migrations/20260913000000_0012_migration_numbering_conflicts.sql
- Exécuter avec: psql -U user -d bulkdirect -f test-migration-0012.sql

TESTS:
`);

testCases.forEach((test, i) => {
  console.log(`
${i + 1}. ${test.name}
   ${test.description}

   SQL: ${test.sql}

   RÉSULTAT ATTENDU:
   - is_conflicted: ${test.expectedResult.is_conflicted}
   - conflict_with: ${test.expectedResult.conflict_with}
`);
});

console.log(`
VÉRIFICATION:
1. Check is_conflicted flag:
   SELECT id, entity_id, predicate, value, is_conflicted, conflict_with
   FROM entity_facts WHERE entity_id = 'company-001' ORDER BY created_at;

2. Check vue entity_facts_conflicts:
   SELECT * FROM entity_facts_conflicts WHERE entity_id = 'company-001';

CLEANUP:
   DELETE FROM entity_facts WHERE entity_id = 'company-001';
`);
