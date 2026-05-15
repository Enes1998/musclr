import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useWeekStore } from "../store/week";
import { EXERCISES, MUSCLE_GROUPS } from "../lib/exercises";
import type { MuscleId, WorkoutEntry } from "../lib/exercises";
import { scoreToColor } from "../lib/scoring";
import {
  getNumericFieldError,
  parseNumericInput,
} from "../lib/validation";
import type { NumericField } from "../lib/validation";
import ExerciseCombobox from "./ExerciseCombobox";

interface EntryTableProps {
  loads: Record<MuscleId, number>;
  onTransientInvalidCountChange?: (count: number) => void;
}

export default function EntryTable({
  loads,
  onTransientInvalidCountChange,
}: EntryTableProps) {
  const week = useWeekStore((s) => s.week);
  const activeDay = useWeekStore((s) => s.activeDay);
  const addExercise = useWeekStore((s) => s.addExercise);
  const insertExercise = useWeekStore((s) => s.insertExercise);
  const removeExercise = useWeekStore((s) => s.removeExercise);
  const updateExercise = useWeekStore((s) => s.updateExercise);

  const dayList = week[activeDay] || [];

  // col indices: 0=exercise, 1=sets, 2=reps, 3=weight
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [pendingFocus, setPendingFocus] = useState<{ row: number; col: number } | null>(null);

  const setCellRef = (row: number, col: number) => (el: HTMLInputElement | null) => {
    const key = `${row}:${col}`;
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  };

  const focusCell = (row: number, col: number) => {
    const el = cellRefs.current.get(`${row}:${col}`);
    if (el) { el.focus(); el.select(); }
  };

  useEffect(() => {
    if (!pendingFocus) return;
    focusCell(pendingFocus.row, pendingFocus.col);
    setPendingFocus(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayList.length, pendingFocus]);

  const addRowAndFocus = (fromRow: number, col: number) => {
    addExercise(activeDay, { ...dayList[fromRow] });
    setPendingFocus({ row: dayList.length, col });
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number,
  ) => {
    const isLastRow = row === dayList.length - 1;
    if (e.key === "ArrowUp") {
      if (row === 0) return;
      e.preventDefault();
      focusCell(row - 1, col);
    } else if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      if (isLastRow) addRowAndFocus(row, col);
      else focusCell(row + 1, col);
    }
  };

  const [draft, setDraft] = useState({
    name: "",
    sets: "",
    reps: "",
    weight: "",
  });
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});

  const getCellKey = (rowIndex: number, field: NumericField) =>
    `${activeDay}:${rowIndex}:${field}`;

  const getRawFieldError = (field: NumericField, rawValue: string): string => {
    const parsed = parseNumericInput(rawValue);
    if (parsed === null) return "Enter a valid number.";
    return getNumericFieldError(field, parsed) ?? "";
  };

  const getCellError = (
    rowIndex: number,
    field: NumericField,
    storedValue: number,
  ): string => {
    const rawValue = cellDrafts[getCellKey(rowIndex, field)];
    if (rawValue !== undefined) {
      return getRawFieldError(field, rawValue);
    }
    return getNumericFieldError(field, storedValue) ?? "";
  };

  const commitNumericCell = (
    rowIndex: number,
    field: NumericField,
    rawValue: string,
  ) => {
    const cellKey = getCellKey(rowIndex, field);
    setCellDrafts((prev) => ({ ...prev, [cellKey]: rawValue }));

    const patchByField: Record<
      NumericField,
      (value: number) => Partial<WorkoutEntry>
    > = {
      sets: (value) => ({ sets: value }),
      reps: (value) => ({ reps: value }),
      weight: (value) => ({ weight: value }),
    };

    const parsed = parseNumericInput(rawValue);
    if (parsed === null) {
      updateExercise(activeDay, rowIndex, patchByField[field](-1));
      return;
    }

    updateExercise(activeDay, rowIndex, patchByField[field](parsed));
    setCellDrafts((prev) => {
      const next = { ...prev };
      delete next[cellKey];
      return next;
    });
  };

  const handleDuplicateRow = (rowIndex: number) => {
    insertExercise(activeDay, rowIndex, { ...dayList[rowIndex] });
  };

  const handleRemoveRow = (rowIndex: number) => {
    setCellDrafts((prev) => {
      const next: Record<string, string> = {};
      const dayPrefix = `${activeDay}:`;
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(dayPrefix)) {
          next[key] = value;
        }
      }
      return next;
    });
    removeExercise(activeDay, rowIndex);
  };

  const transientInvalidCount = useMemo(
    () =>
      Object.values(cellDrafts).filter(
        (rawValue) => parseNumericInput(rawValue) === null,
      ).length,
    [cellDrafts],
  );

  useEffect(() => {
    onTransientInvalidCountChange?.(transientInvalidCount);
  }, [onTransientInvalidCountChange, transientInvalidCount]);

  const draftSetsError =
    draft.sets.trim() === "" ? "" : getRawFieldError("sets", draft.sets);
  const draftRepsError =
    draft.reps.trim() === "" ? "" : getRawFieldError("reps", draft.reps);
  const draftWeightError =
    draft.weight.trim() === ""
      ? ""
      : getRawFieldError("weight", draft.weight);
  const canAddDraft =
    !draftSetsError &&
    !draftRepsError &&
    !draftWeightError &&
    Boolean(draft.name.trim()) &&
    draft.sets.trim() !== "" &&
    draft.reps.trim() !== "" &&
    draft.weight.trim() !== "";

  const handleAdd = () => {
    if (!canAddDraft) return;

    const parsedSets = parseNumericInput(draft.sets);
    const parsedReps = parseNumericInput(draft.reps);
    const parsedWeight = parseNumericInput(draft.weight);
    if (parsedSets === null || parsedReps === null || parsedWeight === null)
      return;

    addExercise(activeDay, {
      name: draft.name,
      sets: parsedSets,
      reps: parsedReps,
      weight: parsedWeight,
    });
  };

  const isWeekEmpty = Object.values(week).every((d) => d.length === 0);

  return (
    <>
      {isWeekEmpty ? (
        <div className="empty-state" style={{ padding: "64px 20px" }}>
          <div className="sci-icon" style={{ margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3
            style={{
              color: "var(--text)",
              fontFamily: "var(--font-display)",
              margin: "0 0 8px",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            Getting started
          </h3>
          <p
            className="dim"
            style={{ maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}
          >
            Pick a day above, then add your first exercise: choose from the
            list, set sets × reps × kg.
          </p>
        </div>
      ) : dayList.length > 0 ? (
        <table className="entry-table">
          <thead>
            <tr>
              <th style={{ width: "36px" }}>#</th>
              <th>Exercise</th>
              <th style={{ width: "80px" }}>Sets</th>
              <th style={{ width: "80px" }}>Reps</th>
              <th style={{ width: "100px" }}>Weight</th>
              <th>Primary muscles</th>
              <th style={{ width: "72px" }} />
            </tr>
          </thead>
          <tbody>
            {dayList.map((ex, i) => {
              const def = EXERCISES.find((e) => e.name === ex.name);
              const muscles = Object.keys(def?.primary || {}) as MuscleId[];
              const setsError = getCellError(i, "sets", ex.sets);
              const repsError = getCellError(i, "reps", ex.reps);
              const weightError = getCellError(i, "weight", ex.weight);
              const rowErrorMessages = Array.from(
                new Set([setsError, repsError, weightError].filter(Boolean)),
              ) as string[];
              const hasRowErrors = rowErrorMessages.length > 0;

              return (
                <Fragment key={`row-group-${i}`}>
                  <tr
                    key={`row-${i}`}
                    className={hasRowErrors ? "has-error" : ""}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === "d") {
                        e.preventDefault();
                        handleDuplicateRow(i);
                      }
                    }}
                  >
                    <td className="mono dim">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td>
                      <ExerciseCombobox
                        value={ex.name}
                        onChange={(val) =>
                          updateExercise(activeDay, i, { name: val })
                        }
                        inputRef={setCellRef(i, 0)}
                      />
                    </td>
                    <td>
                      <input
                        ref={setCellRef(i, 1)}
                        type="text"
                        inputMode="numeric"
                        value={
                          cellDrafts[getCellKey(i, "sets")] ?? String(ex.sets)
                        }
                        className={setsError ? "field-invalid" : ""}
                        aria-invalid={Boolean(setsError)}
                        title={setsError || undefined}
                        onChange={(e) =>
                          commitNumericCell(i, "sets", e.target.value)
                        }
                        onKeyDown={(e) => handleCellKeyDown(e, i, 1)}
                      />
                    </td>
                    <td>
                      <input
                        ref={setCellRef(i, 2)}
                        type="text"
                        inputMode="numeric"
                        value={
                          cellDrafts[getCellKey(i, "reps")] ?? String(ex.reps)
                        }
                        className={repsError ? "field-invalid" : ""}
                        aria-invalid={Boolean(repsError)}
                        title={repsError || undefined}
                        onChange={(e) =>
                          commitNumericCell(i, "reps", e.target.value)
                        }
                        onKeyDown={(e) => handleCellKeyDown(e, i, 2)}
                      />
                    </td>
                    <td>
                      <div className="weight-cell">
                        <input
                          ref={setCellRef(i, 3)}
                          type="text"
                          inputMode="decimal"
                          value={
                            cellDrafts[getCellKey(i, "weight")] ??
                            String(ex.weight)
                          }
                          className={weightError ? "field-invalid" : ""}
                          aria-invalid={Boolean(weightError)}
                          title={weightError || undefined}
                          onChange={(e) =>
                            commitNumericCell(i, "weight", e.target.value)
                          }
                          onKeyDown={(e) => handleCellKeyDown(e, i, 3)}
                        />
                        <span className="mono dim">kg</span>
                      </div>
                    </td>
                    <td>
                      <div className="muscle-chips">
                        {muscles.map((m) => {
                          const color = scoreToColor(loads[m]);
                          return (
                            <span
                              key={m}
                              className="m-chip"
                              style={{ borderColor: color + "55", color }}
                            >
                              {MUSCLE_GROUPS.find((g) => g.id === m)?.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          className="icon-btn icon-btn--dup"
                          tabIndex={-1}
                          onClick={() => handleDuplicateRow(i)}
                          aria-label="duplicate row"
                          title="Duplicate row (Ctrl+D)"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="11"
                              height="11"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                            <path
                              d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <button
                          className="icon-btn"
                          tabIndex={-1}
                          onClick={() => handleRemoveRow(i)}
                          aria-label="remove"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {hasRowErrors ? (
                    <tr key={`row-error-${i}`} className="entry-row-error">
                      <td colSpan={7}>
                        <div className="row-error-msg">
                          {rowErrorMessages.join(" ")}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M8 12h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="dim">
            No exercises logged. Rest day, or add one below.
          </p>
        </div>
      )}

      <div className="add-row">
        <div className="add-cell grow">
          <label className="mono dim">EXERCISE</label>
          <ExerciseCombobox
            value={draft.name}
            onChange={(val) => setDraft({ ...draft, name: val })}
          />
        </div>
        <div className="add-cell">
          <label className="mono dim">SETS</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Sets"
            value={draft.sets}
            className={draftSetsError ? "field-invalid" : ""}
            aria-invalid={Boolean(draftSetsError)}
            title={draftSetsError || undefined}
            onChange={(e) => setDraft({ ...draft, sets: e.target.value })}
          />
        </div>
        <div className="add-cell">
          <label className="mono dim">REPS</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Reps"
            value={draft.reps}
            className={draftRepsError ? "field-invalid" : ""}
            aria-invalid={Boolean(draftRepsError)}
            title={draftRepsError || undefined}
            onChange={(e) => setDraft({ ...draft, reps: e.target.value })}
          />
        </div>
        <div className="add-cell">
          <label className="mono dim">WEIGHT (KG)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Weight"
            value={draft.weight}
            className={draftWeightError ? "field-invalid" : ""}
            aria-invalid={Boolean(draftWeightError)}
            title={draftWeightError || undefined}
            onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
          />
        </div>
        <button
          className="btn primary tall"
          onClick={handleAdd}
          disabled={!canAddDraft}
          title={
            !canAddDraft
              ? "Fix invalid values before adding this exercise."
              : undefined
          }
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Add
        </button>
      </div>
      {!canAddDraft &&
      (draftSetsError || draftRepsError || draftWeightError) ? (
        <div className="add-row-error mono">
          {[draftSetsError, draftRepsError, draftWeightError]
            .filter(Boolean)
            .join(" ")}
        </div>
      ) : null}
    </>
  );
}
