type Shape = 'hex' | 'star' | 'shield' | 'diamond' | 'crown' | 'circle';

const POINTS: Record<Exclude<Shape, 'circle'>, string> = {
  hex: '12,2 21,7 21,17 12,22 3,17 3,7',
  star: '12,2 14.8,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.2,8.6',
  shield: '12,2 20,5 20,12 12,22 4,12 4,5',
  diamond: '12,2 22,12 12,22 2,12',
  crown: '3,19 4,7 9,12 12,5 15,12 20,7 21,19',
};

/** Cada reconocimiento tiene forma Y color propios: no depende solo del color. */
export const MEDALS: Record<string, { shape: Shape; fill: string; label: string }> = {
  league_team:     { shape: 'hex',     fill: '#2f8f86', label: 'Equipo de la Liga' },
  locke_god:       { shape: 'star',    fill: '#d99a12', label: 'Dios del Locke' },
  historic:        { shape: 'shield',  fill: '#a8683c', label: 'Pokémon histórico' },
  league_mvp:      { shape: 'crown',   fill: '#7a4fc4', label: 'MVP de la Liga' },
  game_mvp:        { shape: 'diamond', fill: '#2c6fd6', label: 'MVP del juego' },
  battle_mvp:      { shape: 'circle',  fill: '#c9363f', label: 'MVP de combate' },
  series_mvp:      { shape: 'crown',   fill: '#c78a00', label: 'MVP de la serie' },
  dualocke_legend: { shape: 'shield',  fill: '#6c3fa0', label: 'Leyenda de Dualocke' },
};

export function Medal({ medalKey, label, size = 28 }: { medalKey: string; label?: string; size?: number }) {
  const m = MEDALS[medalKey] ?? { shape: 'circle' as Shape, fill: '#6b7280', label: label ?? 'Reconocimiento' };
  const text = label ?? m.label;
  return (
    <svg className="hof-medal" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={text}>
      <title>{text}</title>
      {m.shape === 'circle'
        ? <circle cx="12" cy="12" r="10" fill={m.fill} stroke="#fff" strokeWidth="1.6" />
        : <polygon points={POINTS[m.shape]} fill={m.fill} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />}
    </svg>
  );
}
