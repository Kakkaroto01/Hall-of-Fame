import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/local';
import { PokemonCard } from '../ui/PokemonCard';
import { useSprite } from '../ui/useSprite';
import { spriteCandidates } from '../catalog/sprites';

export function Pokedex() {
  const [species, setSpecies] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(null);
  const [filterGeneration, setFilterGeneration] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    db.species.toArray().then(setSpecies);
    db.form.toArray().then(setForms);
  }, []);

  const generations = Array.from(new Set(species.map((s) => s.generation).filter(Boolean))).sort((a, b) => a - b);

  const filteredSpecies = species.filter((s) => {
    const genOk = filterGeneration === null || s.generation === filterGeneration;
    const searchOk = s.name.toLowerCase().includes(search.toLowerCase());
    return genOk && searchOk;
  });

  const speciesForms = forms.filter((f: any) => f.species_id === selectedSpeciesId);

  const getSprite = (form: any) => {
    const candidates = spriteCandidates({
      pokeapiId: form.pokeapi_id ?? 0,
      set: 'home',
      shiny: false,
    });
    const { url } = useSprite(candidates);
    return url;
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Pokédex Global</h1>
      </div>

      <div style={{ maxWidth: '900px', marginBottom: 18, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar especie…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select
          value={filterGeneration ?? ''}
          onChange={(e) => setFilterGeneration(e.target.value ? Number(e.target.value) : null)}
          style={{ minWidth: '140px' }}
        >
          <option value="">Todas las generaciones</option>
          {generations.map((g) => (
            <option key={g} value={g}>
              Generación {g}
            </option>
          ))}
        </select>
      </div>

      <p className="muted">
        {filteredSpecies.length} especies · {speciesForms.length} formas seleccionadas
      </p>

      <div className="cards" style={{ maxWidth: '1100px' }}>
        {filteredSpecies.length === 0 ? (
          <p className="muted">No se encontraron especies.</p>
        ) : (
          filteredSpecies.map((s: any) => {
            const spForms = speciesForms.filter((f: any) => f.species_id === s.id);
            const baseForm = spForms.find((f: any) => f.form_key === 'base') || spForms[0];
            const spriteUrl = baseForm ? getSprite(baseForm) : null;
            return (
              <div key={s.id} className="item item--col" style={{ maxWidth: 260, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                  {spriteUrl ? (
                    <img src={spriteUrl} alt={s.name} style={{ width: 48, height: 48, imageRendering: 'pixelated' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: 'var(--line)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', color: 'var(--soft)' }}>
                      ?
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>
                      <Link to={`/pokedex/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {`#${s.id}`} {s.name}
                      </Link>
                    </h3>
                    <p className="muted small" style={{ margin: 0 }}>
                      Gen {s.generation} · {spForms.length} forma{spForms.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
