import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '../store/ui';
import { CHANGELOG } from '../lib/changelog';

export default function ChangelogDrawer() {
  const changelogOpen = useUIStore((s) => s.changelogOpen);
  const closeChangelog = useUIStore((s) => s.closeChangelog);

  useEffect(() => {
    if (!changelogOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeChangelog(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [changelogOpen, closeChangelog]);

  if (!changelogOpen) return null;

  return createPortal(
    <div
      className="drawer-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) closeChangelog(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-drawer-title"
    >
      <aside className="drawer-panel">
        <div className="drawer-header">
          <div>
            <div className="mono dim" style={{ fontSize: 10, marginBottom: 4, letterSpacing: '0.08em' }}>
              MUSCLR · CHANGELOG
            </div>
            <h2 id="changelog-drawer-title" className="drawer-title">What's new</h2>
          </div>
          <button
            className="drawer-close"
            onClick={closeChangelog}
            aria-label="Close changelog"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="drawer-entry">
              <div className="drawer-entry-head">
                <span className="cl-version mono">{entry.version}</span>
                <span className="cl-date mono dim">{entry.date}</span>
              </div>
              <div className="cl-changes">
                {entry.changes.map((c, i) => (
                  <div key={i} className="cl-change">
                    <span className={`cl-tag tag-${c.tag}`}>{c.tag}</span>
                    {c.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>,
    document.body
  );
}
