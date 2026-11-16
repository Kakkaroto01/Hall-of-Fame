import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../db/local';
import { SyncChip } from '../layout/Shell';

export function Export() {
  const { session } = useAuth();
  const me = session?.uid ?? null;
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = async () => {
    setError(null);
    setExporting(true);
    try {
      const tables = [
        'locke', 'pokemon_entry', 'award', 'pvp_match', 'category',
        'file_asset', 'evidence', 'league_team_member', 'friendship',
        'profile_cache', 'entry_version',
      ];
      const data: Record<string, any[]> = {};
      for (const table of tables) {
        const rows = await db.table(table).toArray();
        data[table] = rows.filter((r: any) => r.deleted_at === null);
      }
      const exportObj = {
        exported_at: new Date().toISOString(),
        user_id: me,
        data,
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hall-of-fame-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExported(true);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="page">
      <div className="page__head">
        <h1>Exportar Hall of Fame</h1>
        <Link to="/perfil" className="btn btn--ghost">Volver al perfil</Link>
      </div>

      <div style={{ maxWidth: '620px' }}>
        <p className="muted">
          Descarga una copia completa de todos tus datos en formato JSON. Incluye lockes, fichas,
          reconocimientos, combates, archivos, amistades e historial.
        </p>

        {error && <p role="alert" className="msg msg--error">{error}</p>}

        {exported ? (
          <div className="msg msg--ok" role="status">
            ¡Exportación descargada correctamente!
          </div>
        ) : (
          <button
            className="btn btn--primary"
            onClick={exportData}
            disabled={exporting}
            style={{ width: '100%' }}
          >
            {exporting ? 'Exportando…' : 'Descargar copia de seguridad'}
          </button>
        )}

        <div style={{ marginTop: 24, padding: '16px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '1rem' }}>¿Qué se incluye?</h3>
          <ul className="muted small" style={{ margin: 0, paddingLeft: 20 }}>
            <li>Lockes y sus resultados</li>
            <li>Fichas de Pokémon (estadísticas, movimientos, reconocimientos)</li>
            <li>Reconocimientos y categorías</li>
            <li>Combates PvP</li>
            <li>Archivos de partida y evidencias</li>
            <li>Amistades y perfiles cacheados</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
