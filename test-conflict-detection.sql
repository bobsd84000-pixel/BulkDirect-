-- Test: Insère 2 faits contradictoires sur même entity_id/predicate dans les 30j

-- 1. Insérer premier fait
INSERT INTO entity_facts (entity_id, predicate, value)
VALUES ('company-001', 'country', 'France')
RETURNING id, entity_id, predicate, value, is_conflicted, conflict_with;

-- 2. Insérer deuxième fait avec valeur différente (même entity_id/predicate)
INSERT INTO entity_facts (entity_id, predicate, value)
VALUES ('company-001', 'country', 'Germany')
RETURNING id, entity_id, predicate, value, is_conflicted, conflict_with;

-- 3. Vérifier le statut : le 2ème insert doit avoir is_conflicted=true et conflict_with pointant vers le 1er
SELECT * FROM entity_facts WHERE entity_id = 'company-001' ORDER BY created_at;

-- 4. Vérifier la vue entity_facts_conflicts : doit montrer le conflit
SELECT * FROM entity_facts_conflicts WHERE entity_id = 'company-001';

-- 5. Cleanup pour test
DELETE FROM entity_facts WHERE entity_id = 'company-001';
