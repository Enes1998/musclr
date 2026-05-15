import { useNavigate } from 'react-router-dom';
import { useWeekStore } from '../store/week';
import { computeMuscleLoad, scoreToColor, scoreLabel } from '../lib/scoring';
import { MUSCLE_GROUPS } from '../lib/exercises';
import AppBar from '../components/AppBar';
import Body3D from '../components/Body3D';
import InsightCard from '../components/InsightCard';
import NextWorkoutCard from '../components/NextWorkoutCard';

export default function Summary() {
  const navigate = useNavigate();
  const week = useWeekStore((s) => s.week);

  const loads = computeMuscleLoad(week);
  const sortedLoads = [...MUSCLE_GROUPS]
    .map((m) => ({ ...m, score: loads[m.id] }))
    .sort((a, b) => b.score - a.score);

  const over = sortedLoads.filter((m) => m.score >= 70);
  const under = sortedLoads.filter((m) => m.score < 30);

  const totalSets = Object.values(week).flat().reduce((a, e) => a + e.sets, 0);
  const totalVol = Object.values(week).flat().reduce((a, e) => a + e.sets * e.reps * (e.weight || 0), 0);
  const daysTrained = Object.values(week).filter((d) => d.length > 0).length;

  return (
    <div className="summary">
      <AppBar activeTab="summary" onNav={navigate} />

      <div className="summary-header">
        <div>
          <div className="mono dim">WEEK OF MAY 5 — MAY 11</div>
          <h1 className="page-title">Body heatmap & coaching</h1>
        </div>
        <div className="summary-kpis">
          <div className="kpi">
            <div className="kpi-n">{daysTrained}<span className="kpi-suf">/7</span></div>
            <div className="kpi-l">days trained</div>
          </div>
          <div className="kpi-div"/>
          <div className="kpi">
            <div className="kpi-n">{totalSets}</div>
            <div className="kpi-l">sets</div>
          </div>
          <div className="kpi-div"/>
          <div className="kpi">
            <div className="kpi-n">{Math.round(totalVol / 1000)}<span className="kpi-suf">t</span></div>
            <div className="kpi-l">tonnage</div>
          </div>
          <div className="kpi-div"/>
          <div className="kpi">
            <div className="kpi-n" style={{ color: '#f44336' }}>{over.length}</div>
            <div className="kpi-l">red zones</div>
          </div>
          <div className="kpi-div"/>
          <div className="kpi">
            <div className="kpi-n" style={{ color: '#4caf50' }}>{under.length}</div>
            <div className="kpi-l">green zones</div>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <section className="body-section">
          <div className="section-head">
            <span className="mono dim">3D MUSCLE HEATMAP</span>
            <span className="mono dim">drag to rotate</span>
          </div>
          <div className="body-stage">
            <Body3D loads={loads} />
          </div>

          <div className="load-grid">
            {sortedLoads.map((m) => (
              <div key={m.id} className="load-tile">
                <div className="load-tile-top">
                  <span className="load-label">{m.label}</span>
                  <span className="load-val mono" style={{ color: scoreToColor(m.score) }}>{m.score}</span>
                </div>
                <div className="load-bar">
                  <div className="load-fill" style={{ width: m.score + '%', background: scoreToColor(m.score) }} />
                </div>
                <div className="load-status mono" style={{ color: scoreToColor(m.score) }}>
                  {scoreLabel(m.score)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="insight-section">
          <InsightCard loads={loads} />
          <NextWorkoutCard loads={loads} />
          <div className="footnote mono dim">
            Loads computed from your logged sets × reps × weight. Scores normalized 0–100 against
            baseline volume thresholds. Gemini call: <span className="hl">claude→vertex→gemini-2.5-pro</span>.
          </div>
        </aside>
      </div>
    </div>
  );
}
