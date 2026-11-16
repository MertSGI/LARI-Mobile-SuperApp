import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Palette,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';

export interface AIStyleSuggestion {
  id: string;
  vertical:
    | 'hair_beauty'
    | 'dental_smile'
    | 'aesthetic_skin'
    | 'barber_grooming';
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  recommendedDurationMinutes: number;
  confidenceScore: number;
  executionMode:
    | 'LOCAL_DETERMINISTIC_SANDBOX'
    | 'EXTERNAL_HOLD_PAID_AI_DISABLED';
}

export interface MobileAIStyleAssessmentInput {
  tenantId: string;
  vertical: AIStyleSuggestion['vertical'];
  userActionTrigger: string;
  photoDataUrl?: string;
  styleGoalText?: string;
  allowPaidExternalApi?: boolean;
}

export interface MobileAIStyleAssessmentResult {
  success: boolean;
  reasonCode?:
    | 'CONTEXTUAL_TRIGGER_REQUIRED'
    | 'INVALID_TENANT'
    | 'PAID_EXTERNAL_AI_DISABLED'
    | 'PHOTO_REQUIRED';
  paidApiCalled: boolean;
  costIncurredMinorUnits: number;
  suggestions: AIStyleSuggestion[];
  attachedAppointmentNote: string;
}

/**
 * Zero-cost (0 TL), fail-closed AI Style & Treatment Visualizer engine for mobile.
 * Never invokes paid external LLM/vision APIs when PAID_FALLBACK=DISABLED.
 */
export function evaluateMobileAIStyleRecommendation(
  input: MobileAIStyleAssessmentInput
): MobileAIStyleAssessmentResult {
  if (!input.tenantId || !input.tenantId.trim()) {
    return {
      success: false,
      reasonCode: 'INVALID_TENANT',
      paidApiCalled: false,
      costIncurredMinorUnits: 0,
      suggestions: [],
      attachedAppointmentNote: '',
    };
  }

  if (!input.userActionTrigger || !input.userActionTrigger.trim()) {
    return {
      success: false,
      reasonCode: 'CONTEXTUAL_TRIGGER_REQUIRED',
      paidApiCalled: false,
      costIncurredMinorUnits: 0,
      suggestions: [],
      attachedAppointmentNote: '',
    };
  }

  if (input.allowPaidExternalApi === true) {
    return {
      success: false,
      reasonCode: 'PAID_EXTERNAL_AI_DISABLED',
      paidApiCalled: false,
      costIncurredMinorUnits: 0,
      suggestions: [],
      attachedAppointmentNote: '',
    };
  }

  if (!input.photoDataUrl || !input.photoDataUrl.startsWith('data:image/')) {
    return {
      success: false,
      reasonCode: 'PHOTO_REQUIRED',
      paidApiCalled: false,
      costIncurredMinorUnits: 0,
      suggestions: [],
      attachedAppointmentNote: '',
    };
  }

  const catalog: Record<AIStyleSuggestion['vertical'], AIStyleSuggestion[]> = {
    hair_beauty: [
      {
        id: 'style-balayage-soft',
        vertical: 'hair_beauty',
        titleTr: 'Doğal Işıltılı Soft Balayage & Katlı Kesim',
        titleEn: 'Soft Natural Balayage & Layered Cut',
        descriptionTr:
          'Yüz hatlarını yumuşatan sıcak karamel geçişler ve hacimli uçlar.',
        descriptionEn:
          'Warm caramel transitions and voluminous layered ends tailored to face shape.',
        recommendedDurationMinutes: 120,
        confidenceScore: 0.94,
        executionMode: 'LOCAL_DETERMINISTIC_SANDBOX',
      },
      {
        id: 'style-keratin-glass',
        vertical: 'hair_beauty',
        titleTr: 'Glass Hair Keratin Bakım & Simetrik Kesim',
        titleEn: 'Glass Hair Keratin Care & Symmetric Cut',
        descriptionTr:
          'Yüksek parlaklık ve elektriklenme karşıtı pürüzsüz görünüm.',
        descriptionEn:
          'High-gloss anti-frizz finish with sleek symmetric edges.',
        recommendedDurationMinutes: 90,
        confidenceScore: 0.89,
        executionMode: 'LOCAL_DETERMINISTIC_SANDBOX',
      },
    ],
    dental_smile: [
      {
        id: 'style-hollywood-natural',
        vertical: 'dental_smile',
        titleTr: 'Doğal Oranlı Dijital Gülüş Tasarımı (Ön Önizleme)',
        titleEn: 'Natural Ratio Digital Smile Design (Preview)',
        descriptionTr:
          'Dudak hattı ile uyumlu B1/OM3 doğal ton zirkonyum/lamina simülasyonu (Hekim muayenesi gerektirir).',
        descriptionEn:
          'Lip-line aligned natural shade simulation (Requires dentist clinical exam).',
        recommendedDurationMinutes: 60,
        confidenceScore: 0.92,
        executionMode: 'LOCAL_DETERMINISTIC_SANDBOX',
      },
    ],
    aesthetic_skin: [
      {
        id: 'style-hydrafacial-glow',
        vertical: 'aesthetic_skin',
        titleTr: 'Nem Bariyeri & Gözenek Yenileme Protokolü',
        titleEn: 'Moisture Barrier & Pore Renewal Protocol',
        descriptionTr:
          'Cilt tonu eşitsizliği için 4 aşamalı medikal cilt bakımı önerisi.',
        descriptionEn: '4-step dermal hydration and tone balancing protocol.',
        recommendedDurationMinutes: 60,
        confidenceScore: 0.91,
        executionMode: 'LOCAL_DETERMINISTIC_SANDBOX',
      },
    ],
    barber_grooming: [
      {
        id: 'style-skin-fade-beard',
        vertical: 'barber_grooming',
        titleTr: 'Mid Skin Fade & Keskin Sakal Kontürü',
        titleEn: 'Mid Skin Fade & Sharp Beard Contour',
        descriptionTr:
          'Çene hattını belirginleştiren kademeli geçiş ve sıcak havlu bakımı.',
        descriptionEn:
          'Jawline-enhancing tapered fade with hot towel beard sculpting.',
        recommendedDurationMinutes: 45,
        confidenceScore: 0.95,
        executionMode: 'LOCAL_DETERMINISTIC_SANDBOX',
      },
    ],
  };

  const suggestions = catalog[input.vertical] || catalog.hair_beauty;
  const primary = suggestions[0];
  const goalNote = input.styleGoalText?.trim()
    ? ` | Müşteri Notu: ${input.styleGoalText.trim()}`
    : '';

  return {
    success: true,
    paidApiCalled: false,
    costIncurredMinorUnits: 0,
    suggestions,
    attachedAppointmentNote: `[AI Stil Önerisi: ${primary.titleTr} (${primary.recommendedDurationMinutes} dk)]${goalNote}`,
  };
}

