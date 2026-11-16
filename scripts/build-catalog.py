#!/usr/bin/env python3
"""Genera supabase/migrations/0004_catalog.sql (especies y formas) desde los CSV de PokéAPI.

Reglas de la especificación (3.4):
  * Una especie siempre tiene su forma 'base'.
  * Solo se añaden formas que cambien tipos o estadísticas base respecto a la forma base
    (regionales, Deoxys, Rotom, Wormadam...). Los patrones cosméticos NO son formas.
  * Se excluyen cambios solo de combate: Mega, Gigamax, Primigenio y Tótem.
IDs de forma deterministas (uuid5) para que sean idénticos en cualquier entorno.
Uso: python3 scripts/build-catalog.py"""
import csv, io, json, pathlib, re, urllib.request, uuid

BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv"
ROOT = pathlib.Path(__file__).resolve().parent.parent
NS = uuid.UUID("6f1c2b0e-4f3a-4a58-9d6e-0a7c1f2b9e11")
BATTLE_ONLY = re.compile(r"(^|-)(mega|gmax|primal|totem)(-|$)")

def rows(name):
    text = urllib.request.urlopen(f"{BASE}/{name}.csv", timeout=40).read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(text)))

names = json.loads((ROOT / "src/catalog/data/names.en.json").read_text(encoding="utf-8"))["species"]
types = {r["id"]: r["identifier"] for r in rows("types")}
species_rows = rows("pokemon_species")
species = {int(r["id"]): int(r["generation_id"]) for r in species_rows}
species_ident = {int(r["id"]): r["identifier"] for r in species_rows}
pokemon = rows("pokemon")

ptypes, pstats = {}, {}
for r in rows("pokemon_types"):
    ptypes.setdefault(r["pokemon_id"], {})[int(r["slot"])] = types[r["type_id"]]
for r in rows("pokemon_stats"):
    pstats.setdefault(r["pokemon_id"], {})[int(r["stat_id"])] = int(r["base_stat"])

def sig(pid):
    t = ptypes.get(pid, {})
    return (t.get(1), t.get(2)), tuple(pstats.get(pid, {}).get(i) for i in range(1, 7))

base = {int(p["species_id"]): p for p in pokemon if p["is_default"] == "1"}
forms = []   # (species_id, form_key, name, type1, type2, pokeapi_id)
for sid, p in sorted(base.items()):
    (t1, t2), _ = sig(p["id"])
    forms.append((sid, "base", names[sid], t1, t2, int(p["id"])))
for p in pokemon:
    if p["is_default"] == "1":
        continue
    sid = int(p["species_id"])
    if sid not in base:
        continue
    ident = p["identifier"]
    suffix = ident[len(species_ident[sid]):].lstrip("-") if ident.startswith(species_ident[sid]) else ident
    if not suffix or BATTLE_ONLY.search(suffix):
        continue
    if sig(p["id"]) == sig(base[sid]["id"]):          # cosmética: misma tipificación y estadísticas
        continue
    (t1, t2), _ = sig(p["id"])
    forms.append((sid, suffix, f"{names[sid]} ({suffix.replace('-', ' ').title()})", t1, t2, int(p["id"])))

q = lambda s: "null" if s is None else "'" + s.replace("'", "''") + "'"
out = ["-- Generado por scripts/build-catalog.py — no editar a mano.",
       "-- Origen: PokéAPI (CSV). Ver SOURCES.md.", "",
       "insert into species (id, name, generation) values"]
out.append(",\n".join(f"  ({sid}, {q(names[sid])}, {species[sid]})" for sid in sorted(base)))
out.append("on conflict (id) do nothing;\n")
out.append("insert into form (id, species_id, form_key, name, type1, type2, pokeapi_id) values")
out.append(",\n".join(
    f"  ('{uuid.uuid5(NS, f'form:{sid}:{key}')}', {sid}, {q(key)}, {q(n)}, {q(t1)}, {q(t2)}, {pid})"
    for sid, key, n, t1, t2, pid in forms))
out.append("on conflict (species_id, form_key) do update set pokeapi_id = excluded.pokeapi_id;\n")
(ROOT / "supabase/migrations/0004_catalog.sql").write_text("\n".join(out), encoding="utf-8")
extra = [f for f in forms if f[1] != "base"]
print(f"{len(base)} especies, {len(forms)} formas ({len(extra)} adicionales)")
