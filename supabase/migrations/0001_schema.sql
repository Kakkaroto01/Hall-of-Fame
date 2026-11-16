-- =====================================================================
-- Pokémon Hall of Fame — 0001 esquema base (Supabase / PostgreSQL 15+)
-- Convenciones:
--   * IDs uuid (el cliente puede generarlos offline).
--   * Entidades editables: version (concurrencia optimista), updated_at,
--     deleted_at (papelera).
--   * Actualizar una fila editable EXIGE enviar la version base: si no
--     coincide con la del servidor se lanza error 40001 (conflicto).
-- =====================================================================

create extension if not exists citext;

-- ---------- Tipos ----------
create type app_role          as enum ('user','admin');
create type friendship_status as enum ('pending','accepted');
create type visibility        as enum ('private','friends','community');
create type locke_status      as enum ('in_progress','won','lost','abandoned');
create type locke_result      as enum ('victory','lives_depleted','wipeout','lost_matches','voluntary_abandon');
create type entry_status      as enum ('alive','dead');
create type entry_event       as enum ('created','edited','evolved','imported');
create type selection_rule    as enum ('manual','league_team','league_mvp','game_mvp','battle_mvp','series_mvp');
create type evidence_kind     as enum ('text','image','link','video_link');
create type file_kind         as enum ('save','pokemon','other');
create type conflict_status   as enum ('open','resolved');
create type game_kind         as enum ('main','remake','spinoff','hackrom','fangame');

-- ---------- Triggers genéricos ----------
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Concurrencia optimista: el cliente envía la version que conocía.
create function enforce_version() returns trigger language plpgsql as $$
begin
  if new.version is distinct from old.version then
    raise exception 'version_conflict: base % vs servidor %', new.version, old.version
      using errcode = '40001';
  end if;
  new.version    := old.version + 1;
  new.updated_at := now();
  return new;
end $$;

