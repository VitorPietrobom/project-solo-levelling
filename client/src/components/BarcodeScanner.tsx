import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

// Limit to the retail-barcode formats — otherwise ZXing also tries to
// decode QR codes, which is both slower and more likely to false-positive
// on unrelated packaging text.
const HINTS = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128,
]);

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(HINTS);
    let controls: IScannerControls | null = null;
    let cancelled = false;

    reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, err) => {
      if (cancelled) return;
      if (result) {
        onDetected(result.getText());
      } else if (err && !(err instanceof NotFoundException)) {
        // NotFoundException fires continuously while no barcode is in frame — expected, not an error.
        setError('Camera error — try again or enter the barcode manually.');
      }
    }).then((c) => { if (!cancelled) controls = c; else c.stop(); })
      .catch(() => { if (!cancelled) setError('Could not access the camera. Check permissions and try again.'); });

    return () => { cancelled = true; controls?.stop(); };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-label="Scan barcode">
      <div className="bg-card rounded-lg p-4 border border-border w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-text-primary font-semibold">Scan Barcode</h3>
          <button onClick={onClose} className="text-text-secondary text-sm hover:opacity-80" aria-label="Close scanner">✕</button>
        </div>
        {error ? (
          <p className="text-accent-warning text-sm py-6 text-center">{error}</p>
        ) : (
          <>
            <video ref={videoRef} className="w-full rounded bg-black aspect-square object-cover" muted playsInline />
            <p className="text-text-secondary text-xs mt-2 text-center">Point the camera at a product barcode</p>
          </>
        )}
      </div>
    </div>
  );
}
