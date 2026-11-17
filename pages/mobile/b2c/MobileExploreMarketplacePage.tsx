import React, { useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Coffee,
  Compass,
  Flame,
  Layers,
  Map,
  MapPin,
  Mic,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
} from 'lucide-react';
import {
  buildOneTapRebookCandidate,
  LariBusinessVertical,
  MarketplaceTenantListing,
  MobileDiscoveryListingItem,
  PastAppointmentSnapshot,
  searchMobileMarketplace,
} from '../../../services/mobile/mobileDiscoveryService';
import MobileStorefrontDetailDrawer, {
  StorefrontSpecialistProfile,
} from '../../../components/mobile/b2c/MobileStorefrontDetailDrawer';
import {
  MOBILE_CATEGORY_ARTWORKS,
  VENUE_VISUAL_CATALOG,
} from '../../../services/mobile/mobileVisualAssets';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';

export const DEFAULT_MOBILE_MARKETPLACE_LISTINGS: MarketplaceTenantListing[] = [
  {
    tenantId: 'ten-atelier-nisantasi',
    slug: 'atelier-nisantasi',
    name: 'Atelier Nişantaşı Hair & Spa',
    vertical: 'beauty_salon',
    city: 'İstanbul',
    district: 'Nişantaşı',
    latitude: 41.0504,
    longitude: 28.9932,
    rating: 4.9,
    reviewCount: 418,
    priceTier: 3,
    availableToday: true,
    nextAvailableSlot: '15:30',
    popularServices: [
      {
        id: 'srv-balayage',
        name: 'Soft Balayage & Bakım',
        durationMinutes: 120,
        priceMajor: 4200,
        currency: 'TRY',
        requiredResourceId: 'room-color-1',
      },
    ],
  },
  {
    tenantId: 'ten-dent-kadikoy',
    slug: 'lari-dent-kadikoy',
    name: 'LARİ Dent & Estetik Kliniği',
    vertical: 'dental_clinic',
    city: 'İstanbul',
    district: 'Kadıköy',
    latitude: 40.9819,
    longitude: 29.0273,
    rating: 4.95,
    reviewCount: 289,
    priceTier: 3,
    availableToday: true,
    nextAvailableSlot: '14:00',
    popularServices: [
      {
        id: 'srv-smile-design',
        name: 'Dijital Gülüş Tasarımı Muayenesi',
        durationMinutes: 45,
        priceMajor: 1800,
        currency: 'TRY',
        requiredResourceId: 'dental-chair-1',
      },
    ],
  },
  {
    tenantId: 'ten-barber-besiktas',
    slug: 'no9-barber-club',
    name: 'No.9 Gentleman Barber Club',
    vertical: 'barber',
    city: 'İstanbul',
    district: 'Beşiktaş',
    latitude: 41.0422,
    longitude: 29.0067,
    rating: 4.8,
    reviewCount: 194,
    priceTier: 2,
    availableToday: false,
    nextAvailableSlot: 'Yarın 10:30',
    popularServices: [
      {
        id: 'srv-cut-beard',
        name: 'Skin Fade & Sıcak Havlu Sakal',
        durationMinutes: 45,
        priceMajor: 950,
        currency: 'TRY',
      },
    ],
  },
  {
    tenantId: 'ten-spa-bebek',
    slug: 'aura-holistic-spa-bebek',
    name: 'Aura Holistic Spa & Longevity Club',
    vertical: 'spa_wellness',
    city: 'İstanbul',
    district: 'Bebek',
    latitude: 41.0772,
    longitude: 29.0436,
    rating: 4.92,
    reviewCount: 312,
    priceTier: 3,
    availableToday: true,
    nextAvailableSlot: '16:15',
    popularServices: [
      {
        id: 'srv-deep-tissue',
        name: 'Aromaterapi Derin Doku & Sıcak Taş Ritüeli',
        durationMinutes: 90,
        priceMajor: 3400,
        currency: 'TRY',
        requiredResourceId: 'spa-suite-1',
      },
    ],
  },
  {
    tenantId: 'ten-aesthetics-etiler',
    slug: 'dr-selin-aesthetics-etiler',
    name: 'Dr. Selin Medikal Estetik & Dermoklinik',
    vertical: 'aesthetic_clinic',
    city: 'İstanbul',
    district: 'Etiler',
    latitude: 41.0809,
    longitude: 29.0331,
    rating: 4.96,
    reviewCount: 245,
    priceTier: 3,
    availableToday: true,
    nextAvailableSlot: '17:00',
    popularServices: [
      {
        id: 'srv-hydrafacial-md',
        name: 'Medikal Hydrafacial & Eksozom Işıltı Protokolü',
        durationMinutes: 60,
        priceMajor: 3900,
        currency: 'TRY',
        requiredResourceId: 'derma-room-1',
      },
    ],
  },
];

