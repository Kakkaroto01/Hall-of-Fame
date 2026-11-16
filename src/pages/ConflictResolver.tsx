import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/local';
import { resolveConflict as resolveSyncConflict } from '../sync/engine';
import { SyncChip } from '../layout/Shell';

export function ConflictResolver() {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [mergedValues, setMergedValues] = useState<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    db.conflicts.where('status').equals('open').toArray().then(setConflicts).then(() => setLoading(false));
  }, []);

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      nickname: 'Apodo', level: 'Nivel', gender: 'Sexo', nature: 'Naturaleza',
      ability: 'Habilidad', moves: 'Movimientos', held_item: 'Objeto',
      is_shiny: 'Variocolor', stats: 'Estadísticas', ivs: 'IV', evs: 'EV',
      tera_type: 'Teratipo', visibility: 'Visibilidad',
    };
    return labels[field] ?? field;
  };

  const showValue = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (Array.isArray(v)) return v.join(', ') || '—';
    if (typeof v === 'object') return Object.entries(v as Record<string, number>).map(([k, n]) => `${k} ${n}`).join(' · ');
    return String(v);
  };

  const resolveConflict = async (conflictId: string) => {
    const merged = mergedValues[conflictId];
    if (!merged) return;
    setResolving(conflictId);
    try {
      await resolveSyncConflict(conflictId, merged);
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      delete mergedValues[conflictId];
      setMergedValues({ ...mergedValues });
    } finally {
      setResolving(null);
    }
  };

  if (loading) return <section className="page"><p className="muted">Cargando conflictos…</p></section>;

  if (conflicts.length === 0) {
    return (
      <section className="page">
        <div className="page__head">
          <h1>Resolución de conflictos</h1>
          <Link to="/lockes" className="btn btn--ghost">Volver a mis lockes</Link>
        </div>
        <p className="muted">No hay conflictos pendientes de resolver.</p>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page__head">
        <h1>Resolución de conflictos</h1>
        <Link to="/lockes" className="btn btn--ghost">Volver a mis lockes</Link>
      </div>
      <p className="muted">
        Se detectaron conflictos al sincronizar. Para cada uno, elige qué versión conservar
        o combina ambas. No se sobrescribe nada automáticamente.
      </p>

      {conflicts.map((conflict: any) => {
        const local = conflict.local as Record<string, unknown>;
        const server = conflict.server as Record<string, unknown>;
        const fields = new Set([...Object.keys(local), ...Object.keys(server)]);
        const currentMerged = mergedValues[conflict.id] || {};

        return (
          <div key={conflict.id} style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '16px', marginBottom: 20, background: 'var(--panel)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Conflicto: {conflict.table}</h2>
                <p className="muted small" style={{ margin: 0 }}>ID: {conflict.id}</p>
              </div>
              {resolving === conflict.id && (
                <span className="muted small">Guardando…</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '10px' }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--soft)', fontSize: '.85rem' }}>Tu versión (local)</h4>
                {Array.from(fields).map((f) => (
                  <div key={f} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: 4 }}>
                    <span className="muted">{getFieldLabel(f)}:</span>
                    <span>{showValue(local[f])}</span>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '10px', background: 'color-mix(in srgb, var(--accent) 5%, #fff)' }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--soft)', fontSize: '.85rem' }}>Servidor</h4>
                {Array.from(fields).map((f) => (
                  <div key={f} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: 4 }}>
                    <span className="muted">{getFieldLabel(f)}:</span>
                    <span>{showValue(server[f])}</span>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '10px' }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--soft)', fontSize: '.85rem' }}>Versión final</h4>
                {Array.from(fields).map((f) => {
                  const currentValue = currentMerged[f];
                  const isChanged = currentValue !== undefined && currentValue !== local[f] && currentValue !== server[f];
                  return (
                    <div key={f} style={{ marginBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.85rem' }}>
                        <input
                          type="radio"
                          name={`merge-${conflict.id}-${f}`}
                          value="local"
                          checked={!isChanged && currentValue === undefined}
                          onChange={() => setMergedValues({ ...mergedValues, [conflict.id]: { ...currentMerged, [f]: local[f] } })}
                        />
                        <span>Local</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.85rem' }}>
                        <input
                          type="radio"
                          name={`merge-${conflict.id}-${f}`}
                          value="server"
                          checked={!isChanged && currentValue === undefined}
                          onChange={() => setMergedValues({ ...mergedValues, [conflict.id]: { ...currentMerged, [f]: server[f] } })}
                        />
                        <span>Servidor</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.85rem' }}>
                        <input
                          type="radio"
                          name={`merge-${conflict.id}-${f}`}
                          value="custom"
                          checked={isChanged}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : e.target.value;
                            setMergedValues({ ...mergedValues, [conflict.id]: { ...currentMerged, [f]: val } });
                          }}
                        />
                        <span>Personalizado:</span>
                        <input
                          type="text"
                          value={String(currentValue ?? '')}
                          onChange={(e) => setMergedValues({ ...mergedValues, [conflict.id]: { ...currentMerged, [f]: e.target.value } })}
                          style={{ marginLeft: '6px', fontSize: '.8rem', padding: '2px 6px' }}
                        />
                      </label>
                      <p className="muted small" style={{ margin: '2px 0 0' }}>
                        Local: {showValue(local[f])} · Servidor: {showValue(server[f])}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn--ghost"
                onClick={() => resolveConflict(conflict.id)}
                disabled={resolving === conflict.id}
              >
                {resolving === conflict.id ? 'Resolviendo…' : 'Resolver conflicto'}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
