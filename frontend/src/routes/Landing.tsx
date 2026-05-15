import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Body3D from '../components/Body3D';
import DemoModal from '../components/DemoModal';
import { computeMuscleLoad } from '../lib/scoring';
import { SAMPLE_WEEK } from '../lib/exercises';
import { useUIStore } from '../store/ui';

// ----- smooth scroll hook -----
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);

  return active;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const NAV_SECTIONS = ['how-it-works', 'science', 'changelog'];

export default function Landing() {
  const navigate = useNavigate();
  const onStart = () => navigate('/log');
  const active = useActiveSection(NAV_SECTIONS);
  const [demoOpen, setDemoOpen] = useState(false);
  const openChangelog = useUIStore((s) => s.openChangelog);

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
          <a
            className={active === 'how-it-works' ? 'nav-active' : ''}
            onClick={() => scrollTo('how-it-works')}
          >
            How it works
          </a>
          <a
            className={active === 'science' ? 'nav-active' : ''}
            onClick={() => scrollTo('science')}
          >
            Science
          </a>
          <a
            className={active === 'changelog' ? 'nav-active' : ''}
            onClick={openChangelog}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openChangelog()}
          >
            Changelog
          </a>
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
            <button className="btn ghost big" onClick={() => setDemoOpen(true)}>
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

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="bullets">
        <div className="bullet">
          <span className="mono dim">01 / LOG</span>
          <h3>A table, not a wizard.</h3>
          <p>Pick the day, pick the lift, type sets × reps × kg. Built for people who train, not people who fill out forms.</p>
        </div>
        <div className="bullet">
          <span className="mono dim">02 / MAP</span>
          <h3>Rules-based muscle scoring.</h3>
          <p>Each lift maps to primary and secondary muscles. Reps and load modulate intensity. No black box.</p>
        </div>
        <div className="bullet">
          <span className="mono dim">03 / READ</span>
          <h3>One paragraph, one workout.</h3>
          <p>Gemini gets a structured JSON of your week and replies with what to do Monday morning. Three sentences. Four exercises. Done.</p>
        </div>
      </section>

      {/* ─── SCIENCE ─── */}
      <section id="science" className="science-section">
        <div className="section-label mono dim">THE SCIENCE</div>
        <h2 className="section-title">How the numbers work</h2>

        <div className="science-grid">
          <div className="science-card">
            <div className="sci-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <h4>How we score muscles</h4>
            <p>Each lift has fixed load weights per muscle (e.g., Back Squat: quads 1.0, glutes 0.8, hamstrings 0.5). Per set: <span className="mono hl">sets × rep_factor × load_factor × muscle_weight</span>. Summed across the week, normalized to a 0–100 score.</p>
            <p>Reps: ≤6 = 1.0×, 7–12 = 0.85×, 13+ = 0.7×. Load: bodyweight = 0.7×, &lt;40 kg = 0.85×, 40–100 kg = 1.0×, ≥100 kg = 1.3×.</p>
          </div>

          <div className="science-card">
            <div className="sci-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="currentColor" opacity="0.8"/></svg>
            </div>
            <h4>How Gemini uses the data</h4>
            <p>Gemini receives a structured JSON object containing only your weekly muscle load scores (0–100 per region) — no personal details, no raw log entries. It then generates a 3–4 sentence coaching summary identifying overtrained (≥70), balanced (30–70), and undertrained (&lt;30) muscle groups.</p>
            <p>The AI output is purely language — it does not alter your scores, access external databases, or make decisions. The scoring math runs entirely in your browser.</p>
          </div>

          <div className="science-card sci-disclaimer">
            <div className="sci-icon sci-icon-red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <h4>What this app is NOT</h4>
            <p>Musclr is <strong>not medical advice</strong>. The scores do not reflect actual muscle fiber strain, injury risk, or physiological readiness. They are a simple proxy for training volume relative to an arbitrary baseline.</p>
            <p>Not for pain, injury, or rehab decisions. If something hurts, see a doctor or physio — not this app.</p>
            <div className="disclaimer-tag mono">for informational purposes only · not a medical device</div>
          </div>
        </div>
      </section>

      {/* ─── CHANGELOG ─── */}
      <section id="changelog" className="changelog-section">
        <div className="section-label mono dim">CHANGELOG</div>
        <h2 className="section-title">What&apos;s new</h2>
        <div className="changelog-list">
          <div className="cl-entry">
            <span className="cl-version mono">v0.3.1</span>
            <span className="cl-date mono dim">May 15 2026</span>
            <div className="cl-changes">
              <div className="cl-change"><span className="cl-tag tag-new">new</span>Wired top-nav links to smooth-scroll sections with active highlighting</div>
              <div className="cl-change"><span className="cl-tag tag-new">new</span>Added Science section with scoring explainer and non-medical disclaimer</div>
              <div className="cl-change"><span className="cl-tag tag-new">new</span>Added Changelog section</div>
            </div>
          </div>
          <div className="cl-entry">
            <span className="cl-version mono">v0.3.0</span>
            <span className="cl-date mono dim">May 14 2026</span>
            <div className="cl-changes">
              <div className="cl-change"><span className="cl-tag tag-new">new</span>Initial production React + TypeScript + Vite build</div>
              <div className="cl-change"><span className="cl-tag tag-new">new</span>3D body heatmap with @react-three/fiber primitives</div>
              <div className="cl-change"><span className="cl-tag tag-new">new</span>Deterministic Gemini insight stub wired to live load scores</div>
            </div>
          </div>
          <div className="cl-entry">
            <span className="cl-version mono">v0.2.0</span>
            <span className="cl-date mono dim">May 13 2026</span>
            <div className="cl-changes">
              <div className="cl-change"><span className="cl-tag tag-fix">fix</span>Muscle load normalization baseline tuned from 20 → 30</div>
              <div className="cl-change"><span className="cl-tag tag-fix">fix</span>Score-to-color lerp corrected at 50-point boundary</div>
              <div className="cl-change"><span className="cl-tag tag-new">new</span>SAMPLE_WEEK seed data added so heatmap is meaningful on first load</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span className="mono dim">musclr / built in 72 hours / cloud run · vertex ai · three.js</span>
        <button
          className="footer-version mono dim"
          onClick={openChangelog}
          aria-label="View changelog — v0.4.0"
        >
          v0.4.0 · build 4a91
        </button>
      </footer>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
