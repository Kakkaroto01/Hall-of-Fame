import { describe, it, expect } from 'vitest';
import { relationOf } from '../src/social/friends';

describe('friends domain', () => {
  const me = 'u1';

  it('devuelve none cuando no hay amistad', () => {
    const r = relationOf([], me, 'u2');
    expect(r.relation).toBe('none');
    expect(r.id).toBeUndefined();
  });

  it('devuelve friends cuando están aceptados', () => {
    const f = [{ id: 'f1', requester_id: me, addressee_id: 'u2', status: 'accepted' }];
    const r = relationOf(f, me, 'u2');
    expect(r.relation).toBe('friends');
    expect(r.id).toBe('f1');
  });

  it('devuelve friends sin importar quién solicitó', () => {
    const f = [{ id: 'f1', requester_id: 'u2', addressee_id: me, status: 'accepted' }];
    const r = relationOf(f, me, 'u2');
    expect(r.relation).toBe('friends');
  });

  it('devuelve sent cuando yo envié la solicitud', () => {
    const f = [{ id: 'f1', requester_id: me, addressee_id: 'u2', status: 'pending' }];
    const r = relationOf(f, me, 'u2');
    expect(r.relation).toBe('sent');
    expect(r.id).toBe('f1');
  });

  it('devuelve received cuando me enviaron la solicitud', () => {
    const f = [{ id: 'f1', requester_id: 'u2', addressee_id: me, status: 'pending' }];
    const r = relationOf(f, me, 'u2');
    expect(r.relation).toBe('received');
    expect(r.id).toBe('f1');
  });

  it('no confunde con otra persona', () => {
    const f = [{ id: 'f1', requester_id: me, addressee_id: 'u3', status: 'accepted' }];
    const r = relationOf(f, me, 'u2');
    expect(r.relation).toBe('none');
  });
});
