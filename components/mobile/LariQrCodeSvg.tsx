import React, { useMemo } from 'react';
import { buildQrMatrix25 } from '../../services/mobile/lariQrEcosystemService';

export interface LariQrCodeSvgProps {
  payload: string;
  sizePx?: number;
  label?: string;
}

export const LariQrCodeSvg: React.FC<LariQrCodeSvgProps> = ({
  payload,
  sizePx = 148,
  label = 'LARİ Doğrulanmış QR Kodu',
}) => {
  const matrix = useMemo(() => buildQrMatrix25(payload), [payload]);
  const n = matrix.length;

  return (
    <div
      className="inline-flex items-center justify-center rounded-2xl bg-white p-3 border-2 border-slate-300 shadow-xs"
      data-testid="lari-qr-svg-container"
    >
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${n + 2} ${n + 2}`}
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
      >
        <rect x={0} y={0} width={n + 2} height={n + 2} fill="#FFFFFF" />
        {matrix.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c + 1}
                y={r + 1}
                width={1}
                height={1}
                fill="#0F172A"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};

export default LariQrCodeSvg;
