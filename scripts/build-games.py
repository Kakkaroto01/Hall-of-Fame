#!/usr/bin/env python3
"""Genera supabase/migrations/0005_games.sql: grupos, juegos oficiales y versiones.

Agrupación (especificación 3.1): X e Y juntos; HeartGold/SoulSilver en un grupo propio,
independiente de Diamante/Perla/Platino; los remakes se distinguen de los originales;
hackroms y fangames tienen su propia sección (grupo vacío, lo rellenan los usuarios).
`features` de cada versión: sprite_set (carpeta de sprites), abilities, natures, tera.
No se incluyen portadas (son material con copyright): cover_url queda nulo y la interfaz
usa un fondo temático por grupo. Uso: python3 scripts/build-games.py"""
import json, pathlib, uuid

ROOT = pathlib.Path(__file__).resolve().parent.parent
NS = uuid.UUID("a3d5c1f0-7b2e-4c9a-8f61-3e2d1b0c4a77")
uid = lambda *k: str(uuid.uuid5(NS, ":".join(k)))
q = lambda s: "'" + s.replace("'", "''") + "'"

# (clave, nombre, generación o None, color)
GROUPS = [
  ("g1", "Generación I", 1, "#e53935"), ("g2", "Generación II", 2, "#fbc02d"),
  ("g3", "Generación III", 3, "#1e88e5"), ("g3r", "Generación III · Remakes", 3, "#ef6c00"),
  ("g4", "Generación IV", 4, "#8e8ec9"), ("g4r", "Generación IV · Remakes", 4, "#c9a227"),
  ("g5", "Generación V", 5, "#455a64"), ("g6", "Generación VI", 6, "#3949ab"),
  ("g6r", "Generación VI · Remakes", 6, "#d81b60"), ("g7", "Generación VII", 7, "#fb8c00"),
  ("g7r", "Generación VII · Remakes", 7, "#fdd835"), ("g8", "Generación VIII", 8, "#00acc1"),
  ("g8r", "Generación VIII · Remakes", 8, "#7e57c2"), ("g9", "Generación IX", 9, "#c62828"),
  ("fan", "Hackroms y fangames", None, "#546e7a"),
]
# (grupo, juego, tipo, [(versión, sprite_set, abilities, natures, tera)])
G = [
 ("g1","Pokémon Rojo / Azul","main",[("Rojo","red-blue",0,0,0),("Azul","red-blue",0,0,0)]),
 ("g1","Pokémon Amarillo","main",[("Amarillo","yellow",0,0,0)]),
 ("g2","Pokémon Oro / Plata","main",[("Oro","gold",0,0,0),("Plata","silver",0,0,0)]),
 ("g2","Pokémon Cristal","main",[("Cristal","crystal",0,0,0)]),
 ("g3","Pokémon Rubí / Zafiro","main",[("Rubí","ruby-sapphire",1,1,0),("Zafiro","ruby-sapphire",1,1,0)]),
 ("g3","Pokémon Esmeralda","main",[("Esmeralda","emerald",1,1,0)]),
 ("g3r","Pokémon Rojo Fuego / Verde Hoja","remake",[("Rojo Fuego","firered-leafgreen",1,1,0),("Verde Hoja","firered-leafgreen",1,1,0)]),
 ("g4","Pokémon Diamante / Perla","main",[("Diamante","diamond-pearl",1,1,0),("Perla","diamond-pearl",1,1,0)]),
 ("g4","Pokémon Platino","main",[("Platino","platinum",1,1,0)]),
 ("g4r","Pokémon HeartGold / SoulSilver","remake",[("HeartGold","heartgold-soulsilver",1,1,0),("SoulSilver","heartgold-soulsilver",1,1,0)]),
 ("g5","Pokémon Negro / Blanco","main",[("Negro","black-white",1,1,0),("Blanco","black-white",1,1,0)]),
 ("g5","Pokémon Negro 2 / Blanco 2","main",[("Negro 2","black-white",1,1,0),("Blanco 2","black-white",1,1,0)]),
 ("g6","Pokémon X / Y","main",[("X","x-y",1,1,0),("Y","x-y",1,1,0)]),
 ("g6r","Pokémon Rubí Omega / Zafiro Alfa","remake",[("Rubí Omega","x-y",1,1,0),("Zafiro Alfa","x-y",1,1,0)]),
 ("g7","Pokémon Sol / Luna","main",[("Sol","home",1,1,0),("Luna","home",1,1,0)]),
 ("g7","Pokémon Ultrasol / Ultraluna","main",[("Ultrasol","home",1,1,0),("Ultraluna","home",1,1,0)]),
 ("g7r","Pokémon Let's Go, Pikachu! / Eevee!","remake",[("Let's Go, Pikachu!","home",0,1,0),("Let's Go, Eevee!","home",0,1,0)]),
 ("g8","Pokémon Espada / Escudo","main",[("Espada","home",1,1,0),("Escudo","home",1,1,0)]),
 ("g8","Leyendas Pokémon: Arceus","spinoff",[("Arceus","home",0,1,0)]),
 ("g8r","Pokémon Diamante Brillante / Perla Reluciente","remake",[("Diamante Brillante","home",1,1,0),("Perla Reluciente","home",1,1,0)]),
 ("g9","Pokémon Escarlata / Púrpura","main",[("Escarlata","home",1,1,1),("Púrpura","home",1,1,1)]),
 ("g9","Leyendas Pokémon: Z-A","spinoff",[("Z-A","home",1,1,0)]),
]
out = ["-- Generado por scripts/build-games.py — no editar a mano.", "",
       "insert into game_group (id, name, generation, sort_order, theme) values"]
out.append(",\n".join(
  f"  ('{uid('group',k)}', {q(n)}, {g if g else 'null'}, {i*10}, {q(json.dumps({'accent': c}))}::jsonb)"
  for i,(k,n,g,c) in enumerate(GROUPS)))
out.append("on conflict (id) do nothing;\n")
games, versions = [], []
for i,(gk,name,kind,vs) in enumerate(G):
    games.append(f"  ('{uid('game',name)}', '{uid('group',gk)}', {q(name)}, '{kind}', true)")
    for j,(label,sset,ab,na,te) in enumerate(vs):
        feat = json.dumps({"sprite_set": sset, "abilities": bool(ab), "natures": bool(na), "tera": bool(te)})
        versions.append(f"  ('{uid('version',name,label)}', '{uid('game',name)}', {q(label)}, {q(feat)}::jsonb, {i*10+j})")
out.append("insert into game (id, group_id, name, kind, is_official) values")
out.append(",\n".join(games)+"\non conflict (id) do nothing;\n")
out.append("insert into game_version (id, game_id, label, features, sort_order) values")
out.append(",\n".join(versions)+"\non conflict (id) do nothing;\n")
(ROOT/"supabase/migrations/0005_games.sql").write_text("\n".join(out), encoding="utf-8")
print(len(GROUPS),"grupos,",len(G),"juegos,",len(versions),"versiones")
