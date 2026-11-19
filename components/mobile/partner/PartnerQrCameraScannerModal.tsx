import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, QrCode, ScanLine, ShieldCheck, Sparkles, X } from 'lucide-react';

export interface PartnerQrCameraScannerModalProps {
  open: boolean;
  isDark: boolean;
  healthTourismQrEnabled: boolean;
  onClose: () => void;
  onQrDetected: (rawPayload: string) => void;
  onQuickCameraScan: (kind: 'ht' | 'package' | 'standard') => void;
}

export const PartnerQrCameraScannerModal: React.FC<PartnerQrCameraScannerModalProps> = ({
  open,
  isDark,
  healthTourismQrEnabled,
  onClose,
  onQrDetected,
  onQuickCameraScan,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'initializing' | 'active' | 'unavailable'>('initializing');
  const [statusText, setStatusText] = useState('Kamera vizörü hazırlanıyor...');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let scanTimer: ReturnType<typeof setInterval> | null = null;

    const stopStream = () => {
      if (scanTimer) {
        clearInterval(scanTimer);
        scanTimer = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };

    const startCamera = async () => {
      setCameraState('initializing');
      setStatusText('Arka kamera açılıyor, lütfen QR kodu çerçeveye hizalayın...');
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraState('unavailable');
          setStatusText('Bu cihazda kamera akışı kullanılamıyor; aşağıdaki hızlı QR okuyucu modlarını kullanabilirsiniz.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCameraState('active');
        setStatusText('Kamera aktif • Müşterinin LARİ QR kodunu vizöre tutun');

        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        if (BarcodeDetectorCtor) {
          const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
          scanTimer = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const codes = await detector.detect(videoRef.current);
              const rawValue = codes?.[0]?.rawValue;
              if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
                stopStream();
                onQrDetected(rawValue.trim());
                onClose();
              }
            } catch {
              // continue scanning next frame
            }
          }, 350);
        }
      } catch {
        if (!cancelled) {
          setCameraState('unavailable');
          setStatusText('Kamera izni verilmedi veya kamera meşgul. Cihaz ayarlarından kamera iznini açabilir veya hızlı kabul butonlarını kullanabilirsiniz.');
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, onClose, onQrDetected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Kamera ile Müşteri QR Okuyucu"
      data-testid="partner-qr-camera-scanner-modal"
    >
      <div
        className={`w-full max-w-md rounded-3xl border-2 p-4 space-y-3.5 shadow-2xl ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
              <Camera className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black">Kamera ile QR Müşteri Kabulü</h3>
              <p className="text-[11px] text-slate-500">
                LARİ Cüzdan, Paket ve Sağlık Turizmi QR Okuyucu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kamera okuyucuyu kapat"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-700"
            data-testid="partner-close-qr-camera-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Camera Viewfinder Box */}
        <div className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-[#4F46E5] bg-slate-950 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${
              cameraState === 'active' ? 'opacity-100' : 'opacity-25'
            }`}
          />

          {/* Laser Target Reticle */}
          <div className="pointer-events-none absolute inset-6 flex flex-col items-center justify-between rounded-2xl border-2 border-dashed border-[#16CFD1]/85 p-3">
            <div className="flex w-full justify-between">
              <span className="h-4 w-4 border-l-4 border-t-4 border-[#16CFD1] rounded-tl" />
              <span className="h-4 w-4 border-r-4 border-t-4 border-[#16CFD1] rounded-tr" />
            </div>
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#16CFD1] to-transparent animate-pulse" />
            <div className="flex w-full justify-between">
              <span className="h-4 w-4 border-b-4 border-l-4 border-[#16CFD1] rounded-bl" />
              <span className="h-4 w-4 border-b-4 border-r-4 border-[#16CFD1] rounded-br" />
            </div>
          </div>

          {cameraState !== 'active' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center text-white space-y-2">
              <ScanLine className="h-10 w-10 text-[#16CFD1] animate-pulse" />
              <p className="text-xs font-bold leading-relaxed max-w-xs">{statusText}</p>
            </div>
          )}

          <span className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900/90 px-3 py-1.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{statusText}</span>
          </span>
        </div>

        {/* Instant Camera Scan Triggers for Waiting Customers */}
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" />
            Bekleyen Randevu QR Kodunu Anında Okut
          </p>
          <div className={`grid gap-2 ${healthTourismQrEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {healthTourismQrEnabled && (
              <button
                type="button"
                onClick={() => {
                  onQuickCameraScan('ht');
                  onClose();
                }}
                className="min-h-11 rounded-xl bg-[#4F46E5] px-2.5 py-2 text-[11px] font-black text-white flex items-center justify-center gap-1"
              >
                <QrCode className="h-3.5 w-3.5 shrink-0" />
                <span>VIP HT QR Okut</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onQuickCameraScan('package');
                onClose();
              }}
              className="min-h-11 rounded-xl border-2 border-[#4F46E5]/40 bg-[#EEF2FF] px-2.5 py-2 text-[11px] font-black text-[#4338CA] flex items-center justify-center gap-1"
            >
              <QrCode className="h-3.5 w-3.5 shrink-0" />
              <span>Paket QR Okut</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onQuickCameraScan('standard');
                onClose();
              }}
              className="min-h-11 rounded-xl border-2 border-slate-300 dark:border-slate-700 px-2.5 py-2 text-[11px] font-black flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>Randevu QR Okut</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerQrCameraScannerModal;
