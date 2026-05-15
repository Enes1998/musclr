import { MUSCLE_GROUPS } from '../lib/exercises';
import type { MuscleId } from '../lib/exercises';
import { scoreLabel, scoreToColor } from '../lib/scoring';

export default function LoadMap({ loads }: { loads: Record<MuscleId, number> }) {
  const sortedLoads = [...MUSCLE_GROUPS]
    .map((m) => ({ ...m, score: loads[m.id] }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="side-card">
      <div className="side-head">
        <span className="mono dim">LIVE LOAD MAP</span>
        <span className="mono dim">0–100</span>
      </div>
      <div className="load-list">
        {sortedLoads.map((m) => {
          const color = scoreToColor(m.score);
          return (
            <div key={m.id} className="load-row" title={`${m.label}: ${m.score} – ${scoreLabel(m.score)}`}>
              <span className="load-label">{m.label}</span>
              <div className="load-bar">
                <div className="load-fill" style={{ width: m.score + '%', background: color }} />
              </div>
              <span className="load-val mono" style={{ color }}>{m.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
