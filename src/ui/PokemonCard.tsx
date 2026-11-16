import { useEffect, useRef, useState } from 'react';
import type { StatBlock } from '../import/types';
import { animatedUrl, spriteCandidates, type SpriteSet } from '../catalog/sprites';
import { Medal } from './Medal';
import { pastelFor, TYPE_NAME_ES } from './typeStyle';
import { useSprite } from './useSprite';
import './card.css';

export interface CardAward { key: string; label?: string; note?: string | null }

export interface CardData {
  nickname: string | null;
  speciesName: string;
  formName?: string | null;
  level: number | null;
  types: [string, string | null];
  gender: 'M' | 'F' | 'N' | null;
  shiny: boolean;
  dead: boolean;
  deathNote?: string | null;
  pokeapiId: number;
  spriteSet: SpriteSet;
  /** Sprite elegido por el usuario o de un fangame (tiene prioridad) */
  spriteUrl?: string | null;
  nature?: string | null;
  ability?: string | null;
  heldItem?: string | null;
  moves: string[];
  stats: StatBlock | null;
  ivs: StatBlock | null;
  evs: StatBlock | null;
  awards: CardAward[];
}

const STATS: { key: keyof StatBlock; label: string }[] = [
  { key: 'hp', label: 'PS' }, { key: 'atk', label: 'Ataque' }, { key: 'def', label: 'Defensa' },
  { key: 'spa', label: 'At. Esp.' }, { key: 'spd', label: 'Def. Esp.' }, { key: 'spe', label: 'Velocidad' },
];
const GENDER = { M: ['♂', 'Macho'], F: ['♀', 'Hembra'], N: ['', 'Sin sexo'] } as const;

