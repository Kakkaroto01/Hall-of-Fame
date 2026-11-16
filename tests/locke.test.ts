import { describe, it, expect } from 'vitest';
import { resultPatch, RESULT_OPTIONS, STATUS_LABEL, VISIBILITY_LABEL } from '../src/domain/locke';

describe('locke domain', () => {
  it('RESULT_OPTIONS tiene los 5 resultados del especificación', () => {
    expect(RESULT_OPTIONS.length).toBe(5);
    const results = RESULT_OPTIONS.map((o) => o.result);
    expect(results).toContain('victory');
    expect(results).toContain('lives_depleted');
    expect(results).toContain('wipeout');
    expect(results).toContain('lost_matches');
    expect(results).toContain('voluntary_abandon');
  });

  it('cada resultado tiene el status correcto', () => {
    expect(RESULT_OPTIONS.find((o) => o.result === 'victory')?.status).toBe('won');
    expect(RESULT_OPTIONS.find((o) => o.result === 'lives_depleted')?.status).toBe('lost');
    expect(RESULT_OPTIONS.find((o) => o.result === 'wipeout')?.status).toBe('lost');
    expect(RESULT_OPTIONS.find((o) => o.result === 'lost_matches')?.status).toBe('lost');
    expect(RESULT_OPTIONS.find((o) => o.result === 'voluntary_abandon')?.status).toBe('abandoned');
  });

  it('resultPatch genera fecha de finalización válida', () => {
    const r = resultPatch('victory');
    expect(r.status).toBe('won');
    expect(r.result).toBe('victory');
    expect(r.finished_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('resultPatch para abandono', () => {
    const r = resultPatch('voluntary_abandon');
    expect(r.status).toBe('abandoned');
    expect(r.result).toBe('voluntary_abandon');
  });

  it('STATUS_LABEL traduce todos los estados', () => {
    expect(STATUS_LABEL.in_progress).toBe('En curso');
    expect(STATUS_LABEL.won).toBe('Ganado');
    expect(STATUS_LABEL.lost).toBe('Perdido');
    expect(STATUS_LABEL.abandoned).toBe('Abandonado');
  });

  it('VISIBILITY_LABEL traduce visibilidad', () => {
    expect(VISIBILITY_LABEL.private).toBe('Privado');
    expect(VISIBILITY_LABEL.friends).toBe('Amigos');
    expect(VISIBILITY_LABEL.community).toBe('Comunidad');
  });
});
