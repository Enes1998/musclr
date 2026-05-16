import type { InsightResult } from '../lib/insight';
import type { ProgramDay } from '../lib/program';

interface ProgramCardProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  program: InsightResult | null;
  error: string | null;
}

function WeekColumn({ days, weekLabel }: { days: ProgramDay[]; weekLabel: string }) {
  return (
    <div className="program-week">
      <div className="program-week-label mono dim">{weekLabel}</div>
      {days.map((day, i) => (
        <div key={i} className={`program-day${day.rest ? ' program-day--rest' : ''}`}>
          <div className="program-day-head">
            <span className="program-day-name mono">{day.day.slice(0, 3).toUpperCase()}</span>
            <span className="program-day-label">{day.label}</span>
          </div>
          {!day.rest && day.exercises.length > 0 && (
            <ul className="program-ex-list">
              {day.exercises.map((ex, j) => (
                <li key={j} className="program-ex-row">
                  <span className="program-ex-name">{ex.name}</span>
                  <span className="next-prescription mono">
                    <span className="num">{ex.sets}</span>
                    <span className="x">×</span>
                    <span className="num">{ex.reps}</span>
                    <span className="kg dim"> · {ex.weight}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function SkeletonWeek() {
  return (
    <div className="program-week">
      <div className="skeleton-line" style={{ width: 60, height: 12, marginBottom: 12 }} />
      {[80, 60, 90, 70, 85, 50, 40].map((w, i) => (
        <div key={i} className="program-day">
          <div className="program-day-head">
            <div className="skeleton-line" style={{ width: 30, height: 12 }} />
            <div className="skeleton-line" style={{ width: w, height: 12 }} />
          </div>
          {i % 3 !== 1 && (
            <div style={{ paddingLeft: 8, marginTop: 6 }}>
              <div className="skeleton-line" style={{ width: '75%', height: 11, marginBottom: 5 }} />
              <div className="skeleton-line" style={{ width: '60%', height: 11 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProgramCard({ status, program, error }: ProgramCardProps) {
  return (
    <div className="program-card">
      <div className="insight-head">
        <div className="g-badge">
          <div className="g-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="g-name">2-Week Program</div>
            <div className="g-sub mono">ai-generated · strength &amp; conditioning</div>
          </div>
        </div>
      </div>

      {status === 'loading' && (
        <div className="program-weeks">
          <SkeletonWeek />
          <SkeletonWeek />
        </div>
      )}

      {status === 'success' && program && (
        <div className="program-weeks">
          <WeekColumn days={program.week1} weekLabel="WEEK 1" />
          <WeekColumn days={program.week2} weekLabel="WEEK 2" />
        </div>
      )}

      {status === 'error' && (
        <p className="mono" style={{ margin: 0, fontSize: 13, color: 'var(--red, #e05)' }}>
          {error ?? 'Failed to generate program.'}
        </p>
      )}
    </div>
  );
}
