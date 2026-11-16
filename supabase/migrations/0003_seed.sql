-- =====================================================================
-- 0003 — Datos iniciales: ajustes, insignias, categorías oficiales, reglas
-- =====================================================================
insert into app_setting (key, value) values
  ('trash_retention_days', '30'),
  ('max_file_mb', '10')
on conflict (key) do nothing;

insert into badge (key, name) values
  ('league_team',       'Equipo de la Liga'),
  ('locke_god',         'Dios del Locke'),
  ('historic',          'Pokémon histórico'),
  ('league_mvp',        'MVP de la Liga'),
  ('game_mvp',          'MVP del juego'),
  ('battle_mvp',        'MVP de combate'),
  ('series_mvp',        'MVP global de la serie'),
  ('dualocke_legend',   'Leyenda de Dualocke')
on conflict (key) do nothing;

insert into category (kind, key, name, description, selection, scores_points, visibility, badge_id)
select 'official', v.key, v.name, v.descr, v.sel::selection_rule, true, 'community',
       (select id from badge where badge.key = v.key)
from (values
  ('league_team',     'Equipo de la Liga',      'Pokémon que participaron en la Liga (máx. 6).',       'league_team'),
  ('locke_god',       'Dioses del Locke',       'Elegidos manualmente por el jugador.',                'manual'),
  ('historic',        'Pokémon históricos',     'Elegidos manualmente por el jugador.',                'manual'),
  ('league_mvp',      'MVP de la Liga',         'Uno de los seis del equipo de la Liga.',              'league_mvp'),
  ('game_mvp',        'MVP del juego',          'Cualquier Pokémon del locke, incluidos los muertos.', 'game_mvp'),
  ('battle_mvp',      'MVP de combate',         'Uno por combate en lockes PvP.',                      'battle_mvp'),
  ('series_mvp',      'MVP global de la serie', 'Uno por serie PvP.',                                  'series_mvp'),
  ('dualocke_legend', 'Leyendas de Dualocke',   'Elegidos manualmente por el jugador.',                'manual')
) as v(key, name, descr, sel)
on conflict (key) do nothing;

insert into score_rule_set (revision, is_active, base_points, species_prior_weight, notes)
values (1, true, 1, 3, 'Reglas iniciales: mismo valor base para todo reconocimiento oficial puntuable.')
on conflict (revision) do nothing;

-- Primer administrador (ejecutar a mano tras registrarte):
--   update profile set role = 'admin', approved = true where id = '<tu-uuid>';
-- Crear invitaciones:
--   insert into invite_code (code) values ('ABC123');
