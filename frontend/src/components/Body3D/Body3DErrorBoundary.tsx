import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { failed: boolean; }

export class Body3DErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Body3D] render error:', error.message);
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          className="body3d-fallback"
          role="img"
          aria-label="3D viewer unavailable — muscle scores shown below"
        >
          <svg
            className="body3d-fallback-svg"
            viewBox="0 0 80 160"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="40" cy="16" r="12" fill="var(--surface-2)" />
            <rect x="26" y="30" width="28" height="46" rx="4" fill="var(--surface-2)" />
            <rect x="10" y="32" width="14" height="38" rx="5" fill="var(--surface-2)" />
            <rect x="56" y="32" width="14" height="38" rx="5" fill="var(--surface-2)" />
            <rect x="26" y="80" width="12" height="52" rx="5" fill="var(--surface-2)" />
            <rect x="42" y="80" width="12" height="52" rx="5" fill="var(--surface-2)" />
          </svg>
          <p className="body3d-fallback-msg">3D viewer unavailable</p>
          <p className="body3d-fallback-sub mono dim">Muscle scores are shown below</p>
        </div>
      );
    }
    return this.props.children;
  }
}
