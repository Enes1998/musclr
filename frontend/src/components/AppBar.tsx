import { useUIStore } from '../store/ui';

interface AppBarProps {
  activeTab: "log" | "summary";
  onNav: (path: string) => void;
  canGenerateInsights?: boolean;
}

export default function AppBar({
  activeTab,
  onNav,
  canGenerateInsights = true,
}: AppBarProps) {
  const insightsDisabled = activeTab === "log" && !canGenerateInsights;
  const openChangelog = useUIStore((s) => s.openChangelog);

  return (
    <header className="appbar">
      <button
        type="button"
        className="brand small"
        onClick={() => onNav("/")}
        aria-label="Musclr — go to home"
      >
        <div className="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 8 L4 16 M8 5 L8 19 M12 3 L12 21 M16 5 L16 19 M20 8 L20 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="brand-name">MUSCLR</span>
      </button>
      <nav className="appbar-tabs" aria-label="Main navigation">
        <button
          className={`tab ${activeTab === "log" ? "on" : ""}`}
          onClick={() => onNav("/log")}
          aria-current={activeTab === "log" ? "page" : undefined}
        >
          Log week
        </button>
        <button
          className={`tab ${activeTab === "summary" ? "on" : ""}`}
          onClick={() => onNav("/summary")}
          aria-current={activeTab === "summary" ? "page" : undefined}
        >
          Weekly summary
        </button>
        <button
          className="tab"
          onClick={openChangelog}
          aria-label="Open changelog"
        >
          Changelog
        </button>
      </nav>
      <div className="appbar-right">
        {activeTab === "log" ? (
          <>
            <div className="week-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M3 9h18M8 3v4M16 3v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Week of May 5 – May 11
            </div>
            <button
              className="btn primary"
              onClick={() => onNav("/summary")}
              disabled={insightsDisabled}
              title={
                insightsDisabled
                  ? "Fix invalid rows before generating insight."
                  : undefined
              }
            >
              Generate insights
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button className="btn ghost" onClick={() => onNav("/log")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12H5m6 6-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to log
            </button>
            <button className="btn primary" aria-label="Export PDF" disabled title="Export PDF (coming soon)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Export PDF
            </button>
          </>
        )}
      </div>
    </header>
  );
}
