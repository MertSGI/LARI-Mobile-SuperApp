import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Car,
  ChevronRight,
  Compass,
  Flame,
  Plane,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import {
  MobilePersonaType,
  MobileShellMode,
} from '../../services/mobile/mobileShellPolicyService';

export interface StoryHighlightItem {
  id: string;
  badgeTr: string;
  shortLabelTr: string;
  ringType: 'flash' | 'brand' | 'ai' | 'ht' | 'partner';
  slotTimeBadge?: string;
  titleTr: string;
  subtitleTr: string;
  highlights: string[];
  ctaLabelTr: string;
  targetPersona?: MobilePersonaType;
  targetTabId?: string;
  targetMode?: MobileShellMode;
  targetVertical?: string;
}

export const MOBILE_STORY_HIGHLIGHTS: StoryHighlightItem[] = [
  {
    id: 'story-flash-nisantasi',
    badgeTr: 'Son Dakika • 15:30',
    shortLabelTr: '15:30 Nişantaşı',
    ringType: 'flash',
    slotTimeBadge: '15:30',
    titleTr: 'Atelier Nişantaşı — Bugün 15:30 Boş Koltuk',
    subtitleTr:
      'İptal sonrası açılan son dakika koltuğunu birkaç saniyede yakalayın.',
    highlights: [
      'Soft Balayage & Bakım • 120 dk',
      'İsteğe bağlı ücretsiz baristasız/kahve tercihi',
      'Tek dokunuşla QR Pass cüzdana eklenir',
    ],
    ctaLabelTr: 'Keşfet & Koltuğu Kap',
    targetMode: 'b2c_customer',
    targetPersona: 'salon_customer',
    targetTabId: 'explore',
  },
  {
    id: 'story-flash-maslak-auto',
    badgeTr: 'Oto Servis • 14:30',
    shortLabelTr: '14:30 Maslak Oto',
    ringType: 'flash',
    slotTimeBadge: '14:30',
    titleTr: 'Maslak Auto Studio — Periyodik Bakım & Detailing',
    subtitleTr:
      'LARİ yalnızca salonlar için değil; oto bakım, servis, ekspertiz ve detailing randevuları da burada.',
    highlights: [
      'Bilgisayarlı Arıza Tespiti & Hızlı Lift Randevusu',
      'Google Haritalar konum & yol tarifi entegre',
      'Şeffaf fiyat ve tahmini işlem süresi',
    ],
    ctaLabelTr: 'Oto Servisleri Gör',
    targetMode: 'b2c_customer',
    targetPersona: 'salon_customer',
    targetTabId: 'explore',
    targetVertical: 'auto_service',
  },
  {
    id: 'story-flash-kadikoy',
    badgeTr: 'Son Dakika • 14:00',
    shortLabelTr: '14:00 Kadıköy',
    ringType: 'flash',
    slotTimeBadge: '14:00',
    titleTr: 'LARİ Dent Kadıköy — Dijital Gülüş Muayenesi',
    subtitleTr:
      'Bugün saat 14:00 için 1 muayene koltuğu açık.',
    highlights: [
      '3D Gülüş Analizi & OM1 / B1 Simülasyon',
      'Google Doğrulanmış Klinik Profili',
      'Şube izole dijital hasta pasaportu',
    ],
    ctaLabelTr: 'Kliniği İncele',
    targetMode: 'b2c_customer',
    targetPersona: 'salon_customer',
    targetTabId: 'explore',
    targetVertical: 'dental_clinic',
  },
  {
    id: 'story-ai-camera',
    badgeTr: 'AI Stüdyo',
    shortLabelTr: 'AI Önizleme',
    ringType: 'ai',
    titleTr: 'Kameranı Aç & Önce/Sonra Sürgüsüyle Dene',
    subtitleTr:
      'Saç rengi, gülüş tonu veya cilt protokolünü kaydırılabilir görsel stüdyoda karşılaştır.',
    highlights: [
      'Gerçek fotoğraf veya stüdyo portresiyle anlık önizleme',
      'Seçilen renk kodunu tek dokunuşla randevuya ekleme',
      'Sıfır gizli ücret (0 TL Sandbox)',
    ],
    ctaLabelTr: 'AI Stüdyoyu Başlat',
    targetMode: 'b2c_customer',
    targetPersona: 'salon_customer',
    targetTabId: 'ai_style',
  },
  {
    id: 'story-ht-vip',
    badgeTr: 'Sağlık VIP',
    shortLabelTr: 'Sağlık Turizmi',
    ringType: 'ht',
    titleTr: 'Havalimanı Transferden Post-Op Takibe VIP Asistan',
    subtitleTr:
      'Çok dilli/çok dövizli paket teklifi, seyahat takvimi ve hekim fotoğraf kontrolü.',
    highlights: [
      '7 Adımlı canlı seyahat & klinik takvimi',
      'Pre-Op hazırlık ve 1/3/7/30. gün doktor kontrolü',
      'KVKK & GDPR uyumlu pasaport gizliliği',
    ],
    ctaLabelTr: 'Sağlık Konsiyerjine Geç',
    targetMode: 'b2c_customer',
    targetPersona: 'ht_patient',
    targetTabId: 'ht_concierge',
  },
];

function renderStoryAvatarIcon(item: StoryHighlightItem) {
  if (item.targetVertical === 'auto_service') {
    return <Car className="w-6 h-6 text-slate-800" />;
  }
  switch (item.ringType) {
    case 'flash':
      return <Flame className="w-6 h-6 text-[#4F46E5]" />;
    case 'ai':
      return <Camera className="w-6 h-6 text-[#4F46E5]" />;
    case 'ht':
      return <Plane className="w-6 h-6 text-emerald-600" />;
    case 'partner':
      return <Store className="w-6 h-6 text-slate-800" />;
    default:
      return <Compass className="w-6 h-6 text-[#4F46E5]" />;
  }
}

