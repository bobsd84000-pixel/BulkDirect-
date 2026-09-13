#!/usr/bin/env node
/**
 * Verification: Entity Facts Conflict Detection Logic
 * Simule le trigger et la vue sans DB
 */

class EntityFactsDB {
  constructor() {
    this.facts = [];
    this.nextId = 1;
  }

  insert(entityId, predicate, value, createdAtOffset = 0) {
    const now = new Date();
    const createdAt = new Date(now.getTime() + createdAtOffset * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Cherche conflit: valeur différente pour même entity/predicate dans 30j
    const conflictingFact = this.facts.find(f =>
      f.entity_id === entityId &&
      f.predicate === predicate &&
      f.value !== value &&
      f.created_at >= thirtyDaysAgo
    );

    const fact = {
      id: this.nextId++,
      entity_id: entityId,
      predicate,
      value,
      created_at: createdAt,
      is_conflicted: !!conflictingFact,
      conflict_with: conflictingFact?.id || null
    };

    this.facts.push(fact);
    return fact;
  }

  getConflicts(entityId, predicate) {
    const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.facts
      .filter(f =>
        f.entity_id === entityId &&
        f.is_conflicted === true &&
        f.created_at >= thirtyDaysAgo
      )
      .map(f => ({
        id: f.id,
        entity_id: f.entity_id,
        predicate: f.predicate,
        current_value: f.value,
        conflicting_value: this.facts.find(cf => cf.id === f.conflict_with)?.value,
        created_at: f.created_at.toISOString(),
        conflicting_created_at: this.facts.find(cf => cf.id === f.conflict_with)?.created_at.toISOString(),
        is_conflicted: f.is_conflicted,
        conflict_with: f.conflict_with
      }));
  }
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Vérification: Entity Facts Conflict Detection               ║
╚═══════════════════════════════════════════════════════════════╝
`);

const db = new EntityFactsDB();

// TEST: Insérer 2 faits contradictoires dans les 30j
console.log("1️⃣  Insert premier fait: company-001 | country | France");
const fact1 = db.insert('company-001', 'country', 'France', 0);
console.log(`   ✓ ID: ${fact1.id}`);
console.log(`   ✓ is_conflicted: ${fact1.is_conflicted} (attendu: false)`);
console.log(`   ✓ conflict_with: ${fact1.conflict_with} (attendu: null)\n`);

console.log("2️⃣  Insert deuxième fait: company-001 | country | Germany (contradictoire)");
const fact2 = db.insert('company-001', 'country', 'Germany', 0);
console.log(`   ✓ ID: ${fact2.id}`);
console.log(`   ✓ is_conflicted: ${fact2.is_conflicted} (attendu: true) ${fact2.is_conflicted ? '✅' : '❌'}`);
console.log(`   ✓ conflict_with: ${fact2.conflict_with} (attendu: ${fact1.id}) ${fact2.conflict_with === fact1.id ? '✅' : '❌'}\n`);

// Vérifier vue entity_facts_conflicts
console.log("3️⃣  Vérification: SELECT * FROM entity_facts_conflicts");
const conflicts = db.getConflicts('company-001', 'country');
console.log(`   Lignes trouvées: ${conflicts.length} (attendu: 1) ${conflicts.length === 1 ? '✅' : '❌'}\n`);

if (conflicts.length > 0) {
  console.log("   Contenu de la vue:");
  conflicts.forEach(c => {
    console.log(`
   - ID: ${c.id}
   - entity_id: ${c.entity_id}
   - predicate: ${c.predicate}
   - current_value: ${c.current_value}
   - conflicting_value: ${c.conflicting_value}
   - conflict_with: ${c.conflict_with}
   - is_conflicted: ${c.is_conflicted}
    `);
  });
}

// Résumé
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  RÉSUMÉ DU TEST                                              ║
╚═══════════════════════════════════════════════════════════════╝

${fact2.is_conflicted && fact2.conflict_with === fact1.id && conflicts.length === 1
  ? '✅ TOUS LES TESTS PASSENT'
  : '❌ CERTAINS TESTS ÉCHOUENT'}

- Trigger flag is_conflicted=true: ${fact2.is_conflicted ? '✅' : '❌'}
- conflict_with rempli correctement: ${fact2.conflict_with === fact1.id ? '✅' : '❌'}
- Vue entity_facts_conflicts affiche conflit: ${conflicts.length === 1 ? '✅' : '❌'}
`);
