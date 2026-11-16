import React, { useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';

export interface AIStyleSuggestion {
  id: string;
  vertical: 'hair_beauty' | 'dental_smile' | 'aesthetic_skin' | 'barber_grooming';
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  recommendedDurationMinutes: number;
  confidenceScore: number;
  executionMode: 'LOCAL_DETERMINISTIC_SANDBOX' | 'EXTERNAL_HOLD_PAID_AI_DISABLED';
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
        descriptionTr: 'Yüz hatlarını yumuşatan sıcak karamel geçişler ve hacimli uçlar.',
        descriptionEn: 'Warm caramel transitions and voluminous layered ends tailored to face shape.',
        recommendedDurationMinutes: 120,
        confidenceScore: 0.94,
        executionMode: 'LOCAL_DETERMINISTIC_SANDBOX',
      },
      {
        id: 'style-keratin-glass',
        vertical: 'hair_beauty',
        titleTr: 'Glass Hair Keratin Bakım & Simetrik Kesim',
        titleEn: 'Glass Hair Keratin Care & Symmetric Cut',
        descriptionTr: 'Yüksek parlaklık ve elektriklenme karşıtı pürüzsüz görünüm.',
        descriptionEn: 'High-gloss anti-frizz finish with sleek symmetric edges.',
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
        descriptionTr: 'Dudak hattı ile uyumlu B1/OM3 doğal ton zirkonyum/lamina simülasyonu (Hekim muayenesi gerektirir).',
        descriptionEn: 'Lip-line aligned natural shade simulation (Requires dentist clinical exam).',
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
        descriptionTr: 'Cilt tonu eşitsizliği için 4 aşamalı medikal cilt bakımı önerisi.',
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
        descriptionTr: 'Çene hattını belirginleştiren kademeli geçiş ve sıcak havlu bakımı.',
        descriptionEn: 'Jawline-enhancing tapered fade with hot towel beard sculpting.',
        recommendedDurationMinutes: 45,
        confidenceScore: 0.95,
        executionMode: 'LOCAL_DETERMINISTIC_SANDBOX',
      },
    ],
  };

  const suggestions = catalog[input.vertical] || catalog.hair_beauty;
  const primary = suggestions[0];
  const goalNote = input.styleGoalText?.trim() ? ` | Müşteri Notu: ${input.styleGoalText.trim()}` : '';

  return {
    success: true,
    paidApiCalled: false,
    costIncurredMinorUnits: 0,
    suggestions,
    attachedAppointmentNote: `[AI Stil Önerisi: ${primary.titleTr} (${primary.recommendedDurationMinutes} dk)]${goalNote}`,
  };
}

export interface MobileAIStyleVisualizerPageProps {
  tenantId: string;
  language?: 'tr' | 'en';
  onAttachStyleToBooking?: (note: string, suggestion: AIStyleSuggestion) => void;
}

export const MobileAIStyleVisualizerPage: React.FC<MobileAIStyleVisualizerPageProps> = ({
  tenantId,
  language = 'tr',
  onAttachStyleToBooking,
}) => {
  const [vertical, setVertical] = useState<AIStyleSuggestion['vertical']>('hair_beauty');
  const [goalText, setGoalText] = useState('');
  const [result, setResult] = useState<MobileAIStyleAssessmentResult | null>(null);
  const [attachedId, setAttachedId] = useState<string | null>(null);

  const handleCaptureAndAnalyze = () => {
    const simulatedPhoto =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = evaluateMobileAIStyleRecommendation({
      tenantId,
      vertical,
      userActionTrigger: 'user_tap_mobile_ai_camera_button',
      photoDataUrl: simulatedPhoto,
      styleGoalText: goalText,
    });
    setResult(res);
  };

  return (
    <div className="space-y-4" data-testid="mobile-ai-style-visualizer-page">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/80 border border-indigo-500/30 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            {language === 'tr' ? 'AI Stil & Görünüm Asistanı' : 'AI Style & Look Advisor'}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            SANDBOX • 0 TL
          </span>
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'tr'
            ? 'Kamerayla Analiz Et & Randevuna Stil Notu Ekle'
            : 'Analyze with Camera & Attach to Your Booking'}
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          {language === 'tr'
            ? 'Kuaför, berber, cilt bakımı veya diş gülüş tasarımı için ön simülasyon oluşturun.'
            : 'Generate a preview recommendation for hair, grooming, skin care, or smile design.'}
        </p>

        {/* Vertical Selector */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {(
            [
              { id: 'hair_beauty', tr: 'Saç & Güzellik', en: 'Hair & Beauty' },
              { id: 'barber_grooming', tr: 'Berber & Sakal', en: 'Barber & Beard' },
              { id: 'aesthetic_skin', tr: 'Medikal Cilt', en: 'Aesthetic Skin' },
              { id: 'dental_smile', tr: 'Gülüş Tasarımı', en: 'Smile Design' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setVertical(item.id)}
              style={{ minHeight: '44px' }}
              className={`rounded-xl px-3 py-2 text-xs font-semibold border text-left transition ${
                vertical === item.id
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-900/70 text-slate-300 border-slate-800'
              }`}
              data-testid={`ai-vertical-${item.id}`}
            >
              {language === 'tr' ? item.tr : item.en}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          placeholder={
            language === 'tr'
              ? 'Örn: Yüzüme uygun kolay kullanılan kesim...'
              : 'E.g. Low-maintenance style for my face shape...'
          }
          className="mt-3 w-full rounded-xl bg-slate-900/90 border border-slate-700 px-3 py-2.5 text-xs text-white placeholder-slate-500"
        />

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            onClick={handleCaptureAndAnalyze}
            style={{ minHeight: '46px' }}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2.5 shadow-md"
            data-testid="ai-capture-camera-btn"
          >
            <Camera className="w-4 h-4" />
            {language === 'tr' ? 'Kamerayla Çek' : 'Take Photo'}
          </button>
          <button
            type="button"
            onClick={handleCaptureAndAnalyze}
            style={{ minHeight: '46px' }}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3 py-2.5 border border-slate-700"
            data-testid="ai-pick-gallery-btn"
          >
            <ImagePlus className="w-4 h-4" />
            {language === 'tr' ? 'Galeriden Seç' : 'From Gallery'}
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
                className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-white">
                    {language === 'tr' ? sug.titleTr : sug.titleEn}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                    %{Math.round(sug.confidenceScore * 100)} Uyum
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {language === 'tr' ? sug.descriptionTr : sug.descriptionEn}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    ⏱️ ~{sug.recommendedDurationMinutes} dk
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedId(sug.id);
                      onAttachStyleToBooking?.(result.attachedAppointmentNote, sug);
                    }}
                    style={{ minHeight: '40px' }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isAttached
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                    data-testid={`attach-style-btn-${sug.id}`}
                  >
                    {isAttached ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {language === 'tr' ? 'Randevuya Eklendi' : 'Attached'}
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        {language === 'tr' ? 'Randevu Notuna Ekle' : 'Attach to Booking'}
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
