import { useParams } from 'react-router-dom';

export function Soon({ title, phase, children }: { title: string; phase?: string; children?: React.ReactNode }) {
  const { phase: p } = useParams<{ phase?: string }>();
  return (
    <section className="page">
      <h1>{title}</h1>
      {phase && <p className="muted small">{phase}</p>}
      <p className="muted">Esta pantalla se restaurará en una próxima fase.</p>
      {children}
    </section>
  );
}
