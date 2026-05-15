import { useRef, type PointerEvent } from 'react';
import { useWeekStore } from '../store/week';
import { DAYS, EXERCISES, MUSCLE_GROUPS } from '../lib/exercises';

export default function WeekGrid() {
  const week = useWeekStore((s) => s.week);
  const activeDay = useWeekStore((s) => s.activeDay);
  const setActiveDay = useWeekStore((s) => s.setActiveDay);
  const weekGridRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    moved: false
  });

  const onGridPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const grid = weekGridRef.current;
    if (!grid) return;

    dragRef.current.active = true;
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.startX = e.clientX;
    dragRef.current.startScrollLeft = grid.scrollLeft;
    dragRef.current.moved = false;

    grid.classList.add('dragging');
    grid.setPointerCapture(e.pointerId);
  };

  const onGridPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const grid = weekGridRef.current;
    if (!grid) return;

    const deltaX = e.clientX - dragRef.current.startX;
    if (!dragRef.current.moved && Math.abs(deltaX) > 4) {
      dragRef.current.moved = true;
      suppressClickRef.current = true;
    }
    if (dragRef.current.moved) {
      grid.scrollLeft = dragRef.current.startScrollLeft - deltaX;
      e.preventDefault();
    }
  };

  const onGridPointerUp = () => {
    if (!dragRef.current.active) return;
    const grid = weekGridRef.current;
    if (!grid) return;

    if (grid.hasPointerCapture(dragRef.current.pointerId)) {
      grid.releasePointerCapture(dragRef.current.pointerId);
    }
    dragRef.current.active = false;
    dragRef.current.pointerId = -1;
    grid.classList.remove('dragging');
  };

  return (
    <div
      ref={weekGridRef}
      className="week-grid"
      onPointerDown={onGridPointerDown}
      onPointerMove={onGridPointerMove}
      onPointerUp={onGridPointerUp}
      onPointerCancel={onGridPointerUp}
    >
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
          <button
            key={d.id}
            className={`day-card ${isActive ? 'on' : ''} ${list.length === 0 ? 'empty' : ''}`}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              setActiveDay(d.id);
            }}
            aria-pressed={isActive}
            aria-label={`${d.label}day${list.length > 0 ? `, ${list.length} exercise${list.length !== 1 ? 's' : ''}` : ', rest day'}`}
          >
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
