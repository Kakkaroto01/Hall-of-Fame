-- =====================================================================
-- 0002 — Row Level Security, permisos y Storage
-- Principio: todo cerrado por defecto; cada política abre lo mínimo.
-- Las tablas escritas solo por el servidor (historiales, puntuaciones,
-- suscripciones) no tienen políticas de escritura para clientes.
-- =====================================================================

alter table app_setting            enable row level security;
alter table profile                enable row level security;
alter table invite_code            enable row level security;
alter table friendship             enable row level security;
alter table game_group             enable row level security;
alter table game                   enable row level security;
alter table game_version           enable row level security;
alter table species                enable row level security;
alter table form                   enable row level security;
alter table sprite_asset           enable row level security;
alter table badge                  enable row level security;
alter table locke                  enable row level security;
alter table locke_history          enable row level security;
alter table pvp_match              enable row level security;
alter table pokemon_entry          enable row level security;
alter table pokemon_entry_version  enable row level security;
alter table league_team_member     enable row level security;
alter table category               enable row level security;
alter table category_version       enable row level security;
alter table category_subscription  enable row level security;
alter table award                  enable row level security;
alter table file_asset             enable row level security;
alter table evidence               enable row level security;
alter table sync_conflict          enable row level security;
alter table score_rule_set         enable row level security;
alter table entry_score            enable row level security;
alter table score_history          enable row level security;

-- ---------- Ajustes ----------
create policy app_setting_read  on app_setting for select to authenticated using (is_approved());
create policy app_setting_admin on app_setting for all    to authenticated using (is_admin()) with check (is_admin());

-- ---------- Perfil ----------
create policy profile_read on profile for select to authenticated
  using (id = auth.uid() or is_approved());
create policy profile_update_own on profile for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- (role y approved están protegidos por el trigger protect_profile_columns)

create policy invite_admin on invite_code for all to authenticated
  using (is_admin()) with check (is_admin());

-- ---------- Amistades ----------
create policy friendship_read on friendship for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friendship_request on friendship for insert to authenticated
  with check (is_approved() and requester_id = auth.uid() and status = 'pending');
create policy friendship_respond on friendship for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');
create policy friendship_delete on friendship for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ---------- Catálogo ----------
create policy game_group_read  on game_group  for select to authenticated using (is_approved());
create policy game_group_admin on game_group  for all    to authenticated using (is_admin()) with check (is_admin());
create policy species_read     on species     for select to authenticated using (is_approved());
create policy species_admin    on species     for all    to authenticated using (is_admin()) with check (is_admin());
create policy form_read        on form        for select to authenticated using (is_approved());
create policy form_admin       on form        for all    to authenticated using (is_admin()) with check (is_admin());
create policy badge_read       on badge       for select to authenticated using (is_approved());
create policy badge_admin      on badge       for all    to authenticated using (is_admin()) with check (is_admin());

create policy game_read on game for select to authenticated using (is_approved());
create policy game_insert on game for insert to authenticated
  with check (is_admin() or (is_approved() and not is_official and created_by = auth.uid()));
create policy game_update on game for update to authenticated
  using (is_admin() or (created_by = auth.uid() and not is_official))
  with check (is_admin() or (created_by = auth.uid() and not is_official));
create policy game_delete on game for delete to authenticated using (is_admin());

create policy game_version_read on game_version for select to authenticated using (is_approved());
create policy game_version_write on game_version for all to authenticated
  using (is_admin() or exists (select 1 from game g where g.id = game_id and g.created_by = auth.uid() and not g.is_official))
  with check (is_admin() or exists (select 1 from game g where g.id = game_id and g.created_by = auth.uid() and not g.is_official));

create policy sprite_read on sprite_asset for select to authenticated using (is_approved());
create policy sprite_write on sprite_asset for all to authenticated
  using (is_admin() or created_by = auth.uid())
  with check (is_admin() or (created_by = auth.uid() and game_version_id is not null
     and exists (select 1 from game_version gv join game g on g.id = gv.game_id
                  where gv.id = game_version_id and g.created_by = auth.uid() and not g.is_official)));

-- ---------- Lockes ----------
create policy locke_read on locke for select to authenticated
  using (owner_id = auth.uid() or (deleted_at is null and can_view(owner_id, visibility)));
create policy locke_insert on locke for insert to authenticated
  with check (is_approved() and owner_id = auth.uid());
create policy locke_update on locke for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy locke_delete on locke for delete to authenticated
  using (owner_id = auth.uid() and deleted_at is not null);   -- borrado definitivo solo desde la papelera

create policy locke_history_read on locke_history for select to authenticated
  using (exists (select 1 from locke l where l.id = locke_id and l.owner_id = auth.uid()));

create policy pvp_read on pvp_match for select to authenticated
  using (owner_id = auth.uid() or (deleted_at is null and exists (select 1 from locke l where l.id = locke_id)));
create policy pvp_insert on pvp_match for insert to authenticated with check (owner_id = auth.uid());
create policy pvp_update on pvp_match for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy pvp_delete on pvp_match for delete to authenticated
  using (owner_id = auth.uid() and deleted_at is not null);

-- ---------- Fichas ----------
create policy entry_read on pokemon_entry for select to authenticated
  using (owner_id = auth.uid()
      or (deleted_at is null and locke_alive(locke_id) and can_view(owner_id, visibility)));