-- ---------- Ajustes globales ----------
create table app_setting (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- Usuarios ----------
create table profile (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        citext not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name    text not null,
  avatar_url      text,
  role            app_role not null default 'user',
  approved        boolean  not null default false,   -- se activa con un código de invitación
  show_in_rankings boolean not null default false,   -- aparecer en rankings de usuarios
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger profile_updated before update on profile
  for each row execute function set_updated_at();

create table invite_code (
  code       text primary key,
  created_by uuid references profile(id) on delete set null,
  used_by    uuid references profile(id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'full_name',
                     new.raw_user_meta_data->>'name',
                     'Entrenador');
  insert into profile (id, username, display_name)
  values (new.id, 'user_' || substr(replace(new.id::text,'-',''),1,10), v_name);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- role y approved solo cambian por canales privilegiados
create function protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.approved is distinct from old.approved)
     and coalesce(current_setting('hof.privileged', true),'') <> 'on'
     and not exists (select 1 from profile p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'profile_protected_columns';
  end if;
  return new;
end $$;
create trigger profile_protect before update on profile
  for each row execute function protect_profile_columns();

create function redeem_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  update invite_code set used_by = v_uid, used_at = now()
   where code = p_code and used_by is null;
  if not found then raise exception 'invalid_invite'; end if;
  perform set_config('hof.privileged','on', true);
  update profile set approved = true where id = v_uid;
end $$;

-- ---------- Amistades ----------
create table friendship (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profile(id) on delete cascade,
  addressee_id uuid not null references profile(id) on delete cascade,
  status       friendship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index friendship_pair_uq
  on friendship (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendship_addressee_idx on friendship (addressee_id);

-- ---------- Helpers de permisos ----------
create function is_approved() returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce((select approved from profile where id = auth.uid()), false) $$;

create function is_admin() returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce((select role = 'admin' and approved from profile where id = auth.uid()), false) $$;

create function are_friends(a uuid, b uuid) returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from friendship f
                  where f.status = 'accepted'
                    and ((f.requester_id = a and f.addressee_id = b)
                      or (f.requester_id = b and f.addressee_id = a))) $$;

-- Un elemento (no 'private') es visible para amigos aceptados del dueño.
-- 'community' NO da acceso directo a desconocidos: solo se expone vía rankings.
create function can_view(p_owner uuid, p_vis visibility) returns boolean
language sql stable security definer set search_path = public as $$
  select is_approved() and (p_owner = auth.uid()
         or (p_vis <> 'private' and are_friends(p_owner, auth.uid()))) $$;

-- ---------- Catálogo ----------
create table game_group (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  generation smallint,                 -- null para hackroms/fangames
  sort_order int not null default 0,
  theme      jsonb not null default '{}'
);

create table game (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references game_group(id) on delete set null,
  name         citext not null,
  kind         game_kind not null default 'main',
  base_game_id uuid references game(id) on delete set null,  -- juego base o franquicia
  author       text,
  description  text,
  cover_url    text,
  is_official  boolean not null default false,
  created_by   uuid references profile(id) on delete set null,
  created_at   timestamptz not null default now(),
  check (is_official or created_by is not null)
);
create index game_name_idx on game (name);
create unique index game_official_name_uq on game (name) where is_official;

create table game_version (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references game(id) on delete cascade,
  label      text not null,                       -- "Rojo", "2.1", ...
  cover_url  text,
  features   jsonb not null default '{}',         -- {"tera":true,"ivs":true,...}
  sort_order int not null default 0,
  unique (game_id, label)
);

create table species (
  id         integer primary key,                 -- número de Pokédex nacional
  name       text not null,
  generation smallint not null
);

create table form (
  id         uuid primary key default gen_random_uuid(),
  species_id integer not null references species(id) on delete cascade,
  form_key   text not null default 'base',        -- solo formas relevantes (regionales, Deoxys, Rotom...)
  pokeapi_id integer,                             -- clave del repositorio de sprites (id de PokéAPI)
  name       text not null,
  type1      text not null,
  type2      text,
  unique (species_id, form_key)
);

create table sprite_asset (
  id              uuid primary key default gen_random_uuid(),
  form_id         uuid not null references form(id) on delete cascade,
  game_version_id uuid references game_version(id) on delete cascade,
  generation      smallint,
  variant         text,                           -- patrones cosméticos (Vivillon...)
  shiny           boolean not null default false,
  animated        boolean not null default false,
  url             text not null,
  source          text,
  license         text,
  created_by      uuid references profile(id) on delete set null
);
create index sprite_form_idx on sprite_asset (form_id);

create table badge (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  icon_url   text,
  created_by uuid references profile(id) on delete set null
);

-- ---------- Lockes ----------
create table locke (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references profile(id) on delete cascade,
  title          text not null,
  game_version_id uuid not null references game_version(id),
  started_on     date not null default current_date,
  finished_on    date,
  status         locke_status not null default 'in_progress',
  result         locke_result,
  rules          jsonb not null default '{}',
  difficulty     text,
  rival_user_id  uuid references profile(id) on delete set null,
  rival_locke_id uuid references locke(id) on delete set null,
  description    text,
  visibility     visibility not null default 'private',
  version        int not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  check ((status = 'in_progress' and result is null)
      or (status = 'won'         and result = 'victory')
      or (status = 'lost'        and result in ('lives_depleted','wipeout','lost_matches'))
      or (status = 'abandoned'   and result = 'voluntary_abandon')),
  check (finished_on is null or finished_on >= started_on)
);
create index locke_owner_idx on locke (owner_id) where deleted_at is null;
create trigger locke_version before update on locke
  for each row execute function enforce_version();

create function validate_locke() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Solo se valida al fijar o cambiar el rival (un locke antiguo sigue siendo
  -- editable aunque la amistad se haya eliminado después).
  if tg_op = 'UPDATE'
     and new.rival_user_id is not distinct from old.rival_user_id
     and new.rival_locke_id is not distinct from old.rival_locke_id then
    return new;
  end if;
  if new.rival_locke_id is not null then
    if new.rival_user_id is null
       or not exists (select 1 from locke r where r.id = new.rival_locke_id and r.owner_id = new.rival_user_id)
       or not are_friends(new.owner_id, new.rival_user_id) then
      raise exception 'invalid_rival';
    end if;
  elsif new.rival_user_id is not null and not are_friends(new.owner_id, new.rival_user_id) then
    raise exception 'invalid_rival';
  end if;
  return new;
end $$;
create trigger locke_validate before insert or update on locke
  for each row execute function validate_locke();

create table locke_history (
  id         uuid primary key default gen_random_uuid(),
  locke_id   uuid not null references locke(id) on delete cascade,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  change     jsonb not null
);
create index locke_history_idx on locke_history (locke_id, changed_at);

create function log_locke_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text; v_old jsonb := '{}'; v_new jsonb := '{}';
begin
  if tg_op = 'INSERT' then
    insert into locke_history (locke_id, changed_by, change)
    values (new.id, auth.uid(), jsonb_build_object('event','created',
            'new', jsonb_build_object('title', new.title, 'status', new.status)));
  else
    foreach k in array array['title','game_version_id','status','result','difficulty',
                             'started_on','finished_on','rules','rival_user_id','visibility'] loop
      if to_jsonb(new)->k is distinct from to_jsonb(old)->k then
        v_old := v_old || jsonb_build_object(k, to_jsonb(old)->k);
        v_new := v_new || jsonb_build_object(k, to_jsonb(new)->k);
      end if;
    end loop;
    if v_new <> '{}'::jsonb then
      insert into locke_history (locke_id, changed_by, change)
      values (new.id, auth.uid(), jsonb_build_object('event','updated','old',v_old,'new',v_new));
    end if;
  end if;
  return null;
end $$;
create trigger locke_log after insert or update on locke
  for each row execute function log_locke_change();

create function locke_alive(p_locke uuid) returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from locke where id = p_locke and deleted_at is null) $$;

create function set_owner_from_locke() returns trigger language plpgsql as $$
begin
  new.owner_id := (select owner_id from locke where id = new.locke_id);
  return new;
end $$;

create table pvp_match (
  id         uuid primary key default gen_random_uuid(),
  locke_id   uuid not null references locke(id) on delete cascade,
  owner_id   uuid not null references profile(id) on delete cascade,
  position   int  not null,
  winner     text not null check (winner in ('self','rival','draw')),
  note       text,
  version    int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (locke_id, position)
);
create trigger pvp_match_owner before insert on pvp_match
  for each row execute function set_owner_from_locke();
create trigger pvp_match_version before update on pvp_match
  for each row execute function enforce_version();

-- ---------- Fichas ----------
create table pokemon_entry (
  id                 uuid primary key default gen_random_uuid(),
  locke_id           uuid not null references locke(id) on delete cascade,
  owner_id           uuid not null references profile(id) on delete cascade,
  form_id            uuid not null references form(id),
  nickname           text,
  level              smallint check (level between 1 and 100),
  gender             text check (gender in ('M','F','N')),
  nature             text,
  ability            text,
  moves              text[] check (cardinality(moves) <= 4),
  held_item          text,
  is_shiny           boolean not null default false,
  stats              jsonb,
  ivs                jsonb,
  evs                jsonb,
  tera_type          text,
  sprite_asset_id    uuid references sprite_asset(id) on delete set null,
  status             entry_status not null default 'alive',
  death_note         text,
  description        text,
  source             text not null default 'manual' check (source in ('manual','import')),
  import_fingerprint text,                         -- para avisar de posibles duplicados
  visibility         visibility not null default 'private',
  version            int not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index entry_locke_idx on pokemon_entry (locke_id) where deleted_at is null;
create index entry_owner_idx on pokemon_entry (owner_id) where deleted_at is null;
create index entry_fingerprint_idx on pokemon_entry (owner_id, import_fingerprint)
  where import_fingerprint is not null;
create trigger entry_owner before insert on pokemon_entry
  for each row execute function set_owner_from_locke();
create trigger entry_version before update on pokemon_entry
  for each row execute function enforce_version();

create table pokemon_entry_version (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references pokemon_entry(id) on delete cascade,
  seq        int  not null,
  event      entry_event not null,
  form_id    uuid not null,
  snapshot   jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (entry_id, seq)
);

-- El historial lo escribe SIEMPRE el servidor (no se puede omitir desde el cliente).
create function snapshot_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_skip text[] := array['version','updated_at','visibility','deleted_at'];
  v_event entry_event;
  v_seq int;
begin
  if tg_op = 'INSERT' then
    v_event := case when new.source = 'import' then 'imported' else 'created' end;
  else
    if (to_jsonb(new) - v_skip) = (to_jsonb(old) - v_skip) then return null; end if;
    v_event := case when new.form_id <> old.form_id then 'evolved' else 'edited' end;
  end if;
  select coalesce(max(seq),0) + 1 into v_seq from pokemon_entry_version where entry_id = new.id;
  insert into pokemon_entry_version (entry_id, seq, event, form_id, snapshot, created_by)
  values (new.id, v_seq, v_event, new.form_id, to_jsonb(new) - v_skip, auth.uid());
  return null;
end $$;
create trigger entry_snapshot after insert or update on pokemon_entry
  for each row execute function snapshot_entry();

create table league_team_member (
  locke_id uuid not null references locke(id) on delete cascade,
  entry_id uuid not null references pokemon_entry(id) on delete cascade,
  owner_id uuid not null references profile(id) on delete cascade,
  primary key (locke_id, entry_id)
);
create trigger ltm_owner before insert on league_team_member
  for each row execute function set_owner_from_locke();

-- ---------- Categorías, insignias y reconocimientos ----------
create table category (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('official','custom')),
  owner_id      uuid references profile(id) on delete cascade,
  key           text unique,                       -- solo oficiales
  name          text not null,
  description   text,
  criteria      text,
  badge_id      uuid references badge(id) on delete set null,
  selection     selection_rule not null default 'manual',
  scores_points boolean not null default false,
  visibility    visibility not null default 'private',
  revision      int not null default 1,            -- revisiones de contenido (compartidas)
  version       int not null default 1,            -- sincronización
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  check ((kind = 'official' and owner_id is null and key is not null)
      or (kind = 'custom'   and owner_id is not null and key is null
          and not scores_points and selection = 'manual'))
);
create trigger category_version before update on category
  for each row execute function enforce_version();

create table category_version (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references category(id) on delete cascade,
  revision    int  not null,
  name        text not null,
  description text,
  criteria    text,
  badge_id    uuid,
  created_at  timestamptz not null default now(),
  unique (category_id, revision)
);

create table category_subscription (
  user_id           uuid not null references profile(id) on delete cascade,
  category_id       uuid not null references category(id) on delete cascade,
  accepted_revision int  not null,
  pending_revision  int,
  created_at        timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- AFTER: la fila ya existe; el UPDATE interno reenvía la version actual para
-- no chocar con enforce_version.
create function category_revisions() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_rev int;
begin
  if tg_op = 'UPDATE' then
    if (new.name, new.description, new.criteria, new.badge_id)
         is not distinct from (old.name, old.description, old.criteria, old.badge_id) then
      return null;
    end if;
    v_rev := new.revision + 1;
    update category set revision = v_rev, version = new.version where id = new.id;
    update category_subscription set pending_revision = v_rev
     where category_id = new.id and accepted_revision < v_rev;
  else
    v_rev := new.revision;
  end if;
  insert into category_version (category_id, revision, name, description, criteria, badge_id)
  values (new.id, v_rev, new.name, new.description, new.criteria, new.badge_id);
  return null;
end $$;
create trigger category_rev after insert or update on category
  for each row execute function category_revisions();

create function subscribe_category(p_category uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c category%rowtype;
begin
  select * into c from category where id = p_category and deleted_at is null and kind = 'custom';
  if not found or not (c.visibility = 'community'
       or (c.visibility = 'friends' and are_friends(c.owner_id, auth.uid()))) then
    raise exception 'category_not_available';
  end if;
  insert into category_subscription (user_id, category_id, accepted_revision)
  values (auth.uid(), p_category, c.revision) on conflict do nothing;
end $$;

create function accept_category_update(p_category uuid) returns void
language sql security definer set search_path = public as $$
  update category_subscription
     set accepted_revision = pending_revision, pending_revision = null
   where user_id = auth.uid() and category_id = p_category and pending_revision is not null $$;

create table award (
  id                uuid primary key default gen_random_uuid(),
  entry_id          uuid not null references pokemon_entry(id) on delete cascade,
  locke_id          uuid not null references locke(id) on delete cascade,
  owner_id          uuid not null references profile(id) on delete cascade,
  category_id       uuid not null references category(id),
  category_revision int,
  pvp_match_id      uuid references pvp_match(id) on delete cascade,
  note              text,
  version           int not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create unique index award_unique_uq on award
  (entry_id, category_id, coalesce(pvp_match_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where deleted_at is null;
create index award_entry_idx on award (entry_id) where deleted_at is null;
create index award_locke_idx on award (locke_id) where deleted_at is null;
create trigger award_owner before insert on award
  for each row execute function set_owner_from_locke();
create trigger award_version before update on award
  for each row execute function enforce_version();

-- Reglas de selección aplicadas en servidor
create function validate_award() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  e pokemon_entry%rowtype; c category%rowtype; l locke%rowtype;
  v_rev int; v_dup boolean;
begin
  select * into e from pokemon_entry where id = new.entry_id;
  if not found or e.locke_id <> new.locke_id then raise exception 'award_entry_locke_mismatch'; end if;
  select * into c from category where id = new.category_id;
  if not found then raise exception 'award_category_missing'; end if;
  select * into l from locke where id = new.locke_id;

  if c.kind = 'custom' and c.owner_id <> l.owner_id then
    select accepted_revision into v_rev from category_subscription
     where category_id = c.id and user_id = l.owner_id;
    if v_rev is null then raise exception 'award_category_not_available'; end if;
  end if;
  new.category_revision := coalesce(v_rev, c.revision);

  if new.deleted_at is null then
    if c.selection <> 'battle_mvp' and new.pvp_match_id is not null then
      raise exception 'award_match_not_allowed';
    end if;
    if c.selection = 'league_team' or c.selection = 'league_mvp' then
      if not exists (select 1 from league_team_member m
                      where m.locke_id = new.locke_id and m.entry_id = new.entry_id) then
        raise exception 'award_requires_league_team';
      end if;
    end if;
    if c.selection in ('league_mvp','game_mvp','series_mvp') then
      select exists (select 1 from award a join category c2 on c2.id = a.category_id
                      where a.locke_id = new.locke_id and c2.selection = c.selection
                        and a.deleted_at is null and a.id <> new.id) into v_dup;
      if v_dup then raise exception 'award_unique_per_locke'; end if;
    end if;
    if c.selection = 'series_mvp' and l.rival_user_id is null then
      raise exception 'award_requires_pvp';
    end if;
    if c.selection = 'battle_mvp' then
      if new.pvp_match_id is null
         or not exists (select 1 from pvp_match m where m.id = new.pvp_match_id and m.locke_id = new.locke_id) then
        raise exception 'award_requires_match';
      end if;
      select exists (select 1 from award a join category c2 on c2.id = a.category_id
                      where a.pvp_match_id = new.pvp_match_id and c2.selection = 'battle_mvp'
                        and a.deleted_at is null and a.id <> new.id) into v_dup;
      if v_dup then raise exception 'award_unique_per_match'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger award_validate before insert or update on award
  for each row execute function validate_award();

-- Equipo de la Liga: máx. 6, mismo locke, y su categoría oficial se mantiene sola
create function validate_league_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from pokemon_entry e where e.id = new.entry_id
                    and e.locke_id = new.locke_id and e.deleted_at is null) then
      raise exception 'league_entry_mismatch';
    end if;
    if (select count(*) from league_team_member where locke_id = new.locke_id) >= 6 then
      raise exception 'league_team_full';
    end if;
    return new;
  else
    if coalesce(current_setting('hof.purging', true),'') <> 'on'
       and exists (select 1 from award a join category c on c.id = a.category_id
                    where a.locke_id = old.locke_id and a.entry_id = old.entry_id
                      and c.selection = 'league_mvp' and a.deleted_at is null) then
      raise exception 'remove_mvp_first';
    end if;
    return old;
  end if;
end $$;
create trigger ltm_validate before insert or delete on league_team_member
  for each row execute function validate_league_member();

create function sync_league_award() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cat uuid;
begin
  if coalesce(current_setting('hof.purging', true),'') = 'on' then return null; end if;
  select id into v_cat from category where kind = 'official' and selection = 'league_team' limit 1;
  if v_cat is null then return null; end if;
  if tg_op = 'INSERT' then
    if not exists (select 1 from award where entry_id = new.entry_id and category_id = v_cat and deleted_at is null) then
      insert into award (entry_id, locke_id, category_id) values (new.entry_id, new.locke_id, v_cat);
    end if;
  else
    update award set deleted_at = now()
     where entry_id = old.entry_id and category_id = v_cat and deleted_at is null;
  end if;
  return null;
end $$;
create trigger ltm_award after insert or delete on league_team_member
  for each row execute function sync_league_award();

-- ---------- Evidencias y archivos ----------
create table file_asset (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references profile(id) on delete cascade,
  locke_id      uuid references locke(id) on delete cascade,
  entry_id      uuid references pokemon_entry(id) on delete cascade,
  kind          file_kind not null default 'save',
  storage_path  text not null unique,              -- {owner_id}/{id}
  original_name text not null,
  size_bytes    bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256        text,
  description   text,
  visibility    visibility not null default 'private' check (visibility <> 'community'),
  version       int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index file_locke_idx on file_asset (locke_id) where deleted_at is null;
create trigger file_version before update on file_asset
  for each row execute function enforce_version();

create table evidence (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references profile(id) on delete cascade,
  entry_id   uuid not null references pokemon_entry(id) on delete cascade,
  award_id   uuid references award(id) on delete cascade,
  kind       evidence_kind not null,
  content    text,
  file_id    uuid references file_asset(id) on delete set null,
  visibility visibility not null default 'private' check (visibility <> 'community'),
  version    int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (content is not null or file_id is not null)
);
create function set_owner_from_entry() returns trigger language plpgsql as $$
begin
  new.owner_id := (select owner_id from pokemon_entry where id = new.entry_id);
  return new;
end $$;
create trigger evidence_owner before insert on evidence
  for each row execute function set_owner_from_entry();
create trigger evidence_version before update on evidence
  for each row execute function enforce_version();

-- ---------- Sincronización ----------
create table sync_conflict (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profile(id) on delete cascade,
  entity_table text not null,
  entity_id    uuid not null,
  base_version int  not null,
  local_data   jsonb not null,
  server_data  jsonb not null,
  status       conflict_status not null default 'open',
  resolution   jsonb,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index sync_conflict_user_idx on sync_conflict (user_id, status);

-- ---------- Puntuación ----------
create table score_rule_set (
  id                   uuid primary key default gen_random_uuid(),
  revision             int  not null unique,
  is_active            boolean not null default false,
  base_points          int  not null default 1 check (base_points > 0),
  species_prior_weight numeric not null default 3 check (species_prior_weight >= 0),
  notes                text,
  created_by           uuid references profile(id) on delete set null,
  created_at           timestamptz not null default now()
);
create unique index score_rule_active_uq on score_rule_set (is_active) where is_active;

create table entry_score (
  entry_id      uuid primary key references pokemon_entry(id) on delete cascade,
  points        int  not null,
  rule_set_id   uuid references score_rule_set(id),
  calculated_at timestamptz not null default now()
);

create table score_history (
  id          uuid primary key default gen_random_uuid(),
  rule_set_id uuid references score_rule_set(id),
  entry_id    uuid,
  old_points  int,
  new_points  int,
  reason      text not null,
  created_at  timestamptz not null default now()
);
create index score_history_entry_idx on score_history (entry_id);

create function recalc_entry_score(p_entry uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_rule score_rule_set%rowtype; v_new int; v_old int;
begin
  select * into v_rule from score_rule_set where is_active;
  if not found then return; end if;
  select count(*) * v_rule.base_points into v_new
    from award a
    join category c       on c.id = a.category_id
    join locke l          on l.id = a.locke_id
    join pokemon_entry e  on e.id = a.entry_id
   where a.entry_id = p_entry and a.deleted_at is null
     and c.kind = 'official' and c.scores_points and c.deleted_at is null
     and e.deleted_at is null and l.deleted_at is null
     and l.status in ('won','lost');           -- solo aventuras finalizadas
  select points into v_old from entry_score where entry_id = p_entry;
  if v_old is distinct from v_new and (v_old is not null or v_new > 0) then
    if exists (select 1 from pokemon_entry where id = p_entry) then
      insert into entry_score (entry_id, points, rule_set_id) values (p_entry, v_new, v_rule.id)
      on conflict (entry_id) do update
        set points = excluded.points, rule_set_id = excluded.rule_set_id, calculated_at = now();
      insert into score_history (rule_set_id, entry_id, old_points, new_points, reason)
      values (v_rule.id, p_entry, v_old, v_new, 'recalc');
    end if;
  end if;
end $$;

create function recalc_all_scores() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select entry_id from award union select entry_id from entry_score loop
    perform recalc_entry_score(r.entry_id);
  end loop;
end $$;

create function trg_award_recalc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('hof.purging', true),'') = 'on' then return null; end if;
  perform recalc_entry_score(coalesce(new.entry_id, old.entry_id));
  return null;
end $$;
create trigger award_recalc after insert or update or delete on award
  for each row execute function trg_award_recalc();

create function trg_locke_recalc() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if (new.status, new.deleted_at) is distinct from (old.status, old.deleted_at) then
    for r in select id from pokemon_entry where locke_id = new.id loop
      perform recalc_entry_score(r.id);
    end loop;
  end if;
  return null;
end $$;
create trigger locke_recalc after update on locke
  for each row execute function trg_locke_recalc();

create function trg_category_recalc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.scores_points is distinct from old.scores_points
     or new.deleted_at is distinct from old.deleted_at then
    perform recalc_all_scores();
  end if;
  return null;
end $$;
create trigger category_recalc after update on category
  for each row execute function trg_category_recalc();

create function activate_rule_set(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin_only'; end if;
  update score_rule_set set is_active = false where is_active;
  update score_rule_set set is_active = true where id = p_id;
  if not found then raise exception 'rule_set_missing'; end if;
  perform recalc_all_scores();
end $$;

-- ---------- Rankings (sin exponer propietarios ni fichas no comunitarias) ----------
create view ranking_entry as
select e.id as entry_id, e.nickname, f.id as form_id, f.name as form_name,
       s.id as species_id, s.name as species_name,
       g.id as game_id, gv.id as game_version_id, gg.generation,
       es.points, sa.url as sprite_url,
       (select coalesce(array_agg(distinct b.key), '{}')
          from award a
          join category c on c.id = a.category_id and c.kind = 'official'
          join badge b on b.id = c.badge_id
         where a.entry_id = e.id and a.deleted_at is null) as badges
  from pokemon_entry e
  join entry_score es on es.entry_id = e.id and es.points > 0
  join locke l   on l.id = e.locke_id and l.deleted_at is null
  join form f    on f.id = e.form_id
  join species s on s.id = f.species_id
  join game_version gv on gv.id = l.game_version_id
  join game g    on g.id = gv.game_id
  left join game_group gg on gg.id = g.group_id
  left join sprite_asset sa on sa.id = e.sprite_asset_id
 where e.visibility = 'community' and e.deleted_at is null and is_approved();

create function ranking_species(p_generation int default null, p_game_id uuid default null)
returns table (species_id int, species_name text, entries bigint, avg_points numeric, score numeric)
language sql stable security definer set search_path = public as $$
  with base as (
    select * from ranking_entry r
     where (p_generation is null or r.generation = p_generation)
       and (p_game_id is null or r.game_id = p_game_id)
  ), prior as (select coalesce(avg(points),0) as c from base),
  w as (select species_prior_weight as m from score_rule_set where is_active)
  select b.species_id, b.species_name, count(*), avg(b.points),
         (count(*) * avg(b.points) + w.m * prior.c) / (count(*) + w.m)
    from base b cross join prior cross join w
   group by b.species_id, b.species_name, w.m, prior.c
   order by 5 desc $$;

create view ranking_user as
select p.id as user_id, p.username, p.display_name, p.avatar_url,
       sum(es.points) as points, count(*) as ranked_entries
  from profile p
  join pokemon_entry e on e.owner_id = p.id and e.visibility = 'community' and e.deleted_at is null
  join entry_score es on es.entry_id = e.id and es.points > 0
 where p.show_in_rankings and is_approved()
 group by p.id;

-- ---------- Papelera ----------
-- Devuelve las rutas de Storage a borrar (las elimina la Edge Function purge-trash).
create function purge_trash() returns setof text
language plpgsql security definer set search_path = public as $$
declare v_days int; v_limit timestamptz;
begin
  select coalesce((value #>> '{}')::int, 30) into v_days from app_setting where key = 'trash_retention_days';
  v_limit := now() - make_interval(days => coalesce(v_days, 30));
  perform set_config('hof.purging', 'on', true);

  return query select storage_path from file_asset
    where deleted_at < v_limit
       or locke_id in (select id from locke where deleted_at < v_limit);

  delete from evidence      where deleted_at < v_limit;
  delete from award         where deleted_at < v_limit;
  delete from file_asset    where deleted_at < v_limit;
  delete from pokemon_entry where deleted_at < v_limit;
  delete from locke         where deleted_at < v_limit;
  delete from category      where deleted_at < v_limit;
  perform set_config('hof.purging', 'off', true);
end $$;