const SWATCH_PALETTES: Record<
  AIStyleSuggestion['vertical'],
  Array<{ code: string; label: string; colorClass: string; afterGradient: string }>
> = {
  hair_beauty: [
    {
      code: '8.34',
      label: 'Sıcak Karamel Balayage',
      colorClass: 'bg-amber-500',
      afterGradient: 'from-amber-500/50 via-yellow-600/30 to-slate-900',
    },
    {
      code: '9.12',
      label: 'Soğuk Küllü Bej',
      colorClass: 'bg-stone-300',
      afterGradient: 'from-stone-300/40 via-indigo-400/25 to-slate-900',
    },
    {
      code: '6.77',
      label: 'Çikolata Kahve Işıltı',
      colorClass: 'bg-amber-800',
      afterGradient: 'from-amber-800/55 via-rose-900/30 to-slate-900',
    },
  ],
  dental_smile: [
    {
      code: 'OM1',
      label: 'OM1 Hollywood Beyaz',
      colorClass: 'bg-white',
      afterGradient: 'from-cyan-300/45 via-white/30 to-slate-900',
    },
    {
      code: 'B1',
      label: 'B1 Doğal Mine Beyazı',
      colorClass: 'bg-amber-50',
      afterGradient: 'from-emerald-300/35 via-amber-100/25 to-slate-900',
    },
  ],
  aesthetic_skin: [
    {
      code: 'GLOW-4X',
      label: 'Glass Skin Nem & Işıltı',
      colorClass: 'bg-pink-300',
      afterGradient: 'from-pink-400/45 via-rose-500/25 to-slate-900',
    },
    {
      code: 'PORE-0',
      label: 'Mat & Sıkı Gözenek',
      colorClass: 'bg-violet-400',
      afterGradient: 'from-violet-500/45 via-indigo-500/25 to-slate-900',
    },
  ],
  barber_grooming: [
    {
      code: 'FADE-MID',
      label: 'Mid Skin Fade & Kontür',
      colorClass: 'bg-slate-400',
      afterGradient: 'from-blue-500/45 via-slate-600/30 to-slate-900',
    },
    {
      code: 'CROP-TEX',
      label: 'Textured Crop & Sakal',
      colorClass: 'bg-amber-600',
      afterGradient: 'from-amber-500/45 via-slate-700/30 to-slate-900',
    },
  ],
};

