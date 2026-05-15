import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeekStore } from "../store/week";
import { computeMuscleLoad, scoreToColor, scoreLabel } from "../lib/scoring";
import { DAYS, MUSCLE_GROUPS } from "../lib/exercises";
import type { MuscleId } from "../lib/exercises";
import { generateInsight } from "../lib/insight";
import type { InsightResult } from "../lib/insight";
import { getTrustedWeekTotals, getWeekValidation } from "../lib/validation";
import {
  deleteProfile,
  listProfiles,
  loadProfileWeek,
  saveProfile,
} from "../lib/profiles";
import type { SavedProfile } from "../lib/profiles";
import AppBar from "../components/AppBar";
import Body3D from "../components/Body3D";
import InsightCard from "../components/InsightCard";
import NextWorkoutCard from "../components/NextWorkoutCard";

export default function Summary() {
  const navigate = useNavigate();
  const week = useWeekStore((s) => s.week);
  const setWeek = useWeekStore((s) => s.setWeek);

  const [insightStatus, setInsightStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [insightData, setInsightData] = useState<InsightResult | null>(null);

  // profiles
  const [profiles, setProfiles] = useState<SavedProfile[]>(() => listProfiles());
  const [profileName, setProfileName] = useState("");
  const [loadSlug, setLoadSlug] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (msg: string) => {
    setProfileMsg(msg);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setProfileMsg(null), 2500);
  };

  useEffect(() => () => { if (msgTimer.current) clearTimeout(msgTimer.current); }, []);

  const handleSave = () => {
    const name = profileName.trim() || "Unnamed";
    saveProfile(name, week);
    const updated = listProfiles();
    setProfiles(updated);
    setLoadSlug(updated[0]?.slug ?? "");
    if (!compareSlug) setCompareSlug(updated[0]?.slug ?? "");
    setProfileName("");
    flash(`Saved "${name}"`);
  };

  const handleLoad = () => {
    if (!loadSlug) return;
    const data = loadProfileWeek(loadSlug);
    if (!data) { flash("Profile not found."); return; }
    setWeek(() => data);
    const name = profiles.find((p) => p.slug === loadSlug)?.name ?? loadSlug;
    flash(`Loaded "${name}"`);
  };

  const handleDelete = (slug: string) => {
    deleteProfile(slug);
    const updated = listProfiles();
    setProfiles(updated);
    if (loadSlug === slug) setLoadSlug(updated[0]?.slug ?? "");
    if (compareSlug === slug) setCompareSlug(updated[0]?.slug ?? "");
  };

  // comparison
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlug, setCompareSlug] = useState(() => listProfiles()[0]?.slug ?? "");
  const [compareLoads, setCompareLoads] = useState<Record<MuscleId, number> | null>(null);

  useEffect(() => {
    if (!compareMode || !compareSlug) { setCompareLoads(null); return; }
    const refWeek = loadProfileWeek(compareSlug);
    setCompareLoads(refWeek ? computeMuscleLoad(refWeek) : null);
  }, [compareMode, compareSlug]);

  const loads = computeMuscleLoad(week);
  const weekValidation = getWeekValidation(week);
  const weekTotals = getTrustedWeekTotals(week);
  const canGenerateInsights = !weekValidation.hasInvalidRows;

  const handleGenerate = async (useSampleFallback = false) => {
    if (!canGenerateInsights) return;

    setInsightStatus("loading");
    try {
      if (useSampleFallback) {
        const res = await generateInsight(loads);
        setInsightData(res);
        setInsightStatus("success");
        return;
      }

      // Simulate network delay
      await new Promise((r) => setTimeout(r, 1200));
      // Simulate ~30% failure rate
      if (Math.random() < 0.3) throw new Error("Network timeout");

      const res = await generateInsight(loads);
      setInsightData(res);
      setInsightStatus("success");
    } catch {
      setInsightStatus("error");
    }
  };
  const sortedLoads = [...MUSCLE_GROUPS]
    .map((m) => ({ ...m, score: loads[m.id] }))
    .sort((a, b) => b.score - a.score);

  const over = sortedLoads.filter((m) => m.score >= 70);
  const under = sortedLoads.filter((m) => m.score < 30);

  const totalSets = weekTotals.totalSets;
  const totalVol = weekTotals.totalVolume;
  const daysTrained = weekTotals.daysTrained;

  const dateRange = `WEEK OF ${DAYS[0].date.toUpperCase()} — ${DAYS[DAYS.length - 1].date.toUpperCase()}`;

  return (
    <div className="summary">
      <AppBar
        activeTab="summary"
        onNav={navigate}
        canGenerateInsights={canGenerateInsights}
      />

      <div className="summary-header">
        <div>
          <div className="mono dim">{dateRange}</div>
          <h1 className="page-title">Heatmap & Gemini read</h1>
        </div>
        <div className="summary-kpis">
          <div className="kpi">
            <div className="kpi-n">
              {daysTrained}
              <span className="kpi-suf">/7</span>
            </div>
            <div className="kpi-l">days trained</div>
          </div>
          <div className="kpi-div" />
          <div className="kpi">
            <div className="kpi-n">{totalSets}</div>
            <div className="kpi-l">sets</div>
          </div>
          <div className="kpi-div" />
          <div className="kpi">
            <div className="kpi-n">
              {Math.round(totalVol / 1000)}
              <span className="kpi-suf">t</span>
            </div>
            <div className="kpi-l">tonnage</div>
          </div>
          <div className="kpi-div" />
          <div className="kpi">
            <div className="kpi-n" style={{ color: "#f44336" }}>
              {over.length}
            </div>
            <div className="kpi-l">red zones</div>
          </div>
          <div className="kpi-div" />
          <div className="kpi">
            <div className="kpi-n" style={{ color: "#4caf50" }}>
              {under.length}
            </div>
            <div className="kpi-l">green zones</div>
          </div>
        </div>
      </div>

      {daysTrained === 0 ? (
        <div style={{ padding: "0 32px" }}>
          <div
            className="empty-state"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "64px 20px",
              maxWidth: "640px",
              margin: "48px auto",
            }}
          >
            <div className="sci-icon" style={{ margin: "0 auto 20px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h3
              style={{
                color: "var(--text)",
                fontFamily: "var(--font-display)",
                margin: "0 0 12px",
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              No training logged this week
            </h3>
            <p
              className="dim"
              style={{
                maxWidth: 360,
                margin: "0 auto 24px",
                lineHeight: 1.6,
                fontSize: "15px",
              }}
            >
              Log at least one set to unlock the heatmap and Gemini read.
            </p>
            <button
              className="btn primary big"
              onClick={() => navigate("/log")}
            >
              Go to Logger
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14m-6-6 6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="summary-grid">
          <section className="body-section">
            <div className="section-head">
              <span className="mono dim">3D MUSCLE HEATMAP</span>
              <span className="mono dim">drag to rotate</span>
            </div>
            <div className="body-stage">
              <Body3D loads={loads} />
            </div>

            <div className="load-legend">
              {(
                [
                  { label: "Undertrained", range: "0–29", score: 15 },
                  { label: "Balanced", range: "30–59", score: 45 },
                  { label: "Well-trained", range: "60–79", score: 70 },
                  { label: "Overtrained", range: "80–100", score: 90 },
                ] as const
              ).map(({ label, range, score }) => (
                <div key={label} className="legend-item">
                  <span
                    className="legend-swatch"
                    style={{ background: scoreToColor(score) }}
                  />
                  <span className="legend-range mono">{range}</span>
                  <span className="legend-label">{label}</span>
                </div>
              ))}
            </div>

            {profiles.length > 0 && (
              <div className="cmp-bar">
                <button
                  className={`btn ${compareMode ? "primary" : "ghost"} cmp-toggle`}
                  onClick={() => setCompareMode((v) => !v)}
                >
                  {compareMode ? "✕ Stop comparing" : "⇄ Compare weeks"}
                </button>
                {compareMode && (
                  <select
                    className="profile-select cmp-select"
                    value={compareSlug}
                    onChange={(e) => setCompareSlug(e.target.value)}
                  >
                    {profiles.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="load-grid">
              {sortedLoads.map((m) => {
                const ref = compareLoads?.[m.id] ?? null;
                const delta = ref !== null ? m.score - ref : null;
                return (
                  <div
                    key={m.id}
                    className="load-tile"
                    title={
                      ref !== null
                        ? `${m.label}: ${m.score} now, ${ref} ref (${delta! >= 0 ? "+" : ""}${delta})`
                        : `${m.label}: ${m.score} – ${scoreLabel(m.score)}`
                    }
                  >
                    <div className="load-tile-top">
                      <span className="load-label">{m.label}</span>
                      <div className="cmp-score-group">
                        <span
                          className="load-val mono"
                          style={{ color: scoreToColor(m.score) }}
                        >
                          {m.score}
                        </span>
                        {delta !== null && (
                          <span
                            className={`cmp-delta mono ${delta > 0 ? "cmp-up" : delta < 0 ? "cmp-dn" : "cmp-eq"}`}
                          >
                            {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"}
                            {delta !== 0 ? Math.abs(delta) : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="load-bar">
                      <div
                        className="load-fill"
                        style={{
                          width: m.score + "%",
                          background: scoreToColor(m.score),
                        }}
                      />
                    </div>
                    {ref !== null && (
                      <div className="load-bar cmp-ref-bar">
                        <div
                          className="load-fill"
                          style={{
                            width: ref + "%",
                            background: scoreToColor(ref),
                            opacity: 0.45,
                          }}
                        />
                      </div>
                    )}
                    <div
                      className="load-status mono"
                      style={{ color: scoreToColor(m.score) }}
                    >
                      {ref !== null
                        ? `ref: ${ref}`
                        : scoreLabel(m.score)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="insight-section">
            {!canGenerateInsights ? (
              <div
                className="validation-banner mono"
                style={{ marginBottom: "12px" }}
              >
                Invalid rows in Logger — fix before generating.
              </div>
            ) : null}

            {insightStatus === "idle" && (
              <div
                className="side-card"
                style={{ padding: "32px 24px", textAlign: "center" }}
              >
                <div className="sci-icon" style={{ margin: "0 auto 16px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    margin: "0 0 12px",
                    fontSize: "18px",
                  }}
                >
                  Ask Gemini
                </h3>
                <p className="dim" style={{ fontSize: 13, marginBottom: 20 }}>
                  Reads your week. Tells you what to do next.
                </p>
                <button
                  className="btn primary wide"
                  onClick={() => handleGenerate(false)}
                  disabled={!canGenerateInsights}
                  title={
                    !canGenerateInsights
                      ? "Fix invalid rows in Logger first."
                      : undefined
                  }
                >
                  Generate weekly insight
                </button>
              </div>
            )}

            {insightStatus === "error" && (
              <div
                className="side-card"
                style={{
                  padding: "32px 24px",
                  textAlign: "center",
                  borderColor: "rgba(244,67,54,0.3)",
                }}
              >
                <div
                  className="sci-icon sci-icon-red"
                  style={{ margin: "0 auto 16px" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    margin: "0 0 12px",
                    color: "var(--red)",
                    fontSize: "18px",
                  }}
                >
                  Generation failed
                </h3>
                <p className="dim" style={{ fontSize: 13, marginBottom: 20 }}>
                  Gemini timed out or is unavailable.
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <button
                    className="btn primary wide"
                    onClick={() => handleGenerate(false)}
                    disabled={!canGenerateInsights}
                  >
                    Try again
                  </button>
                  <button
                    className="btn ghost wide"
                    onClick={() => handleGenerate(true)}
                    disabled={!canGenerateInsights}
                  >
                    Use sample insight
                  </button>
                </div>
              </div>
            )}

            {(insightStatus === "loading" || insightStatus === "success") && (
              <>
                <InsightCard
                  loads={loads}
                  status={insightStatus}
                  insight={insightData}
                />
                <NextWorkoutCard
                  loads={loads}
                  status={insightStatus}
                  insight={insightData}
                />
              </>
            )}

            <div className="side-card profile-card">
              <div className="side-head">
                <span className="mono dim">SAVED WEEKS</span>
                {profileMsg && (
                  <span className="profile-msg mono">{profileMsg}</span>
                )}
              </div>

              <div className="profile-row">
                <input
                  type="text"
                  className="profile-input"
                  placeholder="Name this week…"
                  value={profileName}
                  maxLength={40}
                  onChange={(e) => setProfileName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <button className="btn primary" onClick={handleSave}>
                  Save
                </button>
              </div>

              {profiles.length > 0 && (
                <>
                  <div className="profile-row" style={{ marginTop: 8 }}>
                    <select
                      className="profile-select"
                      value={loadSlug}
                      onChange={(e) => setLoadSlug(e.target.value)}
                    >
                      {profiles.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn ghost"
                      onClick={handleLoad}
                      disabled={!loadSlug}
                    >
                      Load
                    </button>
                  </div>

                  <ul className="profile-list">
                    {profiles.map((p) => (
                      <li key={p.slug} className="profile-list-item">
                        <span className="profile-list-name">{p.name}</span>
                        <span className="profile-list-date mono dim">
                          {new Date(p.savedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <button
                          className="icon-btn icon-btn--sm"
                          tabIndex={-1}
                          aria-label={`delete ${p.name}`}
                          onClick={() => handleDelete(p.slug)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="footnote mono dim">
              Scores = sets × reps × load, normalized 0–100.{" "}
              <span className="hl">Vertex AI · Gemini 2.5 Pro</span>.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
