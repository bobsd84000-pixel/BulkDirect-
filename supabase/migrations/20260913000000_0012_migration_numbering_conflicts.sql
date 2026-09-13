-- Migration 0012: Entity Facts Conflicts Detection
-- Détecte et flag automatiquement les faits contradictoires sur 30j glissants

-- Table pour stocker les faits
create table if not exists entity_facts (
  id bigserial primary key,
  entity_id text not null,
  predicate text not null,
  value text not null,
  created_at timestamp with time zone default now(),
  is_conflicted boolean default false,
  conflict_with bigint
);

-- Index pour performances
create index if not exists idx_entity_facts_entity_predicate on entity_facts(entity_id, predicate);
create index if not exists idx_entity_facts_created_at on entity_facts(created_at);
create index if not exists idx_entity_facts_is_conflicted on entity_facts(is_conflicted);

-- Trigger: Flag les conflits si valeur différente pour même entity_id/predicate dans les 30j
create or replace function detect_fact_conflicts()
returns trigger as $$
declare
  v_conflicting_id bigint;
  v_oldest_date timestamp with time zone;
begin
  -- Fenêtre glissante 30 jours
  v_oldest_date := now() - interval '30 days';

  -- Cherche si valeur différente existe pour même entity_id/predicate
  select id into v_conflicting_id
  from entity_facts
  where entity_id = new.entity_id
    and predicate = new.predicate
    and value != new.value
    and id != new.id
    and created_at >= v_oldest_date
  limit 1;

  -- Flag si conflit détecté
  if v_conflicting_id is not null then
    new.is_conflicted := true;
    new.conflict_with := v_conflicting_id;
  else
    new.is_conflicted := false;
    new.conflict_with := null;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_detect_fact_conflicts on entity_facts;
create trigger trg_detect_fact_conflicts
before insert or update on entity_facts
for each row
execute function detect_fact_conflicts();

-- Vue QA Reviewer: Affiche les conflits détectés
create or replace view entity_facts_conflicts as
select
  ef1.id,
  ef1.entity_id,
  ef1.predicate,
  ef1.value as current_value,
  ef2.value as conflicting_value,
  ef1.created_at,
  ef2.created_at as conflicting_created_at,
  ef1.is_conflicted,
  ef1.conflict_with
from entity_facts ef1
left join entity_facts ef2 on ef1.conflict_with = ef2.id
where ef1.is_conflicted = true
order by ef1.created_at desc;

-- Commentaires pour documentation
comment on table entity_facts is 'Stockage des faits avec détection automatique de contradictions sur 30j glissants';
comment on column entity_facts.entity_id is 'Identifiant unique de l''entité';
comment on column entity_facts.predicate is 'Type de fait (ex: country, industry)';
comment on column entity_facts.value is 'Valeur du fait';
comment on column entity_facts.is_conflicted is 'Flag automatique: true si valeur contradictoire détectée sur 30j';
comment on column entity_facts.conflict_with is 'ID du fait en conflit (référence croisée)';
comment on view entity_facts_conflicts is 'Vue QA: Affiche tous les faits contradictoires détectés sur 30j';
