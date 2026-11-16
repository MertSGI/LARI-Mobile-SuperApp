import React, { useState } from 'react';
import {
  Camera,
  ChevronRight,
  Compass,
  Crown,
  Flame,
  MapPin,
  Plane,
  Sparkles,
  Stethoscope,
  Wallet,
  X,
} from 'lucide-react';
import { MobilePersonaType, MobileShellMode } from '../../services/mobile/mobileShellPolicyService';

export interface StoryHighlightItem {
  id: string;
  badgeTr: string;
  titleTr: string;
  subtitleTr: string;
  gradient: string;
  ringColor: string;
  targetPersona?: MobilePersonaType;
  targetTabId?: string;
  targetMode?: MobileShellMode;
  highlights: string[];
  ctaLabelTr: string;
}

export const MOBILE_STORY_HIGHLIGHTS: StoryHighlightItem[] = [
  {
    id: 'story-flash-map',
    badgeTr: '⚡ Son Dakika & Harita',
    titleTr: 'Yakınındaki Boş Koltukları Canlı Haritada Yakala',
    subtitleTr:
      'Web formunda saat arama devri bitti. Harita üzerinden şu an müsait olan salon, berber ve klinikleri anlık Flash avantajıyla yakala.',
    gradient: 'from-blue-600 via-indigo-700 to-slate-950',
    ringColor: 'from-cyan-400 via-blue-500 to-indigo-500',
    targetMode: 'b2c_customer',
    targetPersona: 'salon_customer',
    targetTabId: 'explore',
    highlights: [
      'Canlı Radar Harita & Anlık Mesafe Hesabı',
      'Son 2 Saatte Boşalan Flash Koltuk Fırsatları',
      'Uzman Portfolyoları, Önce/Sonra Vitrini & Doğrulanmış Yorumlar',
    ],
    ctaLabelTr: 'Harita & Flash Saatleri Aç',
  },
  {
    id: 'story-vip-passport',
    badgeTr: '☕ VIP Ağırlama & Pasaport',
    titleTr: 'Salona Girmeden Kahveni Seç, Boya Formülünü Unutma',
    subtitleTr:
      'LARİ uygulaması kişisel güzellik ve bakım hafızandır. Randevu günü kahve ve sessiz seans tercihini önden ilet, geçmiş boya/bakım formüllerini pasaportunda sakla.',
    gradient: 'from-fuchsia-700 via-purple-800 to-slate-950',
    ringColor: 'from-pink-400 via-fuchsia-500 to-purple-500',
    targetMode: 'b2c_customer',
    targetPersona: 'salon_customer',
    targetTabId: 'wallet',
    highlights: [
      'Salona Varmadan İkram (Filtre Kahve/Matcha) & Sessiz Seans Seçimi',
      'Kişisel Güzellik Pasaportu: Dip/Uç Boya Formülü & Hekim Notu Arşivi',
      'Apple Wallet Tarzı 5’li Damga Kartı & Dijital Hediye Zarfı',
    ],
    ctaLabelTr: 'Cüzdan & Bakım Pasaportuna Git',
  },
  {
    id: 'story-ai-camera',
    badgeTr: '📸 Canlı AI Stüdyo',
    titleTr: 'Kameranı Aç, Önce/Sonra Sürgüsüyle Yeni Stilini Dene',
    subtitleTr:
      'Saç balayage tonlarını, dijital gülüş tasarımını (OM1/B1) veya cilt protokolünü canlı vizörde karşılaştır ve tek dokunuşla uzmanına referans olarak zımbala.',
    gradient: 'from-violet-700 via-indigo-900 to-slate-950',
    ringColor: 'from-amber-400 via-pink-500 to-violet-500',
    targetMode: 'b2c_customer',
    targetPersona: 'salon_customer',
    targetTabId: 'ai_style',
    highlights: [
      'Canlı Kamera Vizörü & Yüz Hizalama Rehberi',
      'Parmağınla Kaydırılabilir Önce / Sonra (Before/After) Karşılaştırma',
      'Renk/Ton Kartelası & Randevuya Görsel Stil Notu Zımbalama',
    ],
    ctaLabelTr: 'AI Kamera Stüdyosunu Başlat',
  },
  {
    id: 'story-ht-vip',
    badgeTr: '✈️ VIP Sağlık Turizmi',
    titleTr: 'Havalimanı VIP Vito’dan Post-Op Doktor Takibine Cep Concierge',
    subtitleTr:
      'Uluslararası hastalar için uçuş inişi, şoför plaka kartı, 5* otel voucher’ı, operasyon öncesi geri sayım ve gün gün iyileşme fotoğrafı onayı tek ekranda.',
    gradient: 'from-emerald-700 via-teal-900 to-slate-950',
    ringColor: 'from-emerald-400 via-teal-400 to-cyan-500',
    targetMode: 'b2c_customer',
    targetPersona: 'ht_patient',
    targetTabId: 'ht_concierge',
    highlights: [
      '7 Adımlı Canlı Seyahat & Operasyon Zaman Tüneli',
      'Operasyon Öncesi Hazırlık & Açlık Geri Sayım Sayacı',
      '1. / 3. / 7. / 30. Gün Post-Op Fotoğraf Gönderimi & Hekim Onayı',
    ],
    ctaLabelTr: 'VIP Sağlık Concierge’i Aç',
  },
  {
    id: 'story-partner-studio',
    badgeTr: '💼 Partner Cep Stüdyo',
    titleTr: 'Uzman & Hekimler İçin Koltuk Başı Çizim Kanvası ve Hızlı POS',
    subtitleTr:
      'Müşteri koltuğa oturduğunda kahve tercihini ve geçmiş boya formülünü gör, fotoğraf üzerinde parmakla estetik/saç çizimi yap, 3 saniyede barkod okutup tahsilat al.',
    gradient: 'from-amber-700 via-orange-900 to-slate-950',
    ringColor: 'from-amber-300 via-orange-500 to-rose-500',
    targetMode: 'b2b_partner',
    targetPersona: 'salon_partner',
    targetTabId: 'partner_agenda',
    highlights: [
      'Koltuk Başı (Chairside) VIP Müşteri & Boya/İşlem Formül Kartı',
      'Dokunmatik Konsültasyon Kanvası: Fotoğraf Üzerinde Parmakla Çizim',
      'Kamera Barkod POS & Canlı Uzman Günlük Prim Halkası',
    ],
    ctaLabelTr: 'Partner Cep Stüdyosuna Geç',
  },
];

export interface MobileStoryOnboardingProps {
  onNavigateExperience: (opts: {
    mode?: MobileShellMode;
    persona?: MobilePersonaType;
    tabId?: string;
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

  const activeStory =
    activeStoryIndex !== null ? MOBILE_STORY_HIGHLIGHTS[activeStoryIndex] : null;

  const handleTriggerStoryCta = (story: StoryHighlightItem) => {
    onNavigateExperience({
      mode: story.targetMode,
      persona: story.targetPersona,
      tabId: story.targetTabId,
    });
    setActiveStoryIndex(null);
  };

  return (
    <>
      {/* Top Interactive Story Reels Strip (Always visible in native shell header area) */}
      <div
        className="w-full overflow-x-auto no-scrollbar py-2 px-3.5 bg-slate-950/90 border-b border-slate-900"
        data-testid="mobile-story-reels-strip"
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {MOBILE_STORY_HIGHLIGHTS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveStoryIndex(idx)}
              className="flex flex-col items-center gap-1 shrink-0 group active:scale-95 transition-transform"
              data-testid={`story-bubble-${item.id}`}
            >
              <div
                className={`p-0.5 rounded-2xl bg-gradient-to-tr ${item.ringColor} shadow-md`}
              >
                <div className="w-14 h-14 rounded-[14px] bg-slate-900 flex flex-col items-center justify-center px-1 text-center border border-slate-950">
                  <span className="text-base leading-none">
                    {item.badgeTr.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-bold text-slate-200 mt-1 leading-tight line-clamp-2">
                    {item.badgeTr.replace(/^[^\s]+\s/, '')}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Full-Screen Story Experience Modal */}
      {activeStory && activeStoryIndex !== null && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950 flex flex-col justify-between p-4 select-none"
          data-testid="mobile-story-fullscreen-modal"
        >
          {/* Story Progress Bars */}
          <div className="max-w-lg w-full mx-auto space-y-3 pt-2">
            <div className="grid grid-cols-5 gap-1.5">
              {MOBILE_STORY_HIGHLIGHTS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStoryIndex(i)}
                  className="h-1.5 rounded-full overflow-hidden bg-white/20"
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white backdrop-blur-md border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {activeStory.badgeTr}
              </span>
              <button
                type="button"
                onClick={() => setActiveStoryIndex(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                data-testid="close-story-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Story Main Visual Card */}
          <div
            className={`max-w-lg w-full mx-auto my-auto rounded-3xl bg-gradient-to-br ${activeStory.gradient} border border-white/15 p-6 shadow-2xl space-y-5`}
          >
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/70">
                LARİ UYGULAMAYA ÖZEL DENEYİM ({activeStoryIndex + 1}/
                {MOBILE_STORY_HIGHLIGHTS.length})
              </span>
              <h2 className="text-2xl font-black text-white leading-tight">
                {activeStory.titleTr}
              </h2>
              <p className="text-xs text-white/85 leading-relaxed">
                {activeStory.subtitleTr}
              </p>
            </div>

            <div className="space-y-2.5 bg-black/25 rounded-2xl p-4 border border-white/10">
              {activeStory.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-white">
                  <span className="w-5 h-5 rounded-full bg-white/20 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {i + 1}
                  </span>
                  <span className="font-medium leading-snug">{h}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleTriggerStoryCta(activeStory)}
                style={{ minHeight: '48px' }}
                className="flex-1 rounded-2xl bg-white text-slate-950 font-black text-xs px-4 py-3 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                data-testid="story-cta-action-btn"
              >
                <span>{activeStory.ctaLabelTr}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              {activeStoryIndex < MOBILE_STORY_HIGHLIGHTS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStoryIndex(activeStoryIndex + 1)}
                  style={{ minHeight: '48px' }}
                  className="px-4 rounded-2xl bg-white/15 text-white font-bold text-xs border border-white/20"
                >
                  Sonraki
                </button>
              )}
            </div>
          </div>

          {/* Quick Role Switcher Footer inside Story */}
          <div className="max-w-lg w-full mx-auto pb-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Web klonu değil, kişisel cep asistanın.</span>
            <button
              type="button"
              onClick={() => setActiveStoryIndex(null)}
              className="text-white font-bold underline"
            >
              Uygulamaya Geç
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileStoryOnboarding;
