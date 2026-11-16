import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../db/local';
import { loadNames } from '../catalog/names';
import { DISPLAY_LANG } from '../config';
import { spriteCandidates } from '../catalog/sprites';

export function PokedexDetail() {
  const { id } = useParams<{ id: string }>();
  const [species, setSpecies] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [names, setNames] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    db.species.get(Number(id)).then(setSpecies);
    db.form.where('species_id').equals(Number(id)).toArray().then(setForms);
    loadNames(DISPLAY_LANG).then(setNames);
  }, [id]);

  if (!species) return <section className="page"><p className="muted">Cargando especie…</p></section>;

  const typeNames: Record<string, string> = {
    normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
    ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
    psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
    dark: 'Siniestro', steel: 'Acero', fairy: 'Hada',
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>
          #{species.id} {names?.species?.[species.id] ?? species.name}
        </h1>
        <Link to="/pokedex" className="btn btn--ghost">Volver al Pokédex</Link>
      </div>

      <p className="muted small">Generación {species.generation}</p>

      <h2 style={{ marginTop: 20 }}>Formas ({forms.length})</h2>
      <div className="cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
        {forms.length === 0 ? (
          <p className="muted">Sin formas registradas.</p>
        ) : (
          forms.map((f: any) => {
            const candidates = spriteCandidates({
              pokeapiId: f.pokeapi_id ?? 0,
              set: 'home',
              shiny: false,
            });
            const spriteUrl = candidates.length > 0 ? candidates[0] : null;
            const types = [f.type1, f.type2].filter(Boolean);
            return (
              <div key={f.id} className="item item--col" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {spriteUrl ? (
                  <img src={spriteUrl} alt={f.name} style={{ width: 96, height: 96, imageRendering: 'pixelated', marginBottom: 10 }} />
                ) : (
                  <div style={{ width: 96, height: 96, background: 'var(--line)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', color: 'var(--soft)', marginBottom: 10 }}>
                    ?
                  </div>
                )}
                <h3 style={{ margin: '4px 0 2px', fontSize: '1rem' }}>{f.form_key === 'base' ? 'Base' : f.name}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {types.map((t) => typeNames[t] ?? t).join(' / ') || '—'}
                </p>
                {f.pokeapi_id && (
                  <p className="muted small" style={{ margin: '4px 0 0' }}>
                    PokéAPI #{f.pokeapi_id}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
