-- Prueba de humo: reglas, permisos (RLS), versiones y rankings.
-- Ejecutar en una base vacía tras las migraciones 0001-0003 (usa stubs de auth en local).
-- No cargar antes 0004/0005: esta prueba crea sus propios datos de ejemplo.
\set ON_ERROR_STOP on
create schema if not exists t;
create function t.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function t.as_root() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub','', false); end $$;
create function t.fails(q text, expect text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm like '%' || expect || '%' then return; end if;
    raise exception 'FALLO: "%" esperaba "%" y dio "%"', q, expect, sqlerrm; end;
  raise exception 'FALLO: "%" debía fallar con "%"', q, expect;
end $$;
create function t.eq(label text, got anyelement, want anyelement) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FALLO %: obtuve %, esperaba %', label, got, want; end if;
  raise notice 'ok  %', label; end $$;
grant usage on schema t to authenticated; grant execute on all functions in schema t to authenticated;

-- Usuarios: A (admin), B (amigo de A), C (desconocido)
insert into auth.users (id) values
 ('aaaaaaaa-0000-0000-0000-000000000001'),('bbbbbbbb-0000-0000-0000-000000000002'),('cccccccc-0000-0000-0000-000000000003');
select set_config('hof.privileged','on',false);
update profile set approved = true where true;
update profile set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into friendship (requester_id, addressee_id, status)
 values ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','accepted');
select set_config('hof.privileged','off',false);

-- Catálogo mínimo
insert into game_group (id, name, generation) values ('11111111-0000-0000-0000-000000000001','Kanto',1);
insert into game (id, group_id, name, is_official) values ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','Rojo/Azul',true);
insert into game_version (id, game_id, label) values ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','Rojo');
insert into species values (6,'Charizard',1),(5,'Charmeleon',1);
insert into form (id, species_id, name, type1, type2) values
 ('44444444-0000-0000-0000-000000000006',6,'Charizard','fire','flying'),
 ('44444444-0000-0000-0000-000000000005',5,'Charmeleon','fire',null);

select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into locke (id, owner_id, title, game_version_id, visibility, rival_user_id)
 values ('55555555-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Mi locke','33333333-0000-0000-0000-000000000001','friends','bbbbbbbb-0000-0000-0000-000000000002');
insert into pokemon_entry (id, locke_id, form_id, nickname, visibility) values
 ('66666666-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000005','Chary','community'),
 ('66666666-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000005','Amigo','friends'),
 ('66666666-0000-0000-0000-000000000003','55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000005','Secreto','private');
insert into league_team_member (locke_id, entry_id) values
 ('55555555-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000001'),
 ('55555555-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000002');
select t.eq('award auto de equipo de Liga', (select count(*) from award where deleted_at is null), 2::bigint);

-- MVP de Liga: solo equipo de Liga, y único por locke
insert into award (entry_id, locke_id, category_id) select '66666666-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001', id from category where key='league_mvp';
select t.fails($q$insert into award (entry_id, locke_id, category_id) select '66666666-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000001', id from category where key='league_mvp'$q$, 'award_unique_per_locke');
select t.fails($q$insert into award (entry_id, locke_id, category_id) select '66666666-0000-0000-0000-000000000003','55555555-0000-0000-0000-000000000001', id from category where key='league_mvp'$q$, 'award_requires_league_team');
select t.fails($q$delete from league_team_member where entry_id='66666666-0000-0000-0000-000000000001'$q$, 'remove_mvp_first');
-- MVP del juego para un Pokémon que no está en la Liga, y muerto
update pokemon_entry set status='dead', version = version where id='66666666-0000-0000-0000-000000000003';
insert into award (entry_id, locke_id, category_id) select '66666666-0000-0000-0000-000000000003','55555555-0000-0000-0000-000000000001', id from category where key='game_mvp';

-- Puntuación: nada hasta finalizar el locke
select t.eq('sin puntos con locke en curso', (select count(*) from entry_score where points>0), 0::bigint);
update locke set status='won', result='victory', finished_on=current_date, version = version where id='55555555-0000-0000-0000-000000000001';
select t.eq('puntos Chary (equipo + MVP liga)', (select points from entry_score where entry_id='66666666-0000-0000-0000-000000000001'), 2);

-- Versiones y evolución
select t.fails($q$update pokemon_entry set nickname='X', version = 99 where id='66666666-0000-0000-0000-000000000001'$q$, 'version_conflict');
update pokemon_entry set form_id='44444444-0000-0000-0000-000000000006', version = (select version from pokemon_entry where id='66666666-0000-0000-0000-000000000001') where id='66666666-0000-0000-0000-000000000001';
select t.eq('historial de ficha (creada + evolución)', (select count(*) from pokemon_entry_version where entry_id='66666666-0000-0000-0000-000000000001'), 2::bigint);
select t.eq('evento de evolución', (select event::text from pokemon_entry_version where entry_id='66666666-0000-0000-0000-000000000001' and seq=2), 'evolved');
select t.eq('historial del locke', (select count(*) > 1 from locke_history), true);

-- Equipo de Liga máximo 6
insert into pokemon_entry (locke_id, form_id) select '55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000005' from generate_series(1,5);
insert into league_team_member (locke_id, entry_id) select '55555555-0000-0000-0000-000000000001', id from pokemon_entry where id not in (select entry_id from league_team_member) and nickname is null limit 4;
select t.fails($q$insert into league_team_member (locke_id, entry_id) select '55555555-0000-0000-0000-000000000001', id from pokemon_entry where id not in (select entry_id from league_team_member) and nickname is null limit 1$q$, 'league_team_full');

-- Permisos: amigo ve friends/community, no private; desconocido no ve nada
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.eq('B ve fichas friends+community', (select count(*) from pokemon_entry where nickname in ('Chary','Amigo')), 2::bigint);
select t.eq('B no ve la privada', (select count(*) from pokemon_entry where nickname='Secreto'), 0::bigint);
do $$ declare n int; begin update locke set title='hack' where id='55555555-0000-0000-0000-000000000001'; get diagnostics n = row_count; if n <> 0 then raise exception 'FALLO: B edita un locke ajeno'; end if; raise notice 'ok  B no puede editar lockes ajenos'; end $$;
select t.eq('B no ve archivos/historial de A', (select count(*) from locke_history), 0::bigint);
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.eq('C no ve lockes de A', (select count(*) from locke), 0::bigint);
select t.eq('C no ve fichas de A', (select count(*) from pokemon_entry), 0::bigint);
select t.eq('C ve ranking solo con fichas comunidad', (select count(*) from ranking_entry), 1::bigint);
select t.eq('el ranking no expone propietario', (select count(*) from information_schema.columns where table_name='ranking_entry' and column_name like '%owner%'), 0::bigint);
select t.fails($q$update profile set role='admin' where id='cccccccc-0000-0000-0000-000000000003'$q$, 'profile_protected_columns');
select t.fails($q$insert into entry_score values (gen_random_uuid(), 99, null)$q$, 'row-level security');
select t.eq('ranking por especie', (select count(*) from ranking_species()), 1::bigint);

-- Categorías compartidas con aceptación de cambios
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into category (id, kind, owner_id, name, visibility) values ('77777777-0000-0000-0000-000000000001','custom','aaaaaaaa-0000-0000-0000-000000000001','Mi categoría','community');
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select subscribe_category('77777777-0000-0000-0000-000000000001');
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
update category set name='Mi categoría v2', version = (select version from category where id='77777777-0000-0000-0000-000000000001') where id='77777777-0000-0000-0000-000000000001';
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.eq('C tiene cambio pendiente', (select pending_revision from category_subscription), 2);
select t.eq('C conserva su versión hasta aceptar', (select name from category_version where category_id='77777777-0000-0000-0000-000000000001' and revision=(select accepted_revision from category_subscription)), 'Mi categoría');
select accept_category_update('77777777-0000-0000-0000-000000000001');
select t.eq('tras aceptar', (select accepted_revision from category_subscription), 2);
select t.fails($q$insert into category (kind, owner_id, name, scores_points) values ('custom','cccccccc-0000-0000-0000-000000000003','x', true)$q$, 'violates check');

-- Revocar amistad revoca acceso
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
delete from friendship;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.eq('B pierde acceso al eliminar la amistad', (select count(*) from pokemon_entry), 0::bigint);

-- Papelera: retención
select t.as_root();
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
update locke set deleted_at = now() - interval '40 days', version = (select version from locke) where id='55555555-0000-0000-0000-000000000001';
select t.as_root();
select count(*) from purge_trash();
select t.eq('purga definitiva tras la retención', (select count(*) from locke), 0::bigint);
\echo TODAS LAS PRUEBAS PASARON
