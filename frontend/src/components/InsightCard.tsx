import type { MuscleId } from '../lib/exercises';
import type { InsightResult } from '../lib/insight';

interface InsightCardProps {
  loads: Record<MuscleId, number>;
  status: 'idle' | 'loading' | 'success' | 'error';
  insight: InsightResult | null;
}

export default function InsightCard({ loads, status, insight }: InsightCardProps) {
  const over = Object.values(loads).filter((s) => s >= 70).length;
  const balanced = Object.values(loads).filter((s) => s >= 30 && s < 70).length;
  const under = Object.values(loads).filter((s) => s < 30).length;

  return (
    <div className="insight-card">
      <div className="insight-head">
        <div className="g-badge">
          <div className="g-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <div className="g-name">Gemini AI Insights</div>
            <div className="g-sub mono">analysis · vertex ai · 1.2s</div>
          </div>
        </div>
      </div>

      {status === 'loading' ? (
        <div style={{ padding: '2px 0 6px' }}>
          <div className="skeleton-line" style={{ width: '100%', height: 14, marginBottom: 10 }} />
          <div className="skeleton-line" style={{ width: '92%', height: 14, marginBottom: 10 }} />
          <div className="skeleton-line" style={{ width: '98%', height: 14, marginBottom: 10 }} />
          <div className="skeleton-line" style={{ width: '85%', height: 14, marginBottom: 20 }} />
          <div className="insight-tags" style={{ opacity: 0.5 }}>
            <div className="skeleton-line" style={{ width: 80, height: 26, borderRadius: 13 }} />
            <div className="skeleton-line" style={{ width: 90, height: 26, borderRadius: 13 }} />
          </div>
        </div>
      ) : status === 'success' && insight ? (
        <>
          <p className="insight-body">{insight.summary}</p>
          <div className="insight-tags">
            {over > 0 && <span className="tag red">{over} overtrained</span>}
            {balanced > 0 && <span className="tag yel">{balanced} balanced</span>}
            {under > 0 && <span className="tag grn">{under} undertrained</span>}
          </div>
        </>
      ) : null}
    </div>
  );
}