const VERTICAL_ACCENTS: Record<
  string,
  { badgeTr: string; pillClass: string }
> = {
  beauty_salon: {
    badgeTr: 'Saç & Güzellik Stüdyosu',
    pillClass: 'bg-[#EEF0FF] text-[#4338CA] border-indigo-200',
  },
  dental_clinic: {
    badgeTr: 'Diş & Gülüş Kliniği',
    pillClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  barber: {
    badgeTr: 'Centilmen Berber Kulübü',
    pillClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  spa_wellness: {
    badgeTr: 'Holistik Spa & Wellness',
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  aesthetic_clinic: {
    badgeTr: 'Medikal Estetik & Dermoklinik',
    pillClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export interface MobileExploreMarketplacePageProps {
  whiteLabelLockedTenantSlug?: string | null;
  pastAppointments?: PastAppointmentSnapshot[];
  language?: 'tr' | 'en';
  onOpenBookingSheet?: (
    listing: MobileDiscoveryListingItem,
    specialist?: StorefrontSpecialistProfile,
    serviceNames?: string[]
  ) => void;
  onOneTapRebook?: (tenantSlug: string, date: string, time: string) => void;
}

export const MobileExploreMarketplacePage: React.FC<
  MobileExploreMarketplacePageProps
> = ({
  whiteLabelLockedTenantSlug = null,
  pastAppointments = [],
  language = 'tr',
  onOpenBookingSheet,
  onOneTapRebook,
}) => {
  const { showToast } = useMobileAppSession();
  const [vertical, setVertical] = useState<LariBusinessVertical | 'all'>('all');
  const [queryText, setQueryText] = useState('');
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [showRadarMap, setShowRadarMap] = useState(true);
  const [selectedMapPinSlug, setSelectedMapPinSlug] = useState<string>(
    'atelier-nisantasi'
  );
  const [storefrontDrawerListing, setStorefrontDrawerListing] =
    useState<MobileDiscoveryListingItem | null>(null);

  const userCoords = gpsEnabled
    ? { latitude: 41.048, longitude: 28.995 }
    : null;

  const searchResult = searchMobileMarketplace({
    listings: DEFAULT_MOBILE_MARKETPLACE_LISTINGS,
    userCoords,
    verticalFilter: vertical,
    queryText,
    availableTodayOnly,
    whiteLabelLockedTenantSlug,
  });

  const rebook = buildOneTapRebookCandidate(pastAppointments);
  const flashItems = searchResult.items.filter((i) => i.availableToday);
  const pinnedItem =
    searchResult.items.find((i) => i.slug === selectedMapPinSlug) ||
    searchResult.items[0];

  return (
    <div className="space-y-5 bg-[#F8F9FB] text-[#111827]" data-testid="mobile-explore-marketplace-page">
      {searchResult.storefrontLockActive ? (
        <div
          className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-between gap-2"
          data-testid="white-label-storefront-banner"
        >
          <div>
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {language === 'tr'
                ? 'Doğrudan İşletme Mağazası (%0 Komisyon)'
                : 'Direct Business Storefront (0% Commission)'}
            </span>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              {language === 'tr'
                ? 'QR / İşletme linki ile giriş yaptınız; yalnızca bu işletmenin hizmetleri listelenir.'
                : 'Opened via direct business link; competitor listings are hidden.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Search + GPS + Interactive Map Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? 'Salon, klinik, uzman veya işlem ara...'
                    : 'Search salon, clinic, specialist or service...'
                }
                className="w-full rounded-full bg-[#F3F4F6] border border-slate-200 pl-9 pr-10 py-2.5 text-xs text-[#111827] placeholder-slate-400"
              />
              <button
                type="button"
                aria-label="Sesli arama"
                onClick={() => showToast('Sesli arama: Örn. "Nişantaşı balayage" diyebilirsiniz')}
                className="absolute right-2 top-1.5 w-7 h-7 rounded-full bg-white text-[#5B5FEF] flex items-center justify-center"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setGpsEnabled((prev) => !prev)}
              style={{ minHeight: '42px' }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shrink-0 ${
                gpsEnabled
                  ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
              data-testid="explore-gps-btn"
            >
              <Compass className="w-4 h-4" />
              {language === 'tr' ? 'Yakınımda' : 'Near Me'}
            </button>
            <button
              type="button"
              onClick={() => setShowRadarMap((v) => !v)}
              style={{ minHeight: '42px' }}
              className={`px-2.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1 shrink-0 ${
                showRadarMap
                  ? 'bg-[#EEF0FF] text-[#5B5FEF] border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
              data-testid="explore-radar-map-toggle"
            >
              <Map className="w-4 h-4" />
              {showRadarMap ? 'Liste' : 'Harita'}
            </button>
          </div>

          <section className="space-y-2">
            <h2 className="text-xs font-black tracking-[0.16em] text-[#111827]">KATEGORİLER</h2>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['beauty_salon', 'Kuaför & Güzellik'],
                ['barber', 'Berber'],
                ['dental_clinic', 'Diş & Gülüş'],
                ['aesthetic_clinic', 'Medikal Estetik'],
                ['spa_wellness', 'Spa & Wellness'],
                ['health_tourism', 'Sağlık Turizmi'],
              ] as const).map(([id, label]) => {
                const artwork = MOBILE_CATEGORY_ARTWORKS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => id === 'health_tourism' ? setAvailableTodayOnly((v) => !v) : setVertical(id)}
                    className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm text-left"
                  >
                    <img src={artwork.svgUrl} alt={artwork.alt} className="w-full h-16 object-cover" />
                    <span className="block px-2 py-2 text-[10px] font-bold text-[#111827] leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Vertical & Today Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {(
              [
                { id: 'all', tr: 'Tümü', en: 'All' },
                { id: 'beauty_salon', tr: 'Kuaför & Güzellik', en: 'Beauty' },
                { id: 'dental_clinic', tr: 'Diş & Gülüş', en: 'Dental' },
                { id: 'aesthetic_clinic', tr: 'Medikal Estetik', en: 'Aesthetics' },
                { id: 'spa_wellness', tr: 'Spa & Longevity', en: 'Spa' },
                { id: 'barber', tr: 'Berber Kulübü', en: 'Barber' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setVertical(cat.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition ${
                  vertical === cat.id
                    ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {language === 'tr' ? cat.tr : cat.en}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAvailableTodayOnly((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border ${
                availableTodayOnly
                  ? 'bg-[#5B5FEF] text-white border-[#5B5FEF]'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {language === 'tr' ? 'Bugün Müsait' : 'Available Today'}
            </button>
          </div>

          {/* Interactive Live Radar Map Canvas (App-Exclusive Discovery Experience) */}
          {showRadarMap && searchResult.items.length > 0 && (
            <div
              className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm"
              data-testid="interactive-radar-map-card"
            >
              <div className="relative h-52 bg-[#F1F5F9] p-3 flex flex-col justify-between overflow-hidden">
                {/* Stylized Radar Rings & Grid */}
                <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 420 208" aria-hidden="true">
                  <rect width="420" height="208" fill="#F1F5F9" />
                  <path d="M260-20 C225 48 306 87 262 135 C237 162 277 194 259 228 L352 228 L352-20Z" fill="#DBEAFE" />
                  <g stroke="#FFFFFF" strokeWidth="5" fill="none"><path d="M0 38L420 76"/><path d="M-20 144L440 112"/><path d="M65 0L105 208"/><path d="M188 0L151 208"/><path d="M370 0L330 208"/></g>
                  <g fill="#CBD5E1" fontSize="10" fontWeight="700"><text x="24" y="30">NİŞANTAŞI</text><text x="298" y="98">BOĞAZ</text><text x="40" y="184">BEŞİKTAŞ</text></g>
                </svg>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 border border-slate-200 text-[10px] font-bold text-[#111827] shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    İSTANBUL HARİTA • {searchResult.items.length} Nokta
                  </span>
                  <span className="text-[10px] text-slate-600 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                    Pin’e dokun → Vitrine gir
                  </span>
                </div>

                {/* Interactive Venue Map Pins */}
                <div className="relative z-10 flex items-center justify-around gap-1.5 py-2 flex-wrap">
                  {searchResult.items.slice(0, 4).map((pin) => {
                    const isSelectedPin = pinnedItem?.slug === pin.slug;
                    return (
                      <button
                        key={pin.slug}
                        type="button"
                        onClick={() => setSelectedMapPinSlug(pin.slug)}
                        className={`px-2.5 py-1.5 rounded-2xl text-[10px] font-bold border transition transform flex items-center gap-1 shadow-md ${
                          isSelectedPin
                            ? 'bg-[#5B5FEF] text-white border-[#4338CA] scale-105 z-20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                        data-testid={`radar-map-pin-${pin.slug}`}
                      >
                        <MapPin className={`w-3 h-3 shrink-0 ${isSelectedPin ? 'text-white' : 'text-[#5B5FEF]'}`} />
                        <span className="truncate max-w-[95px]">
                          {pin.district}
                        </span>
                        <span className={isSelectedPin ? 'text-amber-200' : 'text-amber-500'}>★{pin.rating}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Pin Quick Mini-Drawer */}
                {pinnedItem && (
                  <div className="relative z-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#111827] truncate">
                        {pinnedItem.name}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-semibold truncate">
                        İlk boş koltuk: {pinnedItem.nextAvailableSlot} •{' '}
                        {pinnedItem.popularServices[0]?.priceMajor} TRY
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStorefrontDrawerListing(pinnedItem)}
                      className="px-3 py-1.5 rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-[11px] font-bold shrink-0"
                      data-testid="radar-open-storefront-btn"
                    >
                      Vitrine Gir
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* App-Exclusive Flash Slots ("Son Dakika Boş Koltuklar") */}
          {flashItems.length > 0 && (
            <div className="space-y-2" data-testid="flash-slots-strip">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wide text-[#111827] flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#5B5FEF]" />
                  BUGÜNE ÖZEL BOŞ SAATLER
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Anında Onay
                </span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {flashItems.map((flash) => (
                  <div
                    key={`flash-${flash.slug}`}
                    className="min-w-[230px] rounded-2xl bg-white border border-slate-200 shadow-sm p-3 space-y-2 shrink-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-[#EEF0FF] text-[#4338CA] text-[10px] font-bold">
                        BUGÜN {flash.nextAvailableSlot}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700">
                        Müsait
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827] truncate">
                        {flash.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {flash.popularServices[0]?.name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-xs font-black text-[#111827]">
                        {flash.popularServices[0]?.priceMajor} TRY
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenBookingSheet?.(flash)}
                        className="px-3 py-1 rounded-lg bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-[11px] font-bold"
                      >
                        Randevu Al
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1-Tap Rebook Card */}
      {rebook.available && rebook.suggestedSlots[0] && (
        <div
          className="rounded-2xl bg-white border border-indigo-200 shadow-sm p-3.5 flex items-center justify-between gap-3"
          data-testid="one-tap-rebook-card"
        >
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B5FEF] flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              {language === 'tr'
                ? '1-Tap Tekrar Randevu • Kayıtlı Formülünle'
                : '1-Tap Rebook'}
            </span>
            <p className="text-xs font-bold text-[#111827] truncate mt-0.5">
              {rebook.businessName} • {rebook.serviceName}
            </p>
            <p className="text-[11px] text-slate-500">
              {rebook.staffName} • En yakın: {rebook.suggestedSlots[0].date}{' '}
              {rebook.suggestedSlots[0].time}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onOneTapRebook?.(
                rebook.tenantSlug || '',
                rebook.suggestedSlots[0].date,
                rebook.suggestedSlots[0].time
              )
            }
            style={{ minHeight: '42px' }}
            className="px-3.5 py-2 rounded-xl bg-[#EEF0FF] hover:bg-indigo-100 text-[#4338CA] text-xs font-bold shrink-0"
          >
            {language === 'tr' ? 'Tekrarla' : 'Rebook'}
          </button>
        </div>
      )}

      {/* Recommended Editorial Photo Cards */}
      <div className="space-y-3" data-testid="explore-listings-container">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-[0.16em] text-[#111827]">
            {language === 'tr' ? 'ÖNERİLEN İŞLETMELER' : 'RECOMMENDED'}
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            {searchResult.items.length} işletme
          </span>
        </div>

        {searchResult.items.map((item) => {
          const accent =
            VERTICAL_ACCENTS[item.vertical] || VERTICAL_ACCENTS.beauty_salon;
          const visual = VENUE_VISUAL_CATALOG[item.slug];
          return (
            <div
              key={item.tenantId}
              className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm"
              data-testid={`marketplace-card-${item.slug}`}
            >
              {/* Real Editorial Cover Photo with offline SVG fallback */}
              {visual && (
                <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={visual.coverPhotoUrl}
                    alt={item.name}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== visual.fallbackSvgUrl) {
                        img.src = visual.fallbackSvgUrl;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm ${accent.pillClass}`}
                  >
                    {accent.badgeTr}
                  </span>
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-[#111827] text-xs font-bold shadow-sm">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {item.rating}
                  </span>
                </div>
              )}

              <div className="p-4 space-y-2.5">
                <div>
                  <h3 className="text-sm font-black text-[#111827] truncate">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 text-[#5B5FEF] shrink-0" />
                    {item.district}, {item.city}
                    {item.distanceKm !== null && ` • ${item.distanceKm} km`}
                    {visual ? ` • ${visual.totalBookingsCount} Randevu` : ''}
                  </p>
                </div>

                {item.popularServices[0] && (
                  <div className="rounded-2xl bg-[#F8F9FB] border border-slate-200/80 px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <span className="text-[#111827] font-bold truncate block">
                        {item.popularServices[0].name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {item.popularServices[0].durationMinutes} dk • Uzman seçimi & VIP ikram
                      </span>
                    </div>
                    <span className="font-black text-[#111827] shrink-0 text-sm">
                      {item.popularServices[0].priceMajor}{' '}
                      {item.popularServices[0].currency}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {item.nextAvailableSlot}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStorefrontDrawerListing(item)}
                      style={{ minHeight: '42px' }}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5"
                      data-testid={`open-storefront-btn-${item.slug}`}
                    >
                      <Store className="w-3.5 h-3.5 text-[#5B5FEF]" />
                      {language === 'tr' ? 'Mağaza & Ekip' : 'Storefront'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenBookingSheet?.(item)}
                      style={{ minHeight: '42px' }}
                      className="px-3.5 py-2 rounded-xl bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      data-testid={`open-booking-btn-${item.slug}`}
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      {language === 'tr' ? 'Randevu Al' : 'Book Now'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Screen Storefront Detail Drawer */}
      {storefrontDrawerListing && (
        <MobileStorefrontDetailDrawer
          listing={storefrontDrawerListing}
          onClose={() => setStorefrontDrawerListing(null)}
          onProceedToBooking={(listing, specialist, serviceNames) => {
            setStorefrontDrawerListing(null);
            onOpenBookingSheet?.(listing, specialist, serviceNames);
          }}
        />
      )}
    </div>
  );
};

export default MobileExploreMarketplacePage;
