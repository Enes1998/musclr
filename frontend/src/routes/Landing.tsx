import { useNavigate } from 'react-router-dom';
import Body3D from '../components/Body3D';
import { computeMuscleLoad } from '../lib/scoring';
import { SAMPLE_WEEK } from '../lib/exercises';

export default function Landing() {
  const navigate = useNavigate();
  const onStart = () => navigate('/log');

  const sampleLoads = computeMuscleLoad(SAMPLE_WEEK);

  return (
    <div className="landing">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 8 L4 16 M8 5 L8 19 M12 3 L12 21 M16 5 L16 19 M20 8 L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="brand-name">MUSCLR</span>
          <span className="brand-tag">v0.3 · sprint build</span>
        </div>
        <nav className="topnav">
          <a>How it works</a>
          <a>Science</a>
          <a>Changelog</a>
          <button className="btn ghost" onClick={onStart}>Open app →</button>
        </nav>
      </header>

      <main className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>Powered by Gemini · Vertex AI</span>
          </div>
          <h1 className="hero-title">
            Log your week.<br/>
            See your body.<br/>
            <span className="accent">Know what&apos;s next.</span>
          </h1>
          <p className="hero-sub">
            Musclr turns seven days of training into a 3D muscle heatmap. Red is doing too much,
            green is sitting on the bench. Gemini reads the data and writes your next session.
          </p>
          <div className="cta-row">
            <button className="btn primary big" onClick={onStart}>
              Start Logging
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="btn ghost big">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="m10 8 6 4-6 4z" fill="currentColor"/></svg>
              Watch 40-second demo
            </button>
          </div>
          <div className="hero-stats">
            <div><div className="stat-n">7</div><div className="stat-l">day window</div></div>
            <div className="div"/>
            <div><div className="stat-n">10</div><div className="stat-l">muscle regions</div></div>
            <div className="div"/>
            <div><div className="stat-n">~30s</div><div className="stat-l">to AI insight</div></div>
          </div>
        </div>

        <div className="hero-vis">
          <div className="vis-card">
            <div className="vis-head">
              <span className="mono dim">LIVE PREVIEW</span>
              <span className="mono">week of may 5</span>
            </div>
            <div className="vis-body">
              <Body3D loads={sampleLoads} />
            </div>
            <div className="vis-foot">
              <div className="vis-chip"><i style={{background:'#f44336'}}/>Chest +Triceps overloaded</div>
              <div className="vis-chip"><i style={{background:'#4caf50'}}/>Calves undertrained</div>
            </div>
          </div>
          <div className="floating-insight">
            <div className="fi-head">
              <div className="fi-avatar">G</div>
              <div>
                <div className="fi-name">Gemini · weekly read</div>
                <div className="fi-time mono">just now</div>
              </div>
            </div>
            <p className="fi-body">
              You&apos;ve hit chest twice this week with heavy compounds — pecs and triceps are in
              the red. Posterior chain is light. <span className="hl">Pull-focused session</span> Monday:
              deadlifts, rows, face pulls.
            </p>
          </div>
        </div>
      </main>

      <section className="bullets">
        <div className="bullet">
          <span className="mono dim">01 / LOG</span>
          <h3>A table, not a wizard.</h3>
          <p>Pick the day, pick the lift, type sets × reps × kg. Built for people who train, not people who fill out forms.</p>
        </div>
        <div className="bullet">
          <span className="mono dim">02 / MAP</span>
          <h3>Rules-based muscle scoring.</h3>
          <p>Each exercise maps to primary and secondary muscles with load weights. Reps and weight modulate intensity. Transparent math, no black box.</p>
        </div>
        <div className="bullet">
          <span className="mono dim">03 / READ</span>
          <h3>One paragraph, one workout.</h3>
          <p>Gemini gets a structured JSON of your week and replies with what to do Monday morning. Three sentences. Four exercises. Done.</p>
        </div>
      </section>

      <footer className="footer">
        <span className="mono dim">musclr / built in 72 hours / cloud run · vertex ai · three.js</span>
        <span className="mono dim">v0.3.1 · build 4a91</span>
      </footer>
    </div>
  );
}
