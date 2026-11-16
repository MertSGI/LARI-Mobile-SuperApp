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
  { badgeTr: string; gradient: string; pillClass: string }
> = {
  beauty_salon: {
    badgeTr: 'Saç & Güzellik Stüdyosu',
    gradient: 'from-pink-600/25 via-indigo-900/20 to-slate-900',
    pillClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  },
  dental_clinic: {
    badgeTr: 'Diş & Gülüş Kliniği',
    gradient: 'from-cyan-600/25 via-blue-900/20 to-slate-900',
    pillClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  barber: {
    badgeTr: 'Centilmen Berber Kulübü',
    gradient: 'from-amber-600/25 via-slate-900 to-slate-900',
    pillClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  spa_wellness: {
    badgeTr: 'Holistik Spa & Wellness',
    gradient: 'from-emerald-600/25 via-teal-900/20 to-slate-900',
    pillClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  aesthetic_clinic: {
    badgeTr: 'Medikal Estetik & Dermoklinik',
    gradient: 'from-violet-600/25 via-purple-900/20 to-slate-900',
    pillClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
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
    <div className="space-y-4" data-testid="mobile-explore-marketplace-page">
      {searchResult.storefrontLockActive ? (
        <div
          className="rounded-2xl bg-emerald-950/40 border border-emerald-500/40 p-3.5 flex items-center justify-between gap-2"
          data-testid="white-label-storefront-banner"
        >
          <div>
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {language === 'tr'
                ? 'Doğrudan İşletme Mağazası (%0 Komisyon)'
                : 'Direct Business Storefront (0% Commission)'}
            </span>
            <p className="text-[11px] text-slate-300 mt-0.5">
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
                className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setGpsEnabled((prev) => !prev)}
              style={{ minHeight: '42px' }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shrink-0 ${
                gpsEnabled
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-300 border-slate-800'
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
                  ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              data-testid="explore-radar-map-toggle"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>

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
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
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
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {language === 'tr' ? 'Bugün Müsait' : 'Available Today'}
            </button>
          </div>

          {/* Interactive Live Radar Map Canvas (App-Exclusive Discovery Experience) */}
          {showRadarMap && searchResult.items.length > 0 && (
            <div
              className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl"
              data-testid="interactive-radar-map-card"
            >
              <div className="relative h-44 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.22)_0%,_rgba(15,23,42,0.96)_70%)] p-3 flex flex-col justify-between overflow-hidden">
                {/* Stylized Radar Rings & Grid */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-28 h-28 rounded-full border border-blue-400/40" />
                  <div className="w-52 h-52 rounded-full border border-blue-400/25 absolute" />
                  <div className="w-80 h-80 rounded-full border border-indigo-400/15 absolute" />
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700 text-[10px] font-bold text-cyan-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    CANLI İSTANBUL RADARI • {searchResult.items.length} Nokta
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-950/75 px-2 py-0.5 rounded-md">
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
                        className={`px-2.5 py-1.5 rounded-2xl text-[10px] font-bold border transition transform flex items-center gap-1 shadow-lg ${
                          isSelectedPin
                            ? 'bg-blue-600 text-white border-white scale-105 z-20'
                            : 'bg-slate-950/90 text-slate-200 border-slate-700 hover:border-blue-400'
                        }`}
                        data-testid={`radar-map-pin-${pin.slug}`}
                      >
                        <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
                        <span className="truncate max-w-[95px]">
                          {pin.district}
                        </span>
                        <span className="text-amber-300">★{pin.rating}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Pin Quick Mini-Drawer */}
                {pinnedItem && (
                  <div className="relative z-10 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {pinnedItem.name}
                      </p>
                      <p className="text-[10px] text-emerald-300 truncate">
                        ⚡ İlk boş koltuk: {pinnedItem.nextAvailableSlot} •{' '}
                        {pinnedItem.popularServices[0]?.priceMajor} TRY
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStorefrontDrawerListing(pinnedItem)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold shrink-0"
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
                <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                  Son Dakika Boşalan Koltuklar (Sadece Uygulamada)
                </span>
                <span className="text-[10px] text-slate-400">
                  Anında Onay & VIP Kahve
                </span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {flashItems.map((flash) => (
                  <div
                    key={`flash-${flash.slug}`}
                    className="min-w-[235px] rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 p-3 space-y-2 shrink-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black">
                        BUGÜN {flash.nextAvailableSlot}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300">
                        Son 1 Koltuk
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate">
                        {flash.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {flash.popularServices[0]?.name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-black text-white">
                        {flash.popularServices[0]?.priceMajor} TRY
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenBookingSheet?.(flash)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black"
                      >
                        Koltuk Kap
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
          className="rounded-2xl bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/30 p-3.5 flex items-center justify-between gap-3"
          data-testid="one-tap-rebook-card"
        >
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              {language === 'tr'
                ? '1-Tap Tekrar Randevu (Kayıtlı Boya Formülünle)'
                : '1-Tap Rebook'}
            </span>
            <p className="text-xs font-bold text-white truncate mt-0.5">
              {rebook.businessName} • {rebook.serviceName}
            </p>
            <p className="text-[11px] text-slate-300">
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
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0"
          >
            {language === 'tr' ? 'Tekrarla' : 'Rebook'}
          </button>
        </div>
      )}

      {/* Rich Multi-Vertical Venue Cards */}
      <div className="space-y-3" data-testid="explore-listings-container">
        {searchResult.items.map((item) => {
          const accent =
            VERTICAL_ACCENTS[item.vertical] || VERTICAL_ACCENTS.beauty_salon;
          return (
            <div
              key={item.tenantId}
              className={`rounded-3xl bg-gradient-to-br ${accent.gradient} border border-slate-800 p-4 space-y-3 shadow-lg`}
              data-testid={`marketplace-card-${item.slug}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${accent.pillClass}`}
                    >
                      {accent.badgeTr}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/70 text-[10px] font-semibold text-amber-300">
                      <Coffee className="w-2.5 h-2.5" />
                      VIP İkram
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white truncate">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    {item.district}, {item.city}
                    {item.distanceKm !== null && ` • ${item.distanceKm} km`}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-black shrink-0 border border-amber-500/30">
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  {item.rating}
                  <span className="text-[10px] text-amber-200/80 font-normal">
                    ({item.reviewCount})
                  </span>
                </span>
              </div>

              {item.popularServices[0] && (
                <div className="rounded-2xl bg-slate-950/75 border border-slate-800/90 px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <span className="text-slate-100 font-bold truncate block">
                      {item.popularServices[0].name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.popularServices[0].durationMinutes} dk • Uzman portfolyolu
                    </span>
                  </div>
                  <span className="font-black text-white shrink-0 text-sm">
                    {item.popularServices[0].priceMajor}{' '}
                    {item.popularServices[0].currency}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {item.nextAvailableSlot}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStorefrontDrawerListing(item)}
                    style={{ minHeight: '42px' }}
                    className="px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
                    data-testid={`open-storefront-btn-${item.slug}`}
                  >
                    <Store className="w-3.5 h-3.5 text-blue-400" />
                    {language === 'tr' ? 'Mağaza & Ekip' : 'Storefront'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenBookingSheet?.(item)}
                    style={{ minHeight: '42px' }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md"
                    data-testid={`open-booking-btn-${item.slug}`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    {language === 'tr' ? 'Randevu Al' : 'Book Now'}
                  </button>
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
