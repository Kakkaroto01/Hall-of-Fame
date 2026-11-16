export type LockeStatus = 'in_progress' | 'won' | 'lost' | 'abandoned';
export type LockeResult = 'victory' | 'lives_depleted' | 'wipeout' | 'lost_matches' | 'voluntary_abandon';

/** Los cinco resultados de la especificación (4.3) y el estado que implica cada uno. */
export const RESULT_OPTIONS: { result: LockeResult; status: Exclude<LockeStatus, 'in_progress'>; label: string; help: string }[] = [
  { result: 'victory', status: 'won', label: 'Victoria', help: 'Completaste la aventura según tus reglas.' },
  { result: 'lives_depleted', status: 'lost', label: 'Derrota por vidas', help: 'Agotaste las vidas permitidas.' },
  { result: 'wipeout', status: 'lost', label: 'Wipeout', help: 'Perdiste todo el equipo en un combate.' },
  { result: 'lost_matches', status: 'lost', label: 'Derrota por combates', help: 'En un locke PvP, tu rival ganó la mayoría de los combates.' },
  { result: 'voluntary_abandon', status: 'abandoned', label: 'Abandono voluntario', help: 'Dejaste la aventura sin terminarla.' },
];

export const STATUS_LABEL: Record<LockeStatus, string> = {
  in_progress: 'En curso', won: 'Ganado', lost: 'Perdido', abandoned: 'Abandonado',
};

export const VISIBILITY_LABEL = { private: 'Privado', friends: 'Amigos', community: 'Comunidad' } as const;
export type Visibility = keyof typeof VISIBILITY_LABEL;

export function resultPatch(result: LockeResult, today = new Date()): { status: LockeStatus; result: LockeResult; finished_on: string } {
  const opt = RESULT_OPTIONS.find((o) => o.result === result);
  if (!opt) throw new Error(`Resultado desconocido: ${result}`);
  return { status: opt.status, result, finished_on: today.toISOString().slice(0, 10) };
}