export function PokemonCard({ data, spriteBase, startFlipped = false }: {
  data: CardData; spriteBase?: string; startFlipped?: boolean;
}) {
  const [flipped, setFlipped] = useState(startFlipped);
  const [playing, setPlaying] = useState(0);            // >0: reproduciendo animación (clave para reiniciar el GIF)
  const zoom = useRef<HTMLDialogElement>(null);
  const front = useRef<HTMLElement>(null);
  const back = useRef<HTMLElement>(null);

  // La cara oculta no debe recibir foco ni lectores de pantalla (inert por efecto: vale en React 18 y 19).
  useEffect(() => {
    front.current?.toggleAttribute('inert', flipped);
    back.current?.toggleAttribute('inert', !flipped);
  }, [flipped]);

  const candidates = spriteCandidates({ pokeapiId: data.pokeapiId, set: data.spriteSet, shiny: data.shiny, base: spriteBase });
  const { url, loading } = useSprite(candidates, data.spriteUrl);
  const anim = data.spriteUrl ? null : animatedUrl({ pokeapiId: data.pokeapiId, shiny: data.shiny, base: spriteBase });

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPlaying(0), 2800);
    return () => clearTimeout(t);
  }, [playing]);

  const title = data.nickname || data.speciesName;
  const showSpecies = data.nickname ? data.formName || data.speciesName : data.formName && data.formName !== data.speciesName ? data.formName : null;
  const [g, gLabel] = data.gender ? GENDER[data.gender] : ['', ''];
  const onSprite = () => (anim ? setPlaying((n) => n + 1) : zoom.current?.showModal());
  const shown = playing && anim ? anim : url;
  const pixelated = data.spriteSet !== 'home' && data.spriteSet !== 'x-y';

  return (
    <article className="hof-card" data-flipped={flipped} data-dead={data.dead}
             style={{ ['--tint' as string]: pastelFor(data.types[0]) }}
             aria-label={`Ficha de ${title}`}>
      <div className="hof-card__inner">
        {/* ---------- Cara principal ---------- */}
        <section ref={front} className="hof-face hof-face--front" aria-hidden={flipped}>
          <div className="hof-stage">
            <button type="button" className="hof-sprite" onClick={onSprite}
                    aria-label={anim ? `Reproducir animación de ${data.speciesName}` : `Ampliar sprite de ${data.speciesName}`}>
              {shown
                ? <img key={playing} src={shown} alt={`Sprite de ${data.speciesName}${data.shiny ? ' variocolor' : ''}`}
                       data-pixelated={pixelated} onError={() => setPlaying(0)} />
                : <span className="hof-sprite__empty">{loading ? 'Cargando…' : data.speciesName}</span>}
            </button>
            {data.dead && <span className="hof-ribbon">Caído</span>}
            {data.shiny && <span className="hof-shiny"><Medal medalKey="locke_god" label="Variocolor" size={16} />Variocolor</span>}
          </div>
          <header className="hof-id">
            <h3>{title}{g && <span className="hof-gender" aria-label={gLabel}>{g}</span>}</h3>
            {showSpecies && <p className="hof-species">{showSpecies}</p>}
            <div className="hof-meta">
              {data.level !== null && <span className="hof-level">Nv. {data.level}</span>}
              <ul className="hof-types" aria-label="Tipos">
                {data.types.filter(Boolean).map((t) => (
                  <li key={t} className="hof-type" style={{ ['--dot' as string]: pastelFor(t) }}>{TYPE_NAME_ES[t!] ?? t}</li>
                ))}
              </ul>
            </div>
          </header>
          <ul className="hof-medals" aria-label="Reconocimientos">
            {data.awards.length === 0 && <li className="hof-none">Sin reconocimientos</li>}
            {data.awards.map((a, i) => <li key={a.key + i}><Medal medalKey={a.key} label={a.label} /></li>)}
          </ul>
          <button type="button" className="hof-flip" aria-pressed={flipped} onClick={() => setFlipped(true)}>Ver detalles</button>
        </section>

        {/* ---------- Cara posterior ---------- */}
        <section ref={back} className="hof-face hof-face--back" aria-hidden={!flipped}>
          <h3 className="hof-back-title">{title}</h3>
          <dl className="hof-facts">
            {data.nature && (<><dt>Naturaleza</dt><dd>{data.nature}</dd></>)}
            {data.ability && (<><dt>Habilidad</dt><dd>{data.ability}</dd></>)}
            {data.heldItem && (<><dt>Objeto</dt><dd>{data.heldItem}</dd></>)}
          </dl>
          {data.stats ? (
            <table className="hof-stats">
              <caption className="hof-sr">Estadísticas</caption>
              <thead><tr><th scope="col">Stat</th><th scope="col">Final</th><th scope="col">IV</th><th scope="col">EV</th></tr></thead>
              <tbody>
                {STATS.map(({ key, label }) => (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    <td><span className="hof-bar" style={{ ['--v' as string]: Math.min(1, data.stats![key] / 300) }} />{data.stats![key]}</td>
                    <td>{data.ivs?.[key] ?? '–'}</td><td>{data.evs?.[key] ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="hof-note">Este archivo no incluye estadísticas finales.</p>}
          {data.moves.length > 0 && (
            <ul className="hof-moves" aria-label="Movimientos">{data.moves.map((m) => <li key={m}>{m}</li>)}</ul>
          )}
          {data.awards.some((a) => a.note) && (
            <ul className="hof-why" aria-label="Por qué obtuvo cada reconocimiento">
              {data.awards.filter((a) => a.note).map((a, i) => (
                <li key={a.key + i}><Medal medalKey={a.key} label={a.label} size={18} /><span>{a.note}</span></li>
              ))}
            </ul>
          )}
          {data.dead && data.deathNote && <p className="hof-note"><strong>Caído:</strong> {data.deathNote}</p>}
          <button type="button" className="hof-flip" aria-pressed={flipped} onClick={() => setFlipped(false)}>Volver</button>
        </section>
      </div>

      <dialog ref={zoom} className="hof-zoom" onClick={(e) => e.target === zoom.current && zoom.current?.close()}>
        {url && <img src={url} alt={`Sprite ampliado de ${data.speciesName}`} data-pixelated={pixelated} />}
        <form method="dialog"><button className="hof-flip">Cerrar</button></form>
      </dialog>
    </article>
  );
}
