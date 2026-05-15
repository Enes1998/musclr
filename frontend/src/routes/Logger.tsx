import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeekStore } from "../store/week";
import { computeMuscleLoad } from "../lib/scoring";
import { DAYS } from "../lib/exercises";
import {
  getTrustedDayTotals,
  getTrustedWeekTotals,
  getWeekValidation,
} from "../lib/validation";
import AppBar from "../components/AppBar";
import WeekGrid from "../components/WeekGrid";
import EntryTable from "../components/EntryTable";
import LoadMap from "../components/LoadMap";

export default function Logger() {
  const navigate = useNavigate();
  const week = useWeekStore((s) => s.week);
  const activeDay = useWeekStore((s) => s.activeDay);
  const resetWeek = useWeekStore((s) => s.resetWeek);
  const [transientInvalidCount, setTransientInvalidCount] = useState(0);

  const loads = computeMuscleLoad(week);
  const dayList = week[activeDay] || [];
  const weekValidation = getWeekValidation(week);
  const weekTotals = getTrustedWeekTotals(week);
  const dayTotals = getTrustedDayTotals(dayList);
  const canGenerateInsights =
    !weekValidation.hasInvalidRows && transientInvalidCount === 0;

  const totalSets = weekTotals.totalSets;
  const totalVol = weekTotals.totalVolume;
  const daysTrained = weekTotals.daysTrained;

  return (
    <div className="logger">
      <AppBar
        activeTab="log"
        onNav={navigate}
        canGenerateInsights={canGenerateInsights}
      />

      <WeekGrid />

      <div className="logger-body">
        <section className="entry-panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">
                {DAYS.find((d) => d.id === activeDay)?.date.toUpperCase()}
              </div>
              <h2 className="panel-title">
                {DAYS.find((d) => d.id === activeDay)?.label}day session
              </h2>
            </div>
            <div className="panel-meta mono">
              {dayList.length} ex · {dayTotals.sets} sets ·{" "}
              {Math.round((dayTotals.volume / 1000) * 10) / 10}t vol
            </div>
          </div>

          <EntryTable
            loads={loads}
            onTransientInvalidCountChange={setTransientInvalidCount}
          />
        </section>

        <aside className="side-panel">
          <div className="side-card">
            <div className="side-head">
              <span className="mono dim">WEEK TOTALS</span>
            </div>
            <div className="stats-grid">
              <div>
                <div className="stat-n">
                  {daysTrained}
                  <span className="stat-suf">/7</span>
                </div>
                <div className="stat-l">days trained</div>
              </div>
              <div>
                <div className="stat-n">{totalSets}</div>
                <div className="stat-l">total sets</div>
              </div>
              <div>
                <div className="stat-n">
                  {Math.round(totalVol / 1000)}
                  <span className="stat-suf">t</span>
                </div>
                <div className="stat-l">tonnage</div>
              </div>
              <div>
                <div className="stat-n">{weekTotals.totalExercises}</div>
                <div className="stat-l">exercises</div>
              </div>
            </div>
          </div>

          <LoadMap loads={loads} />

          <button
            className="cta-block"
            onClick={() => navigate("/summary")}
            disabled={!canGenerateInsights}
            title={
              !canGenerateInsights
                ? "Fix invalid rows before generating insight."
                : undefined
            }
          >
            <div>
              <div className="cta-eyebrow mono">READY?</div>
              <div className="cta-title">See the week → ask Gemini</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {!canGenerateInsights ? (
            <div className="validation-banner mono">
              Invalid rows — fix sets, reps, or weight before generating.
            </div>
          ) : null}

          <button
            className="btn ghost danger"
            style={{ marginTop: "8px" }}
            onClick={resetWeek}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 3v5h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Reset week
          </button>
        </aside>
      </div>
    </div>
  );
}