create policy entry_insert on pokemon_entry for insert to authenticated
  with check (is_approved() and owner_id = auth.uid());
create policy entry_update on pokemon_entry for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy entry_delete on pokemon_entry for delete to authenticated
  using (owner_id = auth.uid() and deleted_at is not null);

create policy entry_version_read on pokemon_entry_version for select to authenticated
  using (exists (select 1 from pokemon_entry e where e.id = entry_id));

create policy ltm_read on league_team_member for select to authenticated
  using (owner_id = auth.uid() or exists (select 1 from pokemon_entry e where e.id = entry_id));
create policy ltm_insert on league_team_member for insert to authenticated with check (owner_id = auth.uid());
create policy ltm_delete on league_team_member for delete to authenticated using (owner_id = auth.uid());

-- ---------- Categorías ----------
create policy category_read on category for select to authenticated
  using (is_approved() and (
        owner_id = auth.uid()
     or (kind = 'official' and deleted_at is null)
     or (deleted_at is null and (visibility = 'community'
         or (visibility = 'friends' and are_friends(owner_id, auth.uid()))))));
create policy category_insert on category for insert to authenticated
  with check (is_admin() or (is_approved() and kind = 'custom' and owner_id = auth.uid()));
create policy category_update on category for update to authenticated
  using (is_admin() or (kind = 'custom' and owner_id = auth.uid()))
  with check (is_admin() or (kind = 'custom' and owner_id = auth.uid()));
create policy category_delete on category for delete to authenticated
  using (is_admin() or (owner_id = auth.uid() and deleted_at is not null));

create policy category_version_read on category_version for select to authenticated
  using (exists (select 1 from category c where c.id = category_id and (c.owner_id = auth.uid() or c.kind = 'official'))
      or exists (select 1 from category_subscription s
                  where s.category_id = category_version.category_id and s.user_id = auth.uid()
                    and revision in (s.accepted_revision, s.pending_revision)));

create policy subscription_read on category_subscription for select to authenticated
  using (user_id = auth.uid());
create policy subscription_delete on category_subscription for delete to authenticated
  using (user_id = auth.uid());
-- alta: rpc subscribe_category(); aceptar cambios: rpc accept_category_update()

-- ---------- Reconocimientos, evidencias y archivos ----------
create policy award_read on award for select to authenticated
  using (owner_id = auth.uid()
      or (deleted_at is null and exists (select 1 from pokemon_entry e where e.id = entry_id)));
create policy award_insert on award for insert to authenticated with check (owner_id = auth.uid());
create policy award_update on award for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy award_delete on award for delete to authenticated
  using (owner_id = auth.uid() and deleted_at is not null);

create policy evidence_read on evidence for select to authenticated
  using (owner_id = auth.uid() or (deleted_at is null and can_view(owner_id, visibility)));
create policy evidence_insert on evidence for insert to authenticated with check (owner_id = auth.uid());
create policy evidence_update on evidence for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy evidence_delete on evidence for delete to authenticated
  using (owner_id = auth.uid() and deleted_at is not null);

create policy file_read on file_asset for select to authenticated
  using (owner_id = auth.uid() or (deleted_at is null and can_view(owner_id, visibility)));
create policy file_insert on file_asset for insert to authenticated
  with check (is_approved() and owner_id = auth.uid()
              and storage_path like auth.uid()::text || '/%');
create policy file_update on file_asset for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy file_delete on file_asset for delete to authenticated
  using (owner_id = auth.uid() and deleted_at is not null);

-- ---------- Sincronización ----------
create policy conflict_own on sync_conflict for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Puntuación (solo lectura; escribe el servidor) ----------
create policy rule_read  on score_rule_set for select to authenticated using (is_approved());
create policy rule_admin on score_rule_set for all    to authenticated using (is_admin()) with check (is_admin());
create policy score_read on entry_score for select to authenticated
  using (exists (select 1 from pokemon_entry e where e.id = entry_id));
create policy score_history_admin on score_history for select to authenticated using (is_admin());

-- ---------- Grants ----------
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant select on ranking_entry, ranking_user to authenticated;
-- Helpers usados por las políticas y RPC expuestas al cliente
grant execute on function is_approved(), is_admin(), are_friends(uuid, uuid),
  can_view(uuid, visibility), locke_alive(uuid), redeem_invite(text),
  subscribe_category(uuid), accept_category_update(uuid),
  ranking_species(int, uuid), activate_rule_set(uuid)
  to authenticated;
-- purge_trash(), recalc_*() quedan solo para el rol de servicio / cron

-- ---------- Storage (bucket privado "locker") ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('locker', 'locker', false, 10485760)
on conflict (id) do nothing;

create policy locker_read on storage.objects for select to authenticated
  using (bucket_id = 'locker' and exists (
    select 1 from file_asset f where f.storage_path = name
       and (f.owner_id = auth.uid() or (f.deleted_at is null and can_view(f.owner_id, f.visibility)))));
create policy locker_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'locker' and (storage.foldername(name))[1] = auth.uid()::text);
create policy locker_delete on storage.objects for delete to authenticated
  using (bucket_id = 'locker' and (storage.foldername(name))[1] = auth.uid()::text);
