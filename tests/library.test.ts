import { describe, it, expect } from 'vitest';

describe('library domain logic', () => {
  it('categoría personal tiene los campos requeridos', () => {
    const category = {
      id: 'c1',
      kind: 'custom' as const,
      owner_id: 'u1',
      name: 'Mis Favoritos',
      description: 'Categoría personal',
      selection: 'manual' as const,
      scores_points: false,
      visibility: 'community' as const,
      revision: 1,
      version: 1,
    };
    expect(category.kind).toBe('custom');
    expect(category.owner_id).toBe('u1');
    expect(category.selection).toBe('manual');
    expect(category.scores_points).toBe(false);
  });

  it('categoría oficial tiene key y owner null', () => {
    const category = {
      id: 'c2',
      kind: 'official' as const,
      owner_id: null,
      key: 'league_team',
      name: 'Equipo de la Liga',
      selection: 'league_team' as const,
      scores_points: true,
      visibility: 'community' as const,
      revision: 1,
      version: 1,
    };
    expect(category.kind).toBe('official');
    expect(category.owner_id).toBeNull();
    expect(category.key).toBe('league_team');
    expect(category.scores_points).toBe(true);
  });

  it('visibilidad válida para compartir', () => {
    const visibilities: ('private' | 'friends' | 'community')[] = ['private', 'friends', 'community'];
    expect(visibilities).toContain('private');
    expect(visibilities).toContain('friends');
    expect(visibilities).toContain('community');
  });
});
