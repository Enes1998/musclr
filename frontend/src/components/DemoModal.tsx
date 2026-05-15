import Modal from './Modal';

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
  /** YouTube or Loom embed URL. Defaults to a Musclr demo placeholder. */
  videoUrl?: string;
}

// Default: YouTube embed for a neutral "coming soon" placeholder
const DEFAULT_VIDEO = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1';

export default function DemoModal({ open, onClose, videoUrl = DEFAULT_VIDEO }: DemoModalProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={900} labelledBy="demo-modal-title">
      <div className="demo-modal">
        <div className="demo-modal-head">
          <div>
            <div className="mono dim" style={{ marginBottom: 4 }}>MUSCLR · DEMO</div>
            <div id="demo-modal-title" className="demo-modal-title">See the full loop in 40 seconds</div>
          </div>
          <div className="demo-modal-meta mono dim">log · map · read</div>
        </div>
        <div className="demo-video-wrap">
          {open && (
            <iframe
              src={videoUrl}
              title="Musclr demo video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            />
          )}
        </div>
        <div className="demo-modal-foot mono dim">
          Log workouts · 3D muscle heatmap · Gemini AI coaching — built in 72 hours
        </div>
      </div>
    </Modal>
  );
}
