import { useState } from 'react';
import { useWeekStore } from '../store/week';
import { EXERCISES, MUSCLE_GROUPS } from '../lib/exercises';
import type { MuscleId } from '../lib/exercises';
import { scoreToColor } from '../lib/scoring';

export default function EntryTable({ loads }: { loads: Record<MuscleId, number> }) {
  const week = useWeekStore((s) => s.week);
  const activeDay = useWeekStore((s) => s.activeDay);
  const addExercise = useWeekStore((s) => s.addExercise);
  const removeExercise = useWeekStore((s) => s.removeExercise);
  const updateExercise = useWeekStore((s) => s.updateExercise);

  const dayList = week[activeDay] || [];
  const exNames = EXERCISES.map((e) => e.name);

  const [draft, setDraft] = useState({ name: exNames[0], sets: 3, reps: 8, weight: 60 });

  const handleAdd = () => {
    if (!draft.name) return;
    addExercise(activeDay, draft);
  };

  return (
    <>
      {dayList.length > 0 && (
        <table className="entry-table">
          <thead>
            <tr>
              <th style={{ width: '36px' }}>#</th>
              <th>Exercise</th>
              <th style={{ width: '80px' }}>Sets</th>
              <th style={{ width: '80px' }}>Reps</th>
              <th style={{ width: '100px' }}>Weight</th>
              <th>Primary muscles</th>
              <th style={{ width: '40px' }} />
            </tr>
          </thead>
          <tbody>
            {dayList.map((ex, i) => {
              const def = EXERCISES.find((e) => e.name === ex.name);
              const muscles = Object.keys(def?.primary || {}) as MuscleId[];

              return (
                <tr key={i}>
                  <td className="mono dim">{String(i + 1).padStart(2, '0')}</td>
                  <td>
                    <select value={ex.name} onChange={(e) => updateExercise(activeDay, i, { name: e.target.value })}>
                      {exNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="1" value={ex.sets} onChange={(e) => updateExercise(activeDay, i, { sets: +e.target.value })} /></td>
                  <td><input type="number" min="1" value={ex.reps} onChange={(e) => updateExercise(activeDay, i, { reps: +e.target.value })} /></td>
                  <td>
                    <div className="weight-cell">
                      <input type="number" min="0" value={ex.weight} onChange={(e) => updateExercise(activeDay, i, { weight: +e.target.value })} />
                      <span className="mono dim">kg</span>
                    </div>
                  </td>
                  <td>
                    <div className="muscle-chips">
                      {muscles.map((m) => {
                        const color = scoreToColor(loads[m]);
                        return (
                          <span key={m} className="m-chip" style={{ borderColor: color + '55', color }}>
                            {MUSCLE_GROUPS.find((g) => g.id === m)?.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => removeExercise(activeDay, i)} aria-label="remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {dayList.length === 0 && (
        <div className="empty-state">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <p className="dim">No exercises logged. Rest day, or add one below.</p>
        </div>
      )}

      <div className="add-row">
        <div className="add-cell grow">
          <label className="mono dim">EXERCISE</label>
          <select value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}>
            {exNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="add-cell">
          <label className="mono dim">SETS</label>
          <input type="number" min="1" value={draft.sets} onChange={(e) => setDraft({ ...draft, sets: +e.target.value })} />
        </div>
        <div className="add-cell">
          <label className="mono dim">REPS</label>
          <input type="number" min="1" value={draft.reps} onChange={(e) => setDraft({ ...draft, reps: +e.target.value })} />
        </div>
        <div className="add-cell">
          <label className="mono dim">WEIGHT (KG)</label>
          <input type="number" min="0" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: +e.target.value })} />
        </div>
        <button className="btn primary tall" onClick={handleAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Add
        </button>
      </div>
    </>
  );
}
