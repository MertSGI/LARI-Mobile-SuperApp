import React, { useState } from 'react';
import {
  Award,
  CalendarPlus,
  Check,
  ChevronLeft,
  Clock,
  Coffee,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  VolumeX,
} from 'lucide-react';
import { MobileDiscoveryListingItem } from '../../../services/mobile/mobileDiscoveryService';
import { VENUE_VISUAL_CATALOG } from '../../../services/mobile/mobileVisualAssets';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';
import {
  convertFromTryMajor,
  getCurrencySymbol,
} from '../../../services/mobile/mobileRegionCurrencyService';

export interface StorefrontSpecialistProfile {
  id: string;
  name: string;
  titleTr: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  signatureNoteTr: string;
}

export interface StorefrontLookbookItem {
  id: string;
  titleTr: string;
  formulaOrProtocolTr: string;
  durationMinutes: number;
  beforeLabelTr: string;
  afterLabelTr: string;
}

export interface MobileStorefrontDetailDrawerProps {
  listing: MobileDiscoveryListingItem;
  onClose: () => void;
  onProceedToBooking: (
    listing: MobileDiscoveryListingItem,
    selectedSpecialist?: StorefrontSpecialistProfile,
    selectedServiceNames?: string[]
  ) => void;
}

function getSpecialistsForVertical(
  vertical: MobileDiscoveryListingItem['vertical']
): StorefrontSpecialistProfile[] {
  if (vertical === 'dental_clinic' || vertical === 'aesthetic_clinic') {
    return [
      {
        id: 'sp-dr-selin',
        name: 'Dt. Selin Kaya',
        titleTr: 'Başhekim • Dijital Gülüş & Lamina Uzmanı',
        experienceYears: 12,
        rating: 4.98,
        reviewCount: 164,
        signatureNoteTr: 'Doğal dudak hattı uyumlu OM1/B1 zirkonyum ve minimal invaziv estetik.',
      },
      {
        id: 'sp-dr-emre',
        name: 'Uzm. Dr. Emre Soylu',
        titleTr: 'İmplantoloji & Medikal Estetik',
        experienceYears: 9,
        rating: 4.94,
        reviewCount: 112,
        signatureNoteTr: '3D tomografi destekli ağrısız implant ve dermal protokoller.',
      },
    ];
  }
  if (vertical === 'barber') {
    return [
      {
        id: 'sp-kaan',
        name: 'Kaan Demir',
        titleTr: 'Master Barber • Skin Fade & Sakal Mimarı',
        experienceYears: 8,
        rating: 4.95,
        reviewCount: 142,
        signatureNoteTr: 'Yüz anatomisine göre keskin sakal kontürü ve sıcak havlu ritüeli.',
      },
      {
        id: 'sp-burak',
        name: 'Burak Yılmaz',
        titleTr: 'Kıdemli Stilist • Klasik & Modern Kesim',
        experienceYears: 6,
        rating: 4.88,
        reviewCount: 89,
        signatureNoteTr: 'Makas dokulu doğal geçişler ve buharlı cilt bakımı.',
      },
    ];
  }
  return [
    {
      id: 'sp-merve',
      name: 'Merve Yılmaz',
      titleTr: 'Art Director • Renk & Balayage Uzmanı',
      experienceYears: 11,
      rating: 4.97,
      reviewCount: 238,
      signatureNoteTr: 'Yıpratmayan soğuk/karamel balayage geçişleri ve keratin cam saç.',
    },
    {
      id: 'sp-deniz',
      name: 'Deniz Aksoy',
      titleTr: 'Kıdemli Kesim & Bakım Uzmanı',
      experienceYears: 7,
      rating: 4.91,
      reviewCount: 134,
      signatureNoteTr: 'Yüz şekline özel katlı kesim ve organik nem terapisi.',
    },
  ];
}