export interface MobileStoryOnboardingProps {
  onNavigateExperience: (opts: {
    mode?: MobileShellMode;
    persona?: MobilePersonaType;
    tabId?: string;
    verticalFilter?: string;
  }) => void;
  defaultOpenFullModal?: boolean;
}

export const MobileStoryOnboarding: React.FC<MobileStoryOnboardingProps> = ({
  onNavigateExperience,
  defaultOpenFullModal = false,
}) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(
    defaultOpenFullModal ? 0 : null
  );
  const [stripVisible, setStripVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const delta = y - lastScrollY.current;
      if (y <= 32) {
        setStripVisible(true);
      } else if (delta > 12) {
        setStripVisible(false);
      } else if (delta < -6) {
        setStripVisible(true);
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeStory =
    activeStoryIndex !== null ? MOBILE_STORY_HIGHLIGHTS[activeStoryIndex] : null;

  const handleTriggerStoryCta = (story: StoryHighlightItem) => {
    onNavigateExperience({
      mode: story.targetMode,
      persona: story.targetPersona,
      tabId: story.targetTabId,
      verticalFilter: story.targetVertical,
    });
    setActiveStoryIndex(null);
  };

  return (
    <>
      {/* Instagram-Style Circular Story & Son Dakika Ring Strip */}
      <div
        className={`w-full overflow-x-auto no-scrollbar bg-white border-b-2 border-slate-200 px-3 transition-all duration-300 ${
          stripVisible
            ? 'max-h-32 py-3 opacity-100'
            : 'max-h-0 py-0 opacity-0 overflow-hidden border-b-0 pointer-events-none'
        }`}
        data-testid="mobile-story-reels-strip"
      >
        <div className="max-w-lg mx-auto flex items-start gap-3.5">
          {MOBILE_STORY_HIGHLIGHTS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveStoryIndex(idx)}
              className="flex flex-col items-center gap-1.5 w-[74px] shrink-0 active:scale-95 transition-transform"
              data-testid={`story-bubble-${item.id}`}
            >
              <div className="relative">
                <div
                  className={`p-[3px] rounded-full ${
                    item.ringType === 'flash'
                      ? 'bg-gradient-to-tr from-[#4F46E5] via-rose-500 to-amber-500'
                      : 'bg-gradient-to-tr from-[#4F46E5] to-cyan-500'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-white p-0.5 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#F8F9FB] border border-slate-200 flex items-center justify-center">
                      {renderStoryAvatarIcon(item)}
                    </div>
                  </div>
                </div>
                {item.slotTimeBadge && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#4F46E5] text-white text-[10px] font-black leading-none border-2 border-white shadow-xs">
                    {item.slotTimeBadge}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-800 text-center leading-tight line-clamp-1 w-full">
                {item.shortLabelTr}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Full-Screen Story Modal */}
      {activeStory && activeStoryIndex !== null && (
        <div
          className="fixed inset-0 z-[90] bg-[#F3F5F9] flex flex-col justify-between p-4 select-none"
          data-testid="mobile-story-fullscreen-modal"
        >
          <div className="max-w-lg w-full mx-auto space-y-3 pt-2">
            <div className="grid grid-cols-5 gap-1.5">
              {MOBILE_STORY_HIGHLIGHTS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStoryIndex(i)}
                  className="h-1.5 rounded-full overflow-hidden bg-slate-300"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      i <= activeStoryIndex ? 'w-full bg-[#4F46E5]' : 'w-0'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-[#4338CA] border-2 border-[#4F46E5]/30">
                <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                {activeStory.badgeTr}
              </span>
              <button
                type="button"
                onClick={() => setActiveStoryIndex(null)}
                className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-800"
                data-testid="close-story-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-lg w-full mx-auto my-auto rounded-3xl bg-white border-2 border-slate-300 p-6 shadow-xl space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#4F46E5]">
                LARİ HİKAYELER ({activeStoryIndex + 1}/{MOBILE_STORY_HIGHLIGHTS.length})
              </span>
              <h2 className="text-xl font-black text-slate-900 leading-snug">
                {activeStory.titleTr}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {activeStory.subtitleTr}
              </p>
            </div>

            <div className="space-y-2.5 bg-[#F8F9FB] rounded-2xl p-4 border-2 border-slate-200">
              {activeStory.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-slate-800">
                  <span className="w-6 h-6 rounded-full bg-[#EEF2FF] text-[#4338CA] font-black flex items-center justify-center shrink-0 text-xs border border-indigo-200">
                    {i + 1}
                  </span>
                  <span className="font-semibold leading-snug">{h}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleTriggerStoryCta(activeStory)}
                style={{ minHeight: '50px' }}
                className="flex-1 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-sm px-4 py-3 flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
                data-testid="story-cta-action-btn"
              >
                <span>{activeStory.ctaLabelTr}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              {activeStoryIndex < MOBILE_STORY_HIGHLIGHTS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStoryIndex(activeStoryIndex + 1)}
                  style={{ minHeight: '50px' }}
                  className="px-4 rounded-2xl bg-slate-100 text-slate-800 font-bold text-sm border-2 border-slate-300"
                >
                  Sonraki
                </button>
              )}
            </div>
          </div>

          <div className="max-w-lg w-full mx-auto pb-2 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Her sektörden işletme için hızlı randevu asistanı</span>
            <button
              type="button"
              onClick={() => setActiveStoryIndex(null)}
              className="text-[#4F46E5] font-black underline"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileStoryOnboarding;
