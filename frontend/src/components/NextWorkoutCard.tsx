import type { MuscleId } from '../lib/exercises';
import { MUSCLE_GROUPS } from '../lib/exercises';
import type { InsightResult } from '../lib/insight';

interface NextWorkoutCardProps {
  loads: Record<MuscleId, number>;
  status: 'idle' | 'loading' | 'success' | 'error';
  insight: InsightResult | null;
}

export default function NextWorkoutCard({ loads, status, insight }: NextWorkoutCardProps) {
  const next = insight?.next || [];
  const target = next[0]?.target;
  let title = 'Generating plan...';
  if (status === 'success') {
    if (target) {
      title = `${MUSCLE_GROUPS.find((g) => g.id === target)?.label}-focused pull day`;
    } else {
      title = 'Active recovery & mobility';
    }
  }

  return (
    <div className="next-card">
      <div className="next-head">
        <span className="mono dim">RECOMMENDED NEXT WORKOUT</span>
        <span className="next-when">Mon · May 12</span>
      </div>
      
      {status === 'loading' ? (
        <>
          <div className="next-title-row">
            <div className="skeleton-line" style={{ width: 180, height: 24 }} />
            <div className="skeleton-line" style={{ width: 60, height: 16 }} />
          </div>
          <ul className="next-list">
            {[1, 2, 3].map((i) => (
              <li key={i} className="next-row" style={{ opacity: 0.5 }}>
                <div className="next-num mono">{String(i).padStart(2, '0')}</div>
                <div className="next-info" style={{ flex: 1 }}>
                  <div className="skeleton-line" style={{ width: '60%', height: 16, marginBottom: 6 }} />
                  <div className="skeleton-line" style={{ width: '40%', height: 12 }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : status === 'success' ? (
        <>
          <div className="next-title-row">
            <h3 className="next-title">{title}</h3>
            <span className="next-dur mono">~ 55 min</span>
          </div>
          <ul className="next-list">
            {next.map((ex, i) => (
              <li key={i} className="next-row">
                <div className="next-num mono">{String(i + 1).padStart(2, '0')}</div>
                <div className="next-info">
                  <div className="next-name">{ex.name}</div>
                  <div className="next-target mono dim">
                    targets {MUSCLE_GROUPS.find((g) => g.id === ex.target)?.label || ex.target}
                  </div>
                </div>
                <div className="next-prescription mono">
                  <span className="num">{ex.sets}</span>
                  <span className="x">×</span>
                  <span className="num">{ex.reps}</span>
                  <span className="kg dim"> · {ex.weight}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="next-cta">
            <button className="btn primary wide">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Add to next week
            </button>
            <button className="btn ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Ask follow-up
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
