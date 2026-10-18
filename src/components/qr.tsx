'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

/** QR code generated in the browser (the encoded value never leaves the page). */
export function QrCode({ value, size = 96, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 0, width: size * 3, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [value, size]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" width={size} height={size} className={className} /> : <span style={{ width: size, height: size }} className={cn('inline-block bg-slate-100', className)} />;
}