export interface MobileAIStyleVisualizerPageProps {
  tenantId: string;
  language?: 'tr' | 'en';
  onAttachStyleToBooking?: (
    note: string,
    suggestion: AIStyleSuggestion
  ) => void;
}

export const MobileAIStyleVisualizerPage: React.FC<
  MobileAIStyleVisualizerPageProps
> = ({ tenantId, language = 'tr', onAttachStyleToBooking }) => {
  const [vertical, setVertical] =
    useState<AIStyleSuggestion['vertical']>('hair_beauty');
  const [goalText, setGoalText] = useState('');
  const [sliderPosition, setSliderPosition] = useState<number>(58);
  const [selectedSwatchIdx, setSelectedSwatchIdx] = useState<number>(0);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MobileAIStyleAssessmentResult | null>(
    null
  );
  const [attachedId, setAttachedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSwatches = SWATCH_PALETTES[vertical] || SWATCH_PALETTES.hair_beauty;
  const activeSwatch = activeSwatches[selectedSwatchIdx] || activeSwatches[0];

  const handleCaptureAndAnalyze = (customDataUrl?: string) => {
    const simulatedPhoto =
      customDataUrl ||
      uploadedPhotoUrl ||
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = evaluateMobileAIStyleRecommendation({
      tenantId,
      vertical,
      userActionTrigger: 'user_tap_mobile_ai_camera_button',
      photoDataUrl: simulatedPhoto,
      styleGoalText: `${activeSwatch.code} ${activeSwatch.label}${goalText ? ` - ${goalText}` : ''}`,
    });
    setResult(res);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl.startsWith('data:image/')) {
        setUploadedPhotoUrl(dataUrl);
        handleCaptureAndAnalyze(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4" data-testid="mobile-ai-style-visualizer-page">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-950 border border-indigo-500/30 p-4 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            {language === 'tr'
              ? 'Canlı Kamera AI Stil & Gülüş Stüdyosu'
              : 'Live AI Style & Smile Studio'}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            SANDBOX • 0 TL
          </span>
        </div>

        {/* Vertical Selector */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'hair_beauty', tr: 'Saç & Balayage', en: 'Hair & Beauty' },
              { id: 'dental_smile', tr: 'Dijital Gülüş (OM1/B1)', en: 'Smile Design' },
              { id: 'aesthetic_skin', tr: 'Medikal Cilt Glow', en: 'Aesthetic Skin' },
              { id: 'barber_grooming', tr: 'Berber & Sakal', en: 'Barber & Beard' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setVertical(item.id);
                setSelectedSwatchIdx(0);
              }}
              style={{ minHeight: '42px' }}
              className={`rounded-xl px-3 py-2 text-xs font-bold border text-left transition ${
                vertical === item.id
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800'
              }`}
              data-testid={`ai-vertical-${item.id}`}
            >
              {language === 'tr' ? item.tr : item.en}
            </button>
          ))}
        </div>

        {/* INTERACTIVE CAMERA VIEWFINDER + BEFORE/AFTER COMPARISON SLIDER */}
        <div
          className="relative h-56 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 select-none"
          data-testid="ai-before-after-viewfinder"
        >
          {/* BEFORE LAYER (Full Width Background) */}
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="w-28 h-36 rounded-full border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-center px-2">
              <span className="text-[10px] font-bold text-slate-400">
                ÖNCE (MEVCUT)
              </span>
              <span className="text-[9px] text-slate-500 mt-1">
                Doğal Baz Görünüm
              </span>
            </div>
          </div>

          {/* AFTER LAYER (Clipped by sliderPosition %) */}
          <div
            className={`absolute inset-y-0 left-0 overflow-hidden bg-gradient-to-br ${activeSwatch.afterGradient}`}
            style={{ width: `${sliderPosition}%` }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className="w-28 h-36 rounded-full border-2 border-white/80 shadow-[0_0_25px_rgba(255,255,255,0.3)] flex flex-col items-center justify-center text-center px-2 bg-white/5 backdrop-blur-xs">
                <span className="text-[10px] font-black text-white">
                  SONRA ({activeSwatch.code})
                </span>
                <span className="text-[10px] font-bold text-amber-200 mt-1">
                  {activeSwatch.label}
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Divider Line */}
          <div
            className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="w-7 h-7 -ml-3.5 top-1/2 -translate-y-1/2 relative rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Top Viewfinder Labels */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-bold pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-indigo-600/90 text-white">
              AI SONRA: %{sliderPosition}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900/90 text-slate-300">
              ÖNCE
            </span>
          </div>

          {/* Bottom Range Slider Input */}
          <div className="absolute bottom-2.5 left-3 right-3 bg-slate-950/80 backdrop-blur-md rounded-xl px-3 py-1.5 border border-slate-800 flex items-center gap-2">
            <span className="text-[10px] text-slate-300 font-semibold shrink-0">
              Kaydır:
            </span>
            <input
              type="range"
              min={10}
              max={90}
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
              data-testid="ai-comparison-slider"
            />
          </div>
        </div>

        {/* Shade / Tone Swatch Selector */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            Canlı Renk / Ton Kartelası Seç:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {activeSwatches.map((sw, idx) => (
              <button
                key={sw.code}
                type="button"
                onClick={() => setSelectedSwatchIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-2 whitespace-nowrap transition ${
                  selectedSwatchIdx === idx
                    ? 'bg-white text-slate-950 border-white shadow'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
                data-testid={`ai-swatch-${sw.code}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border border-black/20 ${sw.colorClass}`} />
                <span>
                  {sw.code} • {sw.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          placeholder={
            language === 'tr'
              ? 'Uzmana özel stil notun (Örn: Yüzüme uygun yumuşak geçiş)...'
              : 'E.g. Low-maintenance style for my face shape...'
          }
          className="w-full rounded-xl bg-slate-900/90 border border-slate-700 px-3 py-2.5 text-xs text-white placeholder-slate-500"
        />

        {/* Hidden real camera/gallery file input for mobile phones */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleCaptureAndAnalyze()}
            style={{ minHeight: '46px' }}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-3 py-2.5 shadow-md"
            data-testid="ai-capture-camera-btn"
          >
            <Camera className="w-4 h-4" />
            {language === 'tr' ? 'Kamerayla Analiz Et' : 'Analyze Now'}
          </button>
          <button
            type="button"
            onClick={() => {
              handleCaptureAndAnalyze();
              fileInputRef.current?.click();
            }}
            style={{ minHeight: '46px' }}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3 py-2.5 border border-slate-700"
            data-testid="ai-pick-gallery-btn"
          >
            <ImagePlus className="w-4 h-4" />
            {language === 'tr' ? 'Fotoğraf / Galeri Seç' : 'From Gallery'}
          </button>
        </div>
      </div>

      {/* Medical / Preview Disclaimer (Apple Guideline 1.4.1 Compliance) */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2.5 text-[11px] text-amber-200">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          {language === 'tr'
            ? 'Bilgilendirme: AI önerileri yalnızca görsel önizleme amaçlıdır; tıbbi teşhis veya kesin tedavi taahhüdü yerine geçmez.'
            : 'Notice: AI recommendations are for visual preview only and do not constitute medical diagnosis or treatment advice.'}
        </span>
      </div>

      {/* Suggestions Output */}
      {result?.success && (
        <div className="space-y-2.5" data-testid="ai-style-suggestions-list">
          {result.suggestions.map((sug) => {
            const isAttached = attachedId === sug.id;
            return (
              <div
                key={sug.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {language === 'tr' ? sug.titleTr : sug.titleEn}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'tr'
                        ? sug.descriptionTr
                        : sug.descriptionEn}
                    </p>
                    <p className="text-[11px] text-indigo-300 font-semibold mt-1">
                      Seçilen Kartela: {activeSwatch.code} ({activeSwatch.label})
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[11px] font-bold shrink-0">
                    %{Math.round(sug.confidenceScore * 100)} Uyum
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400">
                    Önerilen Süre:{' '}
                    <strong className="text-slate-200">
                      {sug.recommendedDurationMinutes} dk
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedId(sug.id);
                      onAttachStyleToBooking?.(
                        result.attachedAppointmentNote,
                        sug
                      );
                    }}
                    style={{ minHeight: '40px' }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isAttached
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                    data-testid={`attach-style-btn-${sug.id}`}
                  >
                    {isAttached ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Randevuya Eklendi
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        Randevuma Stil Notu Ekle
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MobileAIStyleVisualizerPage;