function getExtraServicesForListing(listing: MobileDiscoveryListingItem) {
  const base = listing.popularServices;
  if (listing.vertical === 'dental_clinic') {
    return [
      ...base,
      {
        id: 'srv-bleaching-laser',
        name: 'Lazer Diş Beyazlatma (Ofis Tipi)',
        descriptionTr: 'Tek seansta 3-4 ton açılma sağlayan hassasiyet korumalı klinik beyazlatma.',
        durationMinutes: 60,
        priceMajor: 4500,
        currency: 'TRY' as const,
      },
      {
        id: 'srv-pano-checkup',
        name: '3D Panoramik Görüntüleme & Konsültasyon',
        descriptionTr: 'Dijital tarama ile kişiye özel tedavi yol haritası ve fiyatlandırma.',
        durationMinutes: 30,
        priceMajor: 950,
        currency: 'TRY' as const,
      },
    ];
  }
  if (listing.vertical === 'barber') {
    return [
      ...base,
      {
        id: 'srv-vip-groom',
        name: 'VIP Damat / Özel Gün Bakım Paketi',
        descriptionTr: 'Saç tasarımı, sıcak havlu tıraş, kil maskesi ve buharlı bakım ritüeli.',
        durationMinutes: 90,
        priceMajor: 2200,
        currency: 'TRY' as const,
      },
      {
        id: 'srv-black-mask',
        name: 'Buharlı Gözenek Temizliği & Maske',
        descriptionTr: 'Aktif karbon maske ile arındırıcı ekspres yüz bakımı.',
        durationMinutes: 30,
        priceMajor: 550,
        currency: 'TRY' as const,
      },
    ];
  }
  return [
    ...base,
    {
      id: 'srv-keratin-glass',
      name: 'Glass Hair Keratin & Kolajen Terapisi',
      descriptionTr: 'Elektriklenmeyi önleyen, 3 aya kadar kalıcı ipeksi parlaklık bakımı.',
      durationMinutes: 75,
      priceMajor: 2600,
      currency: 'TRY' as const,
    },
    {
      id: 'srv-brow-lamination',
      name: 'Kaş Laminasyonu & İpek Kirpik Lifting',
      descriptionTr: 'Vitamin serumu destekli doğal hacim ve kalkık form uygulaması.',
      durationMinutes: 45,
      priceMajor: 1350,
      currency: 'TRY' as const,
    },
  ];
}

const LOOKBOOK_PORTFOLIO: StorefrontLookbookItem[] = [
  {
    id: 'lb-1',
    titleTr: 'Soğuk Karamel Soft Balayage',
    formulaOrProtocolTr: 'Kayıtlı Formül: Dip 7.1 Küllü + Uçlar 9.12 Tonlama + Olaplex No.2',
    durationMinutes: 120,
    beforeLabelTr: 'ÖNCE: Mat & Kırık Uçlar',
    afterLabelTr: 'SONRA: Işıltılı Geçiş & İpeksi Doku',
  },
  {
    id: 'lb-2',
    titleTr: 'Doğal Oranlı Dijital Gülüş (OM1)',
    formulaOrProtocolTr: 'Protokol: 3D Dijital Mockup + 10 Üye E-Max Lamina Önizleme',
    durationMinutes: 60,
    beforeLabelTr: 'ÖNCE: Asimetrik Diş Hattı',
    afterLabelTr: 'SONRA: Dudak Uyumlu Doğal Gülüş',
  },
];

export const MobileStorefrontDetailDrawer: React.FC<
  MobileStorefrontDetailDrawerProps
