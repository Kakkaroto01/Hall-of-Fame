#!/usr/bin/env python3
"""Regenera src/catalog/data/names.{en,es}.json desde las tablas de texto de PKHeX.
Los índices coinciden con los IDs que usan los archivos .pk* (especie, movimiento,
habilidad, objeto, naturaleza). Uso: python3 scripts/build-names.py"""
import json, pathlib, urllib.request

BASE = "https://raw.githubusercontent.com/kwsch/PKHeX/master/PKHeX.Core/Resources/text"
SOURCES = {
    "species":   "other/{l}/text_Species_{l}.txt",
    "moves":     "other/{l}/text_Moves_{l}.txt",
    "abilities": "other/{l}/text_Abilities_{l}.txt",
    "natures":   "other/{l}/text_Natures_{l}.txt",
    "items":     "items/text_Items_{l}.txt",
}
out_dir = pathlib.Path(__file__).resolve().parent.parent / "src/catalog/data"
out_dir.mkdir(parents=True, exist_ok=True)

for lang in ("en", "es"):
    data = {}
    for key, path in SOURCES.items():
        url = f"{BASE}/{path.format(l=lang)}"
        text = urllib.request.urlopen(url, timeout=30).read().decode("utf-8")
        data[key] = [line.strip() for line in text.rstrip("\n").split("\n")]
    (out_dir / f"names.{lang}.json").write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(lang, {k: len(v) for k, v in data.items()})
