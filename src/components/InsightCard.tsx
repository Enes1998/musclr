import { useEffect, useState } from 'react';
import type { MuscleId } from '../lib/exercises';
import { generateInsight } from '../lib/insight';
import type { InsightResult } from '../lib/insight';

export default function InsightCard({ loads }: { loads: Record<MuscleId, number> }) {
  const [insight, setInsight] = useState<InsightResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInsight = async () => {
    setLoading(true);
    const result = await generateInsight(loads);
    setInsight(result);
    setLoading(false);
  };

  useEffect(() => {
    loadInsight();
  }, [loads]);

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
        <button className="ico-mini" title="regenerate" onClick={loadInsight}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {loading ? (
        <p className="insight-body dim">Analyzing your week...</p>
      ) : (
        <>
          <p className="insight-body">{insight?.summary}</p>
          <div className="insight-tags">
            {over > 0 && <span className="tag red">{over} overtrained</span>}
            {balanced > 0 && <span className="tag yel">{balanced} balanced</span>}
            {under > 0 && <span className="tag grn">{under} undertrained</span>}
          </div>
        </>
      )}
    </div>
  );
}
