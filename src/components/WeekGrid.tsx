import { useWeekStore } from '../store/week';
import { DAYS, EXERCISES, MUSCLE_GROUPS } from '../lib/exercises';

export default function WeekGrid() {
  const week = useWeekStore((s) => s.week);
  const activeDay = useWeekStore((s) => s.activeDay);
  const setActiveDay = useWeekStore((s) => s.setActiveDay);

  return (
    <div className="week-grid">
      {DAYS.map((d) => {
        const list = week[d.id] || [];
        const isActive = activeDay === d.id;

        const dayLoad: Record<string, number> = {};
        list.forEach((ex) => {
          const def = EXERCISES.find((e) => e.name === ex.name);
          if (!def) return;
          Object.entries(def.primary || {}).forEach(([m, v]) => {
            dayLoad[m] = (dayLoad[m] || 0) + (v as number) * ex.sets;
          });
        });
        const topMuscles = Object.entries(dayLoad)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([m]) => m);

        return (
          <button key={d.id} className={`day-card ${isActive ? 'on' : ''} ${list.length === 0 ? 'empty' : ''}`} onClick={() => setActiveDay(d.id)}>
            <div className="day-head">
              <span className="day-label">{d.label}</span>
              <span className="day-date mono">{d.date}</span>
            </div>
            <div className="day-count">
              {list.length === 0 ? <span className="dim mono">rest</span> : (
                <><span className="big">{list.length}</span><span className="dim"> exercises</span></>
              )}
            </div>
            <div className="day-muscles">
              {topMuscles.length > 0 ? topMuscles.map((m) => (
                <span key={m} className="m-pill">{MUSCLE_GROUPS.find((g) => g.id === m)?.label}</span>
              )) : <span className="m-pill ghost">—</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
