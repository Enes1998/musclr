import { useNavigate } from 'react-router-dom';
import { useWeekStore } from '../store/week';
import { computeMuscleLoad } from '../lib/scoring';
import { DAYS } from '../lib/exercises';
import AppBar from '../components/AppBar';
import WeekGrid from '../components/WeekGrid';
import EntryTable from '../components/EntryTable';
import LoadMap from '../components/LoadMap';

export default function Logger() {
  const navigate = useNavigate();
  const week = useWeekStore((s) => s.week);
  const activeDay = useWeekStore((s) => s.activeDay);

  const loads = computeMuscleLoad(week);
  const dayList = week[activeDay] || [];

  const totalSets = Object.values(week).flat().reduce((a, e) => a + e.sets, 0);
  const totalVol = Object.values(week).flat().reduce((a, e) => a + e.sets * e.reps * (e.weight || 0), 0);
  const daysTrained = Object.values(week).filter((d) => d.length > 0).length;

  return (
    <div className="logger">
      <AppBar activeTab="log" onNav={navigate} />

      <WeekGrid />

      <div className="logger-body">
        <section className="entry-panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">{DAYS.find((d) => d.id === activeDay)?.date.toUpperCase()}</div>
              <h2 className="panel-title">{DAYS.find((d) => d.id === activeDay)?.label}day session</h2>
            </div>
            <div className="panel-meta mono">
              {dayList.length} ex · {dayList.reduce((a, e) => a + e.sets, 0)} sets · {Math.round((dayList.reduce((a, e) => a + e.sets * e.reps * (e.weight || 0), 0) / 1000) * 10) / 10}t vol
            </div>
          </div>

          <EntryTable loads={loads} />
        </section>

        <aside className="side-panel">
          <div className="side-card">
            <div className="side-head">
              <span className="mono dim">WEEK TOTALS</span>
            </div>
            <div className="stats-grid">
              <div><div className="stat-n">{daysTrained}<span className="stat-suf">/7</span></div><div className="stat-l">days trained</div></div>
              <div><div className="stat-n">{totalSets}</div><div className="stat-l">total sets</div></div>
              <div><div className="stat-n">{Math.round(totalVol / 1000)}<span className="stat-suf">t</span></div><div className="stat-l">tonnage</div></div>
              <div><div className="stat-n">{Object.values(week).flat().length}</div><div className="stat-l">exercises</div></div>
            </div>
          </div>

          <LoadMap loads={loads} />

          <button className="cta-block" onClick={() => navigate('/summary')}>
            <div>
              <div className="cta-eyebrow mono">READY?</div>
              <div className="cta-title">See the week → ask Gemini</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </aside>
      </div>
    </div>
  );
}