> = ({ listing, onClose, onProceedToBooking }) => {
  const {
    customVenuePhotos,
    selectedCurrency,
    showToast,
    storefrontCustomization,
  } = useMobileAppSession();
  const currencySymbol = getCurrencySymbol(selectedCurrency);
  const [activeTab, setActiveTab] = useState<
    'services' | 'specialists' | 'portfolio' | 'hospitality'
  >('services');
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const services = getExtraServicesForListing(listing);
  const specialists = getSpecialistsForVertical(listing.vertical);
  const visual = VENUE_VISUAL_CATALOG[listing.slug];
  const isActivePartnerStorefront =
    listing.slug === 'atelier-nisantasi' ||
    listing.name === storefrontCustomization.businessName;
  const requestedAccentColor = isActivePartnerStorefront
    ? storefrontCustomization.accentColor || '#4F46E5'
    : '#4F46E5';
  const accentColor = /^#[0-9a-f]{6}$/i.test(requestedAccentColor)
    ? requestedAccentColor
    : '#4F46E5';
  const whatsappDigits = (
    isActivePartnerStorefront
      ? storefrontCustomization.whatsappNumber
      : visual?.phone || storefrontCustomization.whatsappNumber
  ).replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappDigits || '905325550140'}?text=${encodeURIComponent(
    `Merhaba, ${listing.name} için LARİ üzerinden bilgi almak istiyorum.`
  )}`;
  const catalogHeroImages = visual?.galleryPhotoUrls?.length
    ? visual.galleryPhotoUrls
    : visual
      ? [visual.coverPhotoUrl]
      : [];
  const heroImages = Array.from(
    new Set([
      ...(isActivePartnerStorefront && storefrontCustomization.coverPhotoUrl
        ? [storefrontCustomization.coverPhotoUrl]
        : []),
      ...(customVenuePhotos[listing.slug] ?? []),
      ...catalogHeroImages,
    ])
  );

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([
    services[0]?.id || '',
  ]);
  const [selectedSpecialist, setSelectedSpecialist] =
    useState<StorefrontSpecialistProfile>(specialists[0]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((x) => x !== id)
          : prev
        : [...prev, id]
    );
  };

  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id)
  );
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.priceMajor, 0);
  const totalMinutes = selectedServices.reduce(
    (acc, s) => acc + s.durationMinutes,
    0
  );

  const handleShare = async () => {
    const shareUrl = `https://randevulari.com/${listing.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing.name,
          text: `${listing.name} - LARİ üzerinden hemen randevu al`,
          url: shareUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      showToast(`${listing.name} mağaza bağlantısı paylaşıma hazır!`);
    } catch {
      showToast(`Bağlantı kopyalandı: ${shareUrl}`);
    }
  };

  const handleCall = () => {
    const tel = visual?.phone || '+90 212 555 01 40';
    if (typeof window !== 'undefined') {
      window.open(`tel:${tel.replace(/\s+/g, '')}`, '_self');
    }
    showToast(`İşletme aranıyor: ${tel}`);
  };

  const handleDirections = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`;
    if (typeof window !== 'undefined') {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    }
    showToast(`${listing.district} yol tarifi haritada açılıyor`);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      showToast('Lütfen göndermek istediğiniz notu yazın.');
      return;
    }
    showToast(`Mesajınız ${listing.name} resepsiyonuna iletildi!`);
    setMessageText('');
    setShowMessageComposer(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#F8F9FB] flex flex-col overflow-hidden text-[#111827]"
      data-testid="mobile-storefront-detail-drawer"
    >
      {/* Full-width cover gallery + storefront identity */}
      <div className="shrink-0 border-b border-slate-200 bg-white shadow-xs">
        <div className="relative mx-auto w-full max-w-lg">
          <div
            className="flex h-56 w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
            onScroll={(event) => {
              const element = event.currentTarget;
              if (element.clientWidth > 0) {
                setActiveHeroIndex(Math.round(element.scrollLeft / element.clientWidth));
              }
            }}
            data-testid="storefront-hero-carousel"
          >
            {heroImages.map((imageUrl, index) => (
              <img
                key={`${listing.slug}-hero-${index}`}
                src={imageUrl}
                alt={`${listing.name} galeri fotoğrafı ${index + 1}`}
                onError={(event) => {
                  if (visual && event.currentTarget.src !== visual.fallbackSvgUrl) {
                    event.currentTarget.src = visual.fallbackSvgUrl;
                  }
                }}
                className="h-full w-full shrink-0 snap-center object-cover bg-slate-200"
              />
            ))}
          </div>

          <div
            className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
            style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/55"
              data-testid="close-storefront-drawer-btn"
              aria-label="Kapat"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              Doğrulanmış Mağaza
            </span>
            <button
              type="button"
              onClick={handleShare}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/55"
              data-testid="storefront-share-btn"
              aria-label="Paylaş"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {heroImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-sm">
              {heroImages.map((_, index) => (
                <span
                  key={`${listing.slug}-dot-${index}`}
                  className={`h-1.5 rounded-full transition-all ${
                    activeHeroIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
                  }`}
                  data-testid={`storefront-hero-dot-${index}`}
                />
              ))}
            </div>
          )}

          <div
            className="absolute -bottom-6 left-4 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white font-black text-white shadow-lg"
            style={{ backgroundColor: visual?.logoBgColor || '#5B5FEF' }}
            data-testid="storefront-overlap-avatar"
          >
            {visual?.logoMonogram || listing.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        <div className="mx-auto max-w-lg space-y-3 px-4 pb-3 pt-9">
          <div className="min-w-0">
            <h2 className="text-base font-black leading-tight text-[#111827]">
              {isActivePartnerStorefront && storefrontCustomization.businessName
                ? storefrontCustomization.businessName
                : listing.name}
            </h2>
            {isActivePartnerStorefront && storefrontCustomization.tagline && (
              <p className="mt-0.5 text-[11px] font-bold text-[#4F46E5]">
                {storefrontCustomization.tagline}
              </p>
            )}
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {visual?.address || `${listing.district}, ${listing.city}`}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {listing.rating}
              </span>
              <span>•</span>
              <span>{visual?.totalBookingsCount || listing.reviewCount} Randevu</span>
              <span>•</span>
              <span className="text-emerald-700">Açık • Bugün {listing.nextAvailableSlot}</span>
            </p>
            <p
              className="mt-1.5 text-[11px] font-bold"
              style={{ color: accentColor }}
              data-testid="storefront-selected-specialist-heading"
            >
              {selectedSpecialist.name} • {selectedSpecialist.titleTr}
            </p>
          </div>

          {/* One-Tap Action Row (Book + Call + Message + Directions) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onProceedToBooking(
                  listing,
                  selectedSpecialist,
                  selectedServices.map((s) => s.name)
                )
              }
              style={{ minHeight: '42px', backgroundColor: accentColor }}
              className="flex-1 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CalendarPlus className="w-4 h-4" />
              Hemen Randevu Al
            </button>
            <button
              type="button"
              onClick={handleCall}
              style={{ minHeight: '42px', borderColor: accentColor, color: accentColor }}
              className="w-11 rounded-xl border bg-[#EEF0FF] flex items-center justify-center"
              aria-label="Ara"
              data-testid="storefront-call-btn"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowMessageComposer((v) => !v)}
              style={{ minHeight: '42px', borderColor: accentColor, color: accentColor }}
              className="w-11 rounded-xl border bg-[#EEF0FF] flex items-center justify-center"
              aria-label="Mesaj Gönder"
              data-testid="storefront-message-btn"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => showToast('WhatsApp ile işletme sohbeti açılıyor...')}
              style={{ minHeight: '42px', borderColor: accentColor, color: accentColor }}
              className="flex w-11 items-center justify-center rounded-xl border bg-[#EEF0FF]"
              aria-label="WhatsApp ile iletişime geç"
              data-testid="storefront-whatsapp-btn"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={handleDirections}
              style={{ minHeight: '42px', borderColor: accentColor, color: accentColor }}
              className="w-11 rounded-xl border bg-[#EEF0FF] flex items-center justify-center"
              aria-label="Yol Tarifi"
              data-testid="storefront-directions-btn"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {showMessageComposer && (
            <div className="rounded-xl bg-[#F8F9FB] border border-slate-200 p-2.5 flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Örn: Otopark durumu veya randevu öncesi sorum var..."
                className="flex-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs text-[#111827]"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                style={{ backgroundColor: accentColor }}
                className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
              >
                Gönder
              </button>
            </div>
          )}

          {/* 4 Storefront Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: 'services', label: 'Hizmetler' },
                { id: 'specialists', label: 'Uzmanlar' },
                { id: 'portfolio', label: 'Önce/Sonra' },
                { id: 'hospitality', label: 'VIP & Yorum' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={
                  activeTab === t.id
                    ? { backgroundColor: accentColor, color: '#FFFFFF' }
                    : undefined
                }
                className={`py-2 rounded-lg text-[11px] font-bold transition ${
                  activeTab === t.id
                    ? 'shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                data-testid={`storefront-tab-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto space-y-3 pb-28">
          {activeTab === 'services' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  HİZMET MENÜSÜ
                </span>
                <span className="text-[11px] text-slate-500">
                  Çoklu seçim yapabilirsiniz
                </span>
              </div>
              {services.map((srv) => {
                const isSelected = selectedServiceIds.includes(srv.id);
                return (
                  <div
                    key={srv.id}
                    style={
                      isSelected
                        ? {
                            borderColor: accentColor,
                            boxShadow: `0 0 0 1px ${accentColor}33`,
                          }
                        : undefined
                    }
                    className={`rounded-2xl bg-white p-3.5 border transition space-y-2 shadow-xs ${
                      isSelected ? '' : 'border-slate-200'
                    }`}
                    data-testid={`storefront-service-item-${srv.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#111827]">
                          {srv.name}
                        </p>
                        {'descriptionTr' in srv && srv.descriptionTr && (
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {srv.descriptionTr}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleService(srv.id)}
                        style={
                          isSelected
                            ? { backgroundColor: accentColor }
                            : { borderColor: accentColor, color: accentColor }
                        }
                        className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 transition ${
                          isSelected
                            ? 'text-white'
                            : 'border bg-[#EEF0FF]'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" />
                            Seçildi
                          </>
                        ) : (
                          'Seç'
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <span className="font-bold text-[#111827]">
                        {convertFromTryMajor(srv.priceMajor, selectedCurrency).toLocaleString(
                          'tr-TR'
                        )}{' '}
                        {currencySymbol}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {srv.durationMinutes} dk
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'specialists' && (
            <div className="space-y-3">
              {specialists.map((sp) => {
                const isPicked = selectedSpecialist.id === sp.id;
                return (
                  <div
                    key={sp.id}
                    onClick={() => setSelectedSpecialist(sp)}
                    style={
                      isPicked
                        ? {
                            borderColor: accentColor,
                            boxShadow: `0 0 0 1px ${accentColor}33`,
                          }
                        : undefined
                    }
                    className={`rounded-2xl bg-white p-4 border cursor-pointer transition space-y-2 shadow-xs ${
                      isPicked ? '' : 'border-slate-200'
                    }`}
                    data-testid={`storefront-specialist-${sp.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-2xl border bg-[#EEF0FF] flex items-center justify-center font-black text-sm"
                          style={{ borderColor: accentColor, color: accentColor }}
                        >
                          {sp.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#111827]">
                            {sp.name}
                          </h4>
                          <p
                            className="text-[11px] font-semibold"
                            style={{ color: accentColor }}
                          >
                            {sp.titleTr}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {sp.rating}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {sp.signatureNoteTr}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                      <span>{sp.experienceYears} Yıl Deneyim • {sp.reviewCount} Değerlendirme</span>
                      <span className="font-bold" style={{ color: accentColor }}>
                        {isPicked ? '✓ Seçili Uzman' : 'Bu Uzmanı Seç'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-3">
              {LOOKBOOK_PORTFOLIO.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111827]">
                      {item.titleTr}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded border bg-[#EEF0FF] font-semibold"
                      style={{ borderColor: accentColor, color: accentColor }}
                    >
                      {item.durationMinutes} dk işlem
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                      <span className="text-[10px] font-bold text-rose-700 block">
                        {item.beforeLabelTr}
                      </span>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 block">
                        {item.afterLabelTr}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 font-mono bg-[#F8F9FB] border border-slate-200 p-2 rounded-lg">
                    {item.formulaOrProtocolTr}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hospitality' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 shadow-xs">
                <h4 className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                  <Award className="w-4 h-4" style={{ color: accentColor }} />
                  Uygulamaya Özel VIP Karşılama Standartları
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9FB] border border-slate-200 text-[10px] font-semibold text-slate-700">
                    <Coffee className="w-3 h-3 text-amber-600" /> Barista Kahve & Matcha
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9FB] border border-slate-200 text-[10px] font-semibold text-slate-700">
                    <VolumeX className="w-3 h-3" style={{ color: accentColor }} /> Sessiz Seans
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9FB] border border-slate-200 text-[10px] font-semibold text-slate-700">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Pasaport Formül Kaydı
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                  Salona gelmeden içecek tercihinizi ve sessiz seans isteğinizi seçin; uzmanınız koltuğunuzu ve formül geçmişinizi önceden hazırlasın.
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">
                    Zeynep K. • Doğrulanmış QR Check-in
                  </span>
                  <span className="text-xs font-bold text-amber-600">★★★★★ 5.0</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  &ldquo;Uygulamadan filtre kahvemi ve sessiz seans istediğimi seçip girdim. Kapıdan girdiğimde kahvem hazırdı ve geçen ayki boya formülüm pasaportumdan açıldı!&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bundle Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[85] bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-500 block">
              {selectedServices.length} Hizmet • {totalMinutes} dk • {selectedSpecialist.name}
            </span>
            <span className="text-base font-black text-[#111827]">
              {convertFromTryMajor(totalPrice, selectedCurrency).toLocaleString('tr-TR')}{' '}
              {currencySymbol}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onProceedToBooking(
                listing,
                selectedSpecialist,
                selectedServices.map((s) => s.name)
              )
            }
            style={{ minHeight: '46px', backgroundColor: accentColor }}
            className="px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-sm"
            data-testid="storefront-proceed-booking-btn"
          >
            <CalendarPlus className="w-4 h-4" />
            Saat & VIP Tercih Seç
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileStorefrontDetailDrawer;
