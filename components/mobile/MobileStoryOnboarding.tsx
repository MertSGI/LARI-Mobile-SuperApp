import React, { useState } from 'react';
import {
  Camera,
  ChevronRight,
  Crown,
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
  targetPersona?: MobilePersonaType;
  targetTabId?: string;
  targetMode?: MobileShellMode;
  highlights: string[];
  ctaLabelTr: string;
}

export const MOBILE_STORY_HIGHLIGHTS: StoryHighlightItem[] = [
  {
    id: 'story-flash-map',
    badgeTr: 'Son Dakika & Harita',
    titleTr: 'Yakınındaki Boş Koltukları Canlı Haritada Yakala',
    subtitleTr:
      'Web formunda saat arama devri bitti. Harita üzerinden şu an müsait olan salon, berber ve klinikleri anlık Flash avantajıyla yakala.',
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
    badgeTr: 'VIP Ağırlama & Pasaport',
    titleTr: 'Salona Girmeden Kahveni Seç, Boya Formülünü Unutma',
    subtitleTr:
      'LARİ uygulaması kişisel güzellik ve bakım hafızandır. Randevu günü kahve ve sessiz seans tercihini önden ilet, geçmiş boya/bakım formüllerini pasaportunda sakla.',
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
    badgeTr: 'Canlı AI Stüdyo',
    titleTr: 'Kameranı Aç, Önce/Sonra Sürgüsüyle Yeni Stilini Dene',
    subtitleTr:
      'Saç balayage tonlarını, dijital gülüş tasarımını (OM1/B1) veya cilt protokolünü canlı vizörde karşılaştır ve tek dokunuşla uzmanına referans olarak zımbala.',
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
    badgeTr: 'VIP Sağlık Turizmi',
    titleTr: 'Havalimanı VIP Vito’dan Post-Op Doktor Takibine Cep Concierge',
    subtitleTr:
      'Uluslararası hastalar için uçuş inişi, şoför plaka kartı, 5* otel voucher’ı, operasyon öncesi geri sayım ve gün gün iyileşme fotoğrafı onayı tek ekranda.',
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
    badgeTr: 'Partner Cep Stüdyo',
    titleTr: 'Uzman & Hekimler İçin Koltuk Başı Çizim Kanvası ve Hızlı POS',
    subtitleTr:
      'Müşteri koltuğa oturduğunda kahve tercihini ve geçmiş boya formülünü gör, fotoğraf üzerinde parmakla estetik/saç çizimi yap, 3 saniyede barkod okutup tahsilat al.',
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

const StoryIcon = ({ id, className }: { id: string; className: string }) => {
  if (id === 'story-flash-map') return <MapPin className={className} />;
  if (id === 'story-vip-passport') return <Crown className={className} />;
  if (id === 'story-ai-camera') return <Camera className={className} />;
  if (id === 'story-ht-vip') return <Plane className={className} />;
  if (id === 'story-partner-studio') return <Wallet className={className} />;
  return <Stethoscope className={className} />;
};

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
        className="w-full overflow-x-auto no-scrollbar border-b border-slate-200 bg-white px-3.5 py-3"
        data-testid="mobile-story-reels-strip"
      >
        <div className="mx-auto flex max-w-lg items-start gap-4">
          {MOBILE_STORY_HIGHLIGHTS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveStoryIndex(idx)}
              className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center transition-transform active:scale-95"
              data-testid={`story-bubble-${item.id}`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#5B5FEF] bg-[#EEF0FF] ring-2 ring-white transition-colors group-hover:bg-[#E4E7FF]">
                <StoryIcon id={item.id} className="h-6 w-6 stroke-[1.8] text-[#5B5FEF]" />
              </span>
              <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-[#111827]">
                {item.badgeTr}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Full-Screen Story Experience Modal */}
      {activeStory && activeStoryIndex !== null && (
        <div
          className="fixed inset-0 z-[90] flex select-none flex-col bg-[#F8F9FB] p-4"
          data-testid="mobile-story-fullscreen-modal"
        >
          {/* Story Progress Bars */}
          <div className="mx-auto w-full max-w-lg space-y-3 pt-2">
            <div className="grid grid-cols-5 gap-1.5">
              {MOBILE_STORY_HIGHLIGHTS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStoryIndex(i)}
                  className="h-1.5 overflow-hidden rounded-full bg-slate-200"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      i <= activeStoryIndex ? 'w-full bg-[#5B5FEF]' : 'w-0'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#DDE0FF] bg-[#EEF0FF] px-3 py-1.5 text-xs font-semibold text-[#5B5FEF]">
                <Sparkles className="h-3.5 w-3.5" />
                {activeStory.badgeTr}
              </span>
              <button
                type="button"
                onClick={() => setActiveStoryIndex(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#6B7280] transition-colors hover:text-[#111827]"
                data-testid="close-story-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Story Main Visual Card */}
          <article className="mx-auto my-auto w-full max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#5B5FEF]">
              <StoryIcon id={activeStory.id} className="h-7 w-7 stroke-[1.8]" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B5FEF]">
                LARİ UYGULAMAYA ÖZEL DENEYİM ({activeStoryIndex + 1}/
                {MOBILE_STORY_HIGHLIGHTS.length})
              </span>
              <h2 className="text-2xl font-bold leading-tight text-[#111827]">
                {activeStory.titleTr}
              </h2>
              <p className="text-sm leading-relaxed text-[#6B7280]">
                {activeStory.subtitleTr}
              </p>
            </div>

            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-[#F8F9FB] px-4">
              {activeStory.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3 py-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[11px] font-bold text-[#5B5FEF]">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-medium leading-snug text-[#111827]">{h}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleTriggerStoryCta(activeStory)}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#5B5FEF] px-4 py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#4C50DA] active:scale-[0.98]"
                data-testid="story-cta-action-btn"
              >
                <span>{activeStory.ctaLabelTr}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              {activeStoryIndex < MOBILE_STORY_HIGHLIGHTS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStoryIndex(activeStoryIndex + 1)}
                  className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-[#111827] transition-colors hover:bg-slate-50"
                >
                  Sonraki
                </button>
              )}
            </div>
          </article>

          {/* Quick Role Switcher Footer inside Story */}
          <div className="mx-auto flex w-full max-w-lg items-center justify-between px-1 pb-1 text-[11px] text-[#6B7280]">
            <span>Web klonu değil, kişisel cep asistanın.</span>
            <button
              type="button"
              onClick={() => setActiveStoryIndex(null)}
              className="font-semibold text-[#5B5FEF]"
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
