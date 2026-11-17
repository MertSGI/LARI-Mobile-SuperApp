import React, { useState } from 'react';
import {
  Bookmark,
  CalendarCheck,
  Clock,
  Compass,
  ExternalLink,
  Heart,
  Map,
  MapPin,
  Mic,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  X,
} from 'lucide-react';
import {
  buildOneTapRebookCandidate,
  LariBusinessVertical,
  MarketplaceTenantListing,
  MobileDiscoveryListingItem,
  PastAppointmentSnapshot,
  searchMobileMarketplace,
} from '../../../services/mobile/mobileDiscoveryService';
import {
  MOBILE_CATEGORY_ARTWORKS,
  VENUE_VISUAL_CATALOG,
} from '../../../services/mobile/mobileVisualAssets';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';
import MobileStorefrontDetailDrawer, {
  StorefrontSpecialistProfile,
} from '../../../components/mobile/b2c/MobileStorefrontDetailDrawer';

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
    googleBusinessProfile: {
      googlePlaceId: 'ChIJ_LARI_ATELIER_NISANTASI',
      mapsUri: 'https://www.google.com/maps/search/?api=1&query=41.0504,28.9932',
      verifiedGoogleBusiness: true,
      lastSyncedIso: '2026-11-17T08:00:00Z',
    },
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
    googleBusinessProfile: {
      googlePlaceId: 'ChIJ_LARI_DENT_KADIKOY',
      mapsUri: 'https://www.google.com/maps/search/?api=1&query=40.9819,29.0273',
      verifiedGoogleBusiness: true,
      lastSyncedIso: '2026-11-17T08:00:00Z',
    },
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
    tenantId: 'ten-auto-maslak',
    slug: 'maslak-auto-studio',
    name: 'Maslak Auto Studio • Bakım & Servis',
    vertical: 'auto_service',
    city: 'İstanbul',
    district: 'Maslak',
    latitude: 41.1095,
    longitude: 29.0211,
    rating: 4.88,
    reviewCount: 642,
    priceTier: 2,
    availableToday: true,
    nextAvailableSlot: '14:30',
    googleBusinessProfile: {
      googlePlaceId: 'ChIJ_LARI_MASLAK_AUTO',
      mapsUri: 'https://www.google.com/maps/search/?api=1&query=41.1095,29.0211',
      verifiedGoogleBusiness: true,
      lastSyncedIso: '2026-11-17T08:00:00Z',
    },
    popularServices: [
      {
        id: 'srv-auto-checkup',
        name: 'Periyodik Bakım & Bilgisayarlı Kontrol',
        durationMinutes: 60,
        priceMajor: 2900,
        currency: 'TRY',
        requiredResourceId: 'lift-bay-1',
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
    googleBusinessProfile: {
      googlePlaceId: 'ChIJ_LARI_NO9_BARBER',
      mapsUri: 'https://www.google.com/maps/search/?api=1&query=41.0422,29.0067',
      verifiedGoogleBusiness: true,
      lastSyncedIso: '2026-11-17T08:00:00Z',
    },
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
    googleBusinessProfile: {
      googlePlaceId: 'ChIJ_LARI_AURA_BEBEK',
      mapsUri: 'https://www.google.com/maps/search/?api=1&query=41.0772,29.0436',
      verifiedGoogleBusiness: true,
      lastSyncedIso: '2026-11-17T08:00:00Z',
    },
    popularServices: [
      {
        id: 'srv-deep-tissue',
        name: 'Aromaterapi Derin Doku Ritüeli',
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
    googleBusinessProfile: {
      googlePlaceId: 'ChIJ_LARI_SELIN_ETILER',
      mapsUri: 'https://www.google.com/maps/search/?api=1&query=41.0809,29.0331',
      verifiedGoogleBusiness: true,
      lastSyncedIso: '2026-11-17T08:00:00Z',
    },
    popularServices: [
      {
        id: 'srv-hydrafacial-md',
        name: 'Medikal Hydrafacial & Cilt Protokolü',
        durationMinutes: 60,
        priceMajor: 3900,
        currency: 'TRY',
        requiredResourceId: 'derma-room-1',
      },
    ],
  },
];

const VERTICAL_BADGE_LABELS: Record<string, { badgeTr: string; pillClass: string }> = {
  beauty_salon: {
    badgeTr: 'Kuaför & Güzellik',
    pillClass: 'bg-[#EEF2FF] text-[#3730A3] border-[#4F46E5]/30',
  },
  dental_clinic: {
    badgeTr: 'Diş & Gülüş Kliniği',
    pillClass: 'bg-cyan-50 text-cyan-900 border-cyan-300',
  },
  auto_service: {
    badgeTr: 'Oto Bakım & Servis',
    pillClass: 'bg-slate-100 text-slate-900 border-slate-400',
  },
  barber: {
    badgeTr: 'Berber Kulübü',
    pillClass: 'bg-amber-50 text-amber-900 border-amber-300',
  },
  spa_wellness: {
    badgeTr: 'Spa & Longevity',
    pillClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  },
  aesthetic_clinic: {
    badgeTr: 'Medikal Estetik',
    pillClass: 'bg-rose-50 text-rose-900 border-rose-300',
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
  const {
    showToast,
    themeMode,
    likedSocialPosts,
    savedSocialPosts,
    toggleLikeSocialPost,
    toggleSaveSocialPost,
  } = useMobileAppSession();
  const isDark = themeMode === 'dark';

  const [vertical, setVertical] = useState<LariBusinessVertical | 'all'>('all');
  const [queryText, setQueryText] = useState('');
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [googleVerifiedOnly, setGoogleVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [showRadarMap, setShowRadarMap] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
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
    googleVerifiedOnly,
    minRating,
    whiteLabelLockedTenantSlug,
  });

  const rebook = buildOneTapRebookCandidate(pastAppointments);
  const pinnedItem =
    searchResult.items.find((i) => i.slug === selectedMapPinSlug) ||
    searchResult.items[0];

  const activeFilterCount =
    (vertical !== 'all' ? 1 : 0) +
    (availableTodayOnly ? 1 : 0) +
    (googleVerifiedOnly ? 1 : 0) +
    (minRating > 0 ? 1 : 0);

  const cardSurface = isDark
    ? 'bg-slate-900 border-2 border-slate-700 text-white'
    : 'bg-white border-2 border-slate-300 text-slate-900';

  const innerSurface = isDark
    ? 'bg-slate-800 border-2 border-slate-700 text-slate-100'
    : 'bg-[#F8FAFC] border-2 border-slate-200 text-slate-900';

  return (
    <div className="space-y-5" data-testid="mobile-explore-marketplace-page">
      {searchResult.storefrontLockActive ? (
        <div
          className="rounded-2xl bg-emerald-50 border-2 border-emerald-400 p-4 flex items-center justify-between gap-2"
          data-testid="white-label-storefront-banner"
        >
          <div>
            <span className="text-sm font-black text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              {language === 'tr'
                ? 'Doğrudan İşletme Mağazası (%0 Komisyon)'
                : 'Direct Business Storefront (0% Commission)'}
            </span>
            <p className="text-xs text-emerald-800 mt-1">
              {language === 'tr'
                ? 'QR / İşletme linki ile giriş yaptınız; yalnızca bu işletmenin hizmetleri listelenir.'
                : 'Opened via direct business link; competitor listings are hidden.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search + Business Filters + Map Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? 'Salon, klinik, oto servis veya işlem...'
                    : 'Search salon, clinic, auto service...'
                }
                className={`w-full rounded-2xl border-2 pl-10 pr-10 py-2.5 text-sm font-medium ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="button"
                aria-label="Sesli arama"
                onClick={() =>
                  showToast('Sesli arama: Örn. "Maslak oto servis" veya "Nişantaşı" diyebilirsiniz')
                }
                className="absolute right-2 top-2 w-8 h-8 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              style={{ minHeight: '46px' }}
              className={`px-3 py-2 rounded-2xl text-xs font-black border-2 flex items-center gap-1.5 shrink-0 ${
                activeFilterCount > 0
                  ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                  : isDark
                    ? 'bg-slate-900 text-slate-200 border-slate-700'
                    : 'bg-white text-slate-800 border-slate-300'
              }`}
              data-testid="explore-filter-drawer-btn"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtre{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRadarMap((v) => !v)}
              style={{ minHeight: '46px' }}
              className={`px-3 py-2 rounded-2xl text-xs font-black border-2 flex items-center gap-1.5 shrink-0 ${
                showRadarMap
                  ? 'bg-[#EEF2FF] text-[#4338CA] border-[#4F46E5]'
                  : isDark
                    ? 'bg-slate-900 text-slate-200 border-slate-700'
                    : 'bg-white text-slate-800 border-slate-300'
              }`}
              data-testid="explore-radar-map-toggle"
            >
              <Map className="w-4 h-4" />
              <span>{showRadarMap ? 'Harita' : 'Liste'}</span>
            </button>
          </div>

          {/* Clean Visual Bento Category Grid (Zero Redundant Sub-Pills!) */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-wide uppercase">
                SEKTÖR & KATEGORİLER
              </h2>
              {vertical !== 'all' && (
                <button
                  type="button"
                  onClick={() => setVertical('all')}
                  className="text-xs font-bold text-[#4F46E5] underline"
                >
                  Tümünü Göster
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  ['beauty_salon', 'Güzellik & Saç'],
                  ['auto_service', 'Oto Bakım & Servis'],
                  ['dental_clinic', 'Diş & Klinik'],
                  ['barber', 'Berber Kulübü'],
                  ['aesthetic_clinic', 'Medikal Estetik'],
                  ['spa_wellness', 'Spa & Masaj'],
                ] as const
              ).map(([id, label]) => {
                const artwork = MOBILE_CATEGORY_ARTWORKS[id];
                const isActiveCat = vertical === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVertical(isActiveCat ? 'all' : id)}
                    className={`overflow-hidden rounded-2xl border-2 text-left transition shadow-xs ${
                      isActiveCat
                        ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/30'
                        : isDark
                          ? 'bg-slate-900 border-slate-700'
                          : 'bg-white border-slate-300'
                    }`}
                  >
                    <img
                      src={artwork.svgUrl}
                      alt={artwork.alt}
                      className="w-full h-16 object-cover bg-slate-50"
                    />
                    <span
                      className={`block px-2 py-2 text-xs font-bold leading-tight truncate ${
                        isActiveCat
                          ? 'text-[#4F46E5]'
                          : isDark
                            ? 'text-white'
                            : 'text-slate-900'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Real Google Maps Container + Google Business Profile Integration */}
          {showRadarMap && searchResult.items.length > 0 && pinnedItem && (
            <div
              className={`rounded-3xl overflow-hidden shadow-sm ${cardSurface}`}
              data-testid="interactive-radar-map-card"
            >
              {/* Google Maps Venue Selector Bar */}
              <div className="p-3 border-b-2 border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {searchResult.items.map((pin) => {
                    const isSelectedPin = pinnedItem.slug === pin.slug;
                    return (
                      <button
                        key={pin.slug}
                        type="button"
                        onClick={() => setSelectedMapPinSlug(pin.slug)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 whitespace-nowrap transition flex items-center gap-1 ${
                          isSelectedPin
                            ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                            : isDark
                              ? 'bg-slate-800 text-slate-200 border-slate-700'
                              : 'bg-[#F8FAFC] text-slate-800 border-slate-300'
                        }`}
                        data-testid={`radar-map-pin-${pin.slug}`}
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{pin.district}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setGpsEnabled((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 flex items-center gap-1 shrink-0 ${
                    gpsEnabled
                      ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                      : isDark
                        ? 'bg-slate-800 text-slate-200 border-slate-700'
                        : 'bg-white text-slate-700 border-slate-300'
                  }`}
                  data-testid="explore-gps-btn"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>GPS</span>
                </button>
              </div>

              {/* Embedded Real Google Maps Iframe */}
              <div className="relative h-48 w-full bg-slate-200">
                <iframe
                  title={`Google Maps - ${pinnedItem.name}`}
                  src={`https://maps.google.com/maps?q=${pinnedItem.latitude},${pinnedItem.longitude}&z=14&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                {pinnedItem.googleBusinessProfile?.verifiedGoogleBusiness && (
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/95 border-2 border-slate-300 text-xs font-bold text-slate-900 shadow-sm flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Google İşletme Doğrulanmış
                  </span>
                )}
              </div>

              {/* Selected Google Business Pin Card */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">{pinnedItem.name}</p>
                  <p className="text-xs text-emerald-700 font-bold truncate mt-0.5">
                    İlk Müsait: {pinnedItem.nextAvailableSlot} •{' '}
                    {pinnedItem.popularServices[0]?.priceMajor} TRY
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={
                      pinnedItem.googleBusinessProfile?.mapsUri ||
                      `https://www.google.com/maps/search/?api=1&query=${pinnedItem.latitude},${pinnedItem.longitude}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 text-xs font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Yol Tarifi
                  </a>
                  <button
                    type="button"
                    onClick={() => setStorefrontDrawerListing(pinnedItem)}
                    className="px-3 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold"
                    data-testid="radar-open-storefront-btn"
                  >
                    Vitrine Gir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1-Tap Rebook Card */}
      {rebook.available && rebook.suggestedSlots[0] && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm ${cardSurface}`}
          data-testid="one-tap-rebook-card"
        >
          <div className="min-w-0">
            <span className="text-xs font-black uppercase tracking-wide text-[#4F46E5] flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              {language === 'tr' ? 'Tek Dokunuşla Tekrarla' : '1-Tap Rebook'}
            </span>
            <p className="text-sm font-black truncate mt-0.5">
              {rebook.businessName} • {rebook.serviceName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
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
            style={{ minHeight: '44px' }}
            className="px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-black shrink-0"
          >
            {language === 'tr' ? 'Tekrarla' : 'Rebook'}
          </button>
        </div>
      )}

      {/* Recommended Editorial Business Cards (Readable Typography & Strong Borders) */}
      <div className="space-y-4" data-testid="explore-listings-container">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black tracking-wide uppercase">
            {language === 'tr' ? 'İŞLETMELER VE RANDEVU' : 'RECOMMENDED'}
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {searchResult.items.length} işletme
          </span>
        </div>

        {searchResult.items.map((item) => {
          const accent =
            VERTICAL_BADGE_LABELS[item.vertical] || VERTICAL_BADGE_LABELS.beauty_salon;
          const visual = VENUE_VISUAL_CATALOG[item.slug];
          return (
            <div
              key={item.tenantId}
              className={`rounded-3xl overflow-hidden shadow-sm ${cardSurface}`}
              data-testid={`marketplace-card-${item.slug}`}
            >
              {visual && (
                <div className="relative h-44 w-full bg-slate-200 overflow-hidden border-b-2 border-slate-200">
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
                    className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold border-2 shadow-sm ${accent.pillClass}`}
                  >
                    {accent.badgeTr}
                  </span>
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-slate-900 border-2 border-slate-300 text-xs font-black shadow-sm">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {item.rating}
                  </span>
                </div>
              )}

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-base font-black leading-snug">{item.name}</h3>
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-4 h-4 text-[#4F46E5] shrink-0" />
                    {item.district}, {item.city}
                    {item.distanceKm !== null && ` • ${item.distanceKm} km`}
                    {visual ? ` • ${visual.totalBookingsCount} Randevu` : ''}
                  </p>
                </div>

                {item.popularServices[0] && (
                  <div
                    className={`rounded-2xl px-3.5 py-3 flex items-center justify-between text-sm ${innerSurface}`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold truncate block">
                        {item.popularServices[0].name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.popularServices[0].durationMinutes} dk
                      </span>
                    </div>
                    <span className="font-black shrink-0 text-base">
                      {item.popularServices[0].priceMajor}{' '}
                      {item.popularServices[0].currency}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {item.nextAvailableSlot}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStorefrontDrawerListing(item)}
                      style={{ minHeight: '44px' }}
                      className={`px-3.5 py-2 rounded-xl border-2 text-xs font-bold flex items-center gap-1.5 ${
                        isDark
                          ? 'bg-slate-800 border-slate-600 text-white'
                          : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                      data-testid={`open-storefront-btn-${item.slug}`}
                    >
                      <Store className="w-4 h-4 text-[#4F46E5]" />
                      {language === 'tr' ? 'Mağaza' : 'Storefront'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenBookingSheet?.(item)}
                      style={{ minHeight: '44px' }}
                      className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
                      data-testid={`open-booking-btn-${item.slug}`}
                    >
                      <CalendarCheck className="w-4 h-4" />
                      {language === 'tr' ? 'Randevu Al' : 'Book Now'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instagram-Style Community "Yapılan İşler & Randevu Akışı" across Every Sector */}
      {!searchResult.storefrontLockActive && (
        <section className="space-y-3" data-testid="lari-social-showcase-feed">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black tracking-wide uppercase">
              YAPILAN İŞLER • TOPLULUK AKIŞI
            </h2>
            <span className="text-xs font-bold text-[#4F46E5]">Tüm Kesimler</span>
          </div>

          {[
            {
              postId: 'post-balayage-merve',
              tenantSlug: 'atelier-nisantasi',
              businessName: 'Atelier Nişantaşı Hair & Spa',
              specialist: 'Merve Yılmaz • Kuaför & Güzellik',
              caption:
                '9.12 Soğuk Bej Balayage + Olaplex No.2 onarımı tamamlandı. Bakım formülü müşterinin dijital pasaportuna işlendi.',
              baseLikes: 142,
              serviceTag: 'Soft Balayage & Bakım',
            },
            {
              postId: 'post-maslak-auto',
              tenantSlug: 'maslak-auto-studio',
              businessName: 'Maslak Auto Studio • Bakım & Servis',
              specialist: 'Kemal Usta • Oto Servis & Detailing',
              caption:
                'Seramik boya koruma + 60.000 km periyodik bakım & bilgisayarlı arıza tespiti şeffaf fiyat dökümü ile teslim edildi.',
              baseLikes: 98,
              serviceTag: 'Periyodik Bakım & Bilgisayarlı Kontrol',
            },
            {
              postId: 'post-dent-smile',
              tenantSlug: 'lari-dent-kadikoy',
              businessName: 'LARİ Dent & Estetik Kliniği',
              specialist: 'Dr. Ece Aksoy • Diş & Gülüş Kliniği',
              caption:
                'Üst çene OM1 doğal ton E-Max lamina önizleme ve QR kabul ile 45 dakikada dijital prova.',
              baseLikes: 116,
              serviceTag: 'Dijital Gülüş Tasarımı Muayenesi',
            },
          ].map((post) => {
            const listing = DEFAULT_MOBILE_MARKETPLACE_LISTINGS.find(
              (l) => l.slug === post.tenantSlug
            );
            const visual = VENUE_VISUAL_CATALOG[post.tenantSlug];
            const isLiked = likedSocialPosts.includes(post.postId);
            const isSaved = savedSocialPosts.includes(post.postId);

            return (
              <article
                key={post.postId}
                className={`rounded-3xl overflow-hidden shadow-sm ${cardSurface}`}
              >
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-[#EEF2FF] text-[#4338CA] border-2 border-[#4F46E5] flex items-center justify-center font-black text-xs shrink-0">
                      {post.businessName.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{post.businessName}</p>
                      <p className="text-xs text-slate-500 truncate">{post.specialist}</p>
                    </div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#4F46E5] shrink-0" />
                </div>

                {visual && (
                  <img
                    src={visual.coverPhotoUrl}
                    alt={post.caption}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== visual.fallbackSvgUrl) {
                        img.src = visual.fallbackSvgUrl;
                      }
                    }}
                    className="w-full h-48 object-cover bg-slate-100 border-y-2 border-slate-200 dark:border-slate-700"
                  />
                )}

                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleLikeSocialPost(post.postId)}
                        className="flex items-center gap-1 text-xs font-black"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-600'
                          }`}
                        />
                        <span>{post.baseLikes + (isLiked ? 1 : 0)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => showToast('Gönderi bağlantısı paylaşıma kopyalandı!')}
                        aria-label="Paylaş"
                        className="text-slate-600 hover:text-[#4F46E5]"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSaveSocialPost(post.postId)}
                      aria-label="Kaydet"
                    >
                      <Bookmark
                        className={`w-5 h-5 ${
                          isSaved ? 'text-[#4F46E5] fill-[#4F46E5]' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed">
                    <strong className="mr-1">{post.businessName}</strong>
                    {post.caption}
                  </p>

                  {listing && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenBookingSheet?.(
                          { ...listing, distanceKm: 1.2, estimatedTravelMinutes: 8 },
                          undefined,
                          [post.serviceTag]
                        )
                      }
                      style={{ minHeight: '42px' }}
                      className="w-full rounded-xl bg-[#EEF2FF] hover:bg-indigo-100 border-2 border-[#4F46E5]/30 text-[#4338CA] text-xs font-black flex items-center justify-center gap-1.5"
                    >
                      <CalendarCheck className="w-4 h-4" />
                      Bu İşlem İçin Hemen Randevu Al ({post.serviceTag})
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Business Filter Modal Drawer */}
      {filterDrawerOpen && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-xs flex items-end justify-center"
          data-testid="explore-filter-modal"
          onClick={() => setFilterDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-t-3xl border-t-2 p-5 space-y-4 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-base font-black">İşletme & Sektör Filtrele</h3>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-500">Sektör Seçimi</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['all', 'Tüm Sektörler'],
                    ['auto_service', 'Oto Bakım & Servis'],
                    ['beauty_salon', 'Kuaför & Güzellik'],
                    ['dental_clinic', 'Diş & Klinik'],
                    ['barber', 'Berber Kulübü'],
                    ['spa_wellness', 'Spa & Masaj'],
                    ['aesthetic_clinic', 'Medikal Estetik'],
                  ] as const
                ).map(([vId, vLabel]) => (
                  <button
                    key={vId}
                    type="button"
                    onClick={() => setVertical(vId)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 text-left ${
                      vertical === vId
                        ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-[#F8FAFC] border-slate-300 text-slate-800'
                    }`}
                  >
                    {vLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer text-sm font-bold">
                <span>Sadece Bugün Müsait İşletmeler</span>
                <input
                  type="checkbox"
                  checked={availableTodayOnly}
                  onChange={(e) => setAvailableTodayOnly(e.target.checked)}
                  className="w-5 h-5 accent-[#4F46E5]"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer text-sm font-bold">
                <span>Google İşletme Profili Doğrulanmış</span>
                <input
                  type="checkbox"
                  checked={googleVerifiedOnly}
                  onChange={(e) => setGoogleVerifiedOnly(e.target.checked)}
                  className="w-5 h-5 accent-[#4F46E5]"
                />
              </label>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-500">Minimum Puan</span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 4.8, 4.9].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setMinRating(r)}
                    className={`py-2 rounded-xl text-xs font-bold border-2 ${
                      minRating === r
                        ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                        : 'bg-[#F8FAFC] border-slate-300 text-slate-800'
                    }`}
                  >
                    {r === 0 ? 'Tümü' : `★ ${r}+`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setVertical('all');
                  setAvailableTodayOnly(false);
                  setGoogleVerifiedOnly(false);
                  setMinRating(0);
                  setFilterDrawerOpen(false);
                }}
                style={{ minHeight: '46px' }}
                className="rounded-xl border-2 border-slate-300 text-sm font-bold"
              >
                Sıfırla
              </button>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                style={{ minHeight: '46px' }}
                className="rounded-xl bg-[#4F46E5] text-white text-sm font-black"
              >
                Uygula ({searchResult.items.length})
              </button>
            </div>
          </div>
        </div>
      )}

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
