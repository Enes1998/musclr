'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

/**
 * Camera barcode scanner (web) using ZXing. Streams the device camera into a <video> and calls
 * onDetected with the first decoded barcode, then stops the stream.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let done = false;

    void (async () => {
      try {
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
          if (result && !done) {
            done = true;
            controls?.stop();
            onDetected(result.getText());
          }
        });
      } catch (e) {
        setError(
          e instanceof Error
            ? `Camera unavailable: ${e.message}. Grant camera permission, or search by name instead.`
            : String(e),
        );
      }
    })();

    return () => {
      done = true;
      try {
        controls?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [onDetected]);

  return (
    <div className="mt-3 rounded-xl border border-line bg-bg-2 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Scan a barcode</p>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-xs text-ink-3 hover:text-ink">
          Close
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-load-over">⚠ {error}</p>
      ) : (
        <video
          ref={videoRef}
          className="mt-2 aspect-video w-full rounded-lg bg-black"
          muted
          playsInline
          aria-label="Barcode camera preview"
        />
      )}
      <p className="mt-2 font-mono text-xs text-ink-3">Point your camera at a product barcode (EAN/UPC).</p>
    </div>
  );
}
