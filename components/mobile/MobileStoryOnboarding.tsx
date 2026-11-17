import React, { useState } from 'react';
import { ChevronRight, Plus, Sparkles, X } from 'lucide-react';
import {
  MobilePersonaType,
  MobileShellMode,
} from '../../services/mobile/mobileShellPolicyService';
import { VENUE_VISUAL_CATALOG, AI_STUDIO_PORTRAIT_FALLBACK } from '../../services/mobile/mobileVisualAssets';
import { useMobileAppSession } from '../../contexts/MobileAppSessionContext';

export interface StoryHighlightItem {
  id: string;
  badgeTr: string;
  shortLabelTr: string;
  ringType: 'flash' | 'brand' | 'ai' | 'ht' | 'partner';
  isFirstDiscover?: boolean;
  photoUrl: string;
  fallbackPhotoUrl: string;
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
    ringType: 'brand',
    isFirstDiscover: true,
    photoUrl: VENUE_VISUAL_CATALOG['atelier-nisantasi'].coverPhotoUrl,
    fallbackPhotoUrl: VENUE_VISUAL_CATALOG['atelier-nisantasi'].fallbackSvgUrl,
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
    shortLabelTr: '14:30 Oto Servis',
    ringType: 'flash',
    photoUrl: VENUE_VISUAL_CATALOG['maslak-auto-studio'].coverPhotoUrl,
    fallbackPhotoUrl: VENUE_VISUAL_CATALOG['maslak-auto-studio'].fallbackSvgUrl,
    slotTimeBadge: '14:30',
    titleTr: 'Maslak Auto Studio — Periyodik Bakım & Detailing',
    subtitleTr:
      'Oto bakım, servis, ekspertiz ve seramik kaplama randevuları da tek dokunuşta.',
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
    shortLabelTr: '14:00 Diş Klinik',
    ringType: 'flash',
    photoUrl: VENUE_VISUAL_CATALOG['lari-dent-kadikoy'].coverPhotoUrl,
    fallbackPhotoUrl: VENUE_VISUAL_CATALOG['lari-dent-kadikoy'].fallbackSvgUrl,
    slotTimeBadge: '14:00',
    titleTr: 'LARİ Dent Kadıköy — Dijital Gülüş Muayenesi',
    subtitleTr: 'Bugün saat 14:00 için 1 muayene koltuğu açık.',
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
    photoUrl: VENUE_VISUAL_CATALOG['dr-selin-aesthetics-etiler'].coverPhotoUrl,
    fallbackPhotoUrl: AI_STUDIO_PORTRAIT_FALLBACK,
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
    shortLabelTr: 'Sağlık VIP',
    ringType: 'ht',
    photoUrl: VENUE_VISUAL_CATALOG['aura-holistic-spa-bebek'].coverPhotoUrl,
    fallbackPhotoUrl: VENUE_VISUAL_CATALOG['aura-holistic-spa-bebek'].fallbackSvgUrl,
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
  const { themeMode } = useMobileAppSession();
  const isDark = themeMode === 'dark';

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(
    defaultOpenFullModal ? 0 : null
  );

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
      {/* Instagram-Authentic Circular Photo Story Strip (Scrolls cleanly with zero layout jump!) */}
      <div
        className={`w-full overflow-x-auto no-scrollbar border-b-2 px-3 py-3 ${
          isDark
            ? 'bg-slate-950 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
        data-testid="mobile-story-reels-strip"
      >
        <div className="max-w-lg mx-auto flex items-start gap-3.5">
          {MOBILE_STORY_HIGHLIGHTS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveStoryIndex(idx)}
              className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 active:scale-95 transition-transform"
              data-testid={`story-bubble-${item.id}`}
            >
              <div className="relative">
                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#F59E0B] via-[#EC4899] to-[#4F46E5]">
                  <div
                    className={`w-16 h-16 rounded-full p-[2px] ${
                      isDark ? 'bg-slate-950' : 'bg-white'
                    }`}
                  >
                    <img
                      src={item.photoUrl}
                      alt={item.shortLabelTr}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== item.fallbackPhotoUrl) {
                          img.src = item.fallbackPhotoUrl;
                        }
                      }}
                      className="w-full h-full rounded-full object-cover bg-slate-200"
                    />
                  </div>
                </div>
                {item.isFirstDiscover ? (
                  <span className="w-5 h-5 rounded-full bg-[#4F46E5] text-white border-2 border-white dark:border-slate-950 absolute bottom-0 right-0 flex items-center justify-center shadow-xs">
                    <Plus className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : item.slotTimeBadge ? (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[#4F46E5] text-white text-[10px] font-black leading-none border-2 border-white dark:border-slate-950 shadow-xs">
                    {item.slotTimeBadge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-xs font-semibold text-center leading-tight line-clamp-1 w-full ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                {item.shortLabelTr}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Full-Screen Story Modal */}
      {activeStory && activeStoryIndex !== null && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/85 backdrop-blur-md flex flex-col justify-between p-4 select-none"
          data-testid="mobile-story-fullscreen-modal"
        >
          <div className="max-w-lg w-full mx-auto space-y-3 pt-2">
            <div className="grid grid-cols-5 gap-1.5">
              {MOBILE_STORY_HIGHLIGHTS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStoryIndex(i)}
                  className="h-1.5 rounded-full overflow-hidden bg-white/30"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      i <= activeStoryIndex ? 'w-full bg-white' : 'w-0'
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
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white"
                data-testid="close-story-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-lg w-full mx-auto my-auto rounded-3xl bg-white border-2 border-slate-300 overflow-hidden shadow-2xl">
            <div className="h-44 w-full relative bg-slate-200">
              <img
                src={activeStory.photoUrl}
                alt={activeStory.titleTr}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== activeStory.fallbackPhotoUrl) {
                    img.src = activeStory.fallbackPhotoUrl;
                  }
                }}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-900 leading-snug">
                  {activeStory.titleTr}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {activeStory.subtitleTr}
                </p>
              </div>

              <div className="space-y-2 bg-[#F8F9FB] rounded-2xl p-3.5 border-2 border-slate-200">
                {activeStory.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-800">
                    <span className="w-6 h-6 rounded-full bg-[#EEF2FF] text-[#4338CA] font-black flex items-center justify-center shrink-0 text-xs border border-indigo-200">
                      {i + 1}
                    </span>
                    <span className="font-semibold leading-snug">{h}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
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
          </div>

          <div className="max-w-lg w-full mx-auto pb-2 text-center text-xs text-white/75 font-semibold">
            Kapatmak için yukarıdaki X simgesine dokunun
          </div>
        </div>
      )}
    </>
  );
};

export default MobileStoryOnboarding;
