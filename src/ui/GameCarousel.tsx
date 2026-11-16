import { useCallback, useEffect, useRef, useState } from 'react';
import './carousel.css';

export interface CarouselGame {
  id: string;
  name: string;
  kind: 'main' | 'remake' | 'spinoff' | 'hackrom' | 'fangame';
  groupName: string;
  accent: string;
  coverUrl?: string | null;
  versions: string[];
}

const KIND_LABEL: Partial<Record<CarouselGame['kind'], string>> = { remake: 'Remake', spinoff: 'Spin-off', hackrom: 'Hackrom', fangame: 'Fangame' };

/**
 * Selector de juegos en carrusel (inspirado en el de Wii U): el juego centrado crece y
 * los de los lados se apagan. Teclado: ← → y Enter. Sin movimiento si el sistema lo reduce.
 */
export function GameCarousel({ games, selectedId, onSelect, onOpen, openLabel = (n) => `Ver lockes de ${n}` }: {
  games: CarouselGame[]; selectedId?: string; onSelect?: (g: CarouselGame) => void; onOpen: (g: CarouselGame) => void;
  openLabel?: (shortName: string) => string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const raf = useRef(0);
  const [active, setActive] = useState(() => Math.max(0, games.findIndex((g) => g.id === selectedId)));
  const current = games[active];

  // Calcula cuánto se aleja cada tarjeta del centro (--d: 0 centro … 1 lejos) y el índice activo.
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      c.style.setProperty('--d', String(Math.min(1, dist / (el.clientWidth / 2))));
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    setActive((prev) => (prev === best ? prev : best));
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    const onScroll = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(measure); };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf.current); };
  }, [measure, games.length]);

  useEffect(() => { if (current) onSelect?.(current); }, [current, onSelect]);

  const go = (i: number) => {
    const el = track.current;
    const target = el?.children[Math.max(0, Math.min(games.length - 1, i))] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(games.length - 1); }
  };

  if (games.length === 0) return <p className="hof-carousel__empty">Aún no hay juegos. Añade un hackrom o fangame para empezar.</p>;

  return (
    <section className="hof-carousel" aria-roledescription="carrusel" aria-label="Juegos">
      <p className="hof-carousel__group" aria-live="polite">{current.groupName}</p>
      <div className="hof-carousel__row">
        <button type="button" className="hof-carousel__arrow" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Juego anterior">‹</button>
        <ul className="hof-carousel__track" ref={track} tabIndex={0} onKeyDown={onKey} aria-label="Lista de juegos">
          {games.map((g, i) => (
            <li key={g.id} className="hof-game" data-active={i === active} style={{ ['--accent' as string]: g.accent }}>
              <button type="button" className="hof-game__cover" tabIndex={-1}
                      aria-label={`${g.name}${KIND_LABEL[g.kind] ? `, ${KIND_LABEL[g.kind]}` : ''}`}
                      onClick={() => (i === active ? onOpen(g) : go(i))}>
                {g.coverUrl && <img src={g.coverUrl} alt="" />}
                <span className="hof-game__name">{g.name.replace(/^Pokémon /, '')}</span>
                {KIND_LABEL[g.kind] && <span className="hof-game__kind">{KIND_LABEL[g.kind]}</span>}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="hof-carousel__arrow" onClick={() => go(active + 1)} disabled={active === games.length - 1} aria-label="Juego siguiente">›</button>
      </div>
      <div className="hof-carousel__info">
        <p className="hof-carousel__versions">{current.versions.join(' · ')}</p>
        <button type="button" className="hof-carousel__open" onClick={() => onOpen(current)}>{openLabel(current.name.replace(/^Pokémon /, ''))}</button>
      </div>
    </section>
  );
}
