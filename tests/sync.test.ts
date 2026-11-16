import { describe, it, expect } from 'vitest';
import { resultPatch, RESULT_OPTIONS, STATUS_LABEL } from '../src/domain/locke';
import { canAddToTeam, TEAM_MAX } from '../src/domain/awards';
import { diffSnapshots } from '../src/domain/history';

describe('locke domain', () => {
  it('RESULT_OPTIONS tiene los 5 resultados esperados', () => {
    expect(RESULT_OPTIONS.length).toBe(5);
    const results = RESULT_OPTIONS.map((o) => o.result);
    expect(results).toContain('victory');
    expect(results).toContain('lives_depleted');
    expect(results).toContain('wipeout');
    expect(results).toContain('lost_matches');
    expect(results).toContain('voluntary_abandon');
  });

  it('resultPatch produce estado y fecha correctos', () => {
    const r = resultPatch('victory');
    expect(r.status).toBe('won');
    expect(r.result).toBe('victory');
    expect(r.finished_on).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('resultPatch para abandono produce status abandoned', () => {
    const r = resultPatch('voluntary_abandon');
    expect(r.status).toBe('abandoned');
  });

  it('STATUS_LABEL traduce estados', () => {
    expect(STATUS_LABEL.in_progress).toBe('En curso');
    expect(STATUS_LABEL.won).toBe('Ganado');
    expect(STATUS_LABEL.lost).toBe('Perdido');
    expect(STATUS_LABEL.abandoned).toBe('Abandonado');
  });
});

describe('TEAM_MAX', () => {
  it('es 6', () => {
    expect(TEAM_MAX).toBe(6);
  });
});

describe('diffSnapshots edge cases', () => {
  it('devuelve array vacío si no hay previo', () => {
    const diff = diffSnapshots(null, { nickname: 'X' });
    expect(diff).toEqual([]);
  });

  it('ignora campos del sistema', () => {
    const prev: any = { id: 'x', owner_id: 'u', nickname: 'Pika', version: 1 };
    const next: any = { id: 'x', owner_id: 'u', nickname: 'Pika', version: 2 };
    const diff = diffSnapshots(prev, next);
    expect(diff.length).toBe(0);
  });
});
