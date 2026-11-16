import React, { useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Compass,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import {
  buildOneTapRebookCandidate,
  LariBusinessVertical,
  MarketplaceTenantListing,
  MobileDiscoveryListingItem,
  PastAppointmentSnapshot,
  searchMobileMarketplace,
} from '../../../services/mobile/mobileDiscoveryService';

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
];

export interface MobileExploreMarketplacePageProps {
  whiteLabelLockedTenantSlug?: string | null;
  pastAppointments?: PastAppointmentSnapshot[];
  language?: 'tr' | 'en';
  onOpenBookingSheet?: (listing: MobileDiscoveryListingItem) => void;
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
          {/* Search + GPS Trigger */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? 'Salon, klinik, ilçe veya hizmet ara...'
                    : 'Search salon, clinic, district or service...'
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
          </div>

          {/* Vertical & Today Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                { id: 'all', tr: 'Tümü', en: 'All' },
                { id: 'beauty_salon', tr: 'Kuaför & Güzellik', en: 'Beauty' },
                { id: 'dental_clinic', tr: 'Klinik & Diş', en: 'Clinic' },
                { id: 'barber', tr: 'Berber', en: 'Barber' },
                { id: 'spa_wellness', tr: 'Spa', en: 'Spa' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setVertical(cat.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border ${
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
              {language === 'tr' ? '1-Tap Tekrar Randevu' : '1-Tap Rebook'}
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

      {/* Listings */}
      <div className="space-y-3" data-testid="explore-listings-container">
        {searchResult.items.map((item) => (
          <div
            key={item.tenantId}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5"
            data-testid={`marketplace-card-${item.slug}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  {item.district}, {item.city}
                  {item.distanceKm !== null && ` • ${item.distanceKm} km`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-bold shrink-0">
                <Star className="w-3 h-3 fill-amber-300" />
                {item.rating}
              </span>
            </div>

            {item.popularServices[0] && (
              <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium truncate">
                  {item.popularServices[0].name}
                </span>
                <span className="font-bold text-white shrink-0">
                  {item.popularServices[0].priceMajor} {item.popularServices[0].currency}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {item.availableToday
                  ? `Bugün ${item.nextAvailableSlot}`
                  : item.nextAvailableSlot}
              </span>
              <button
                type="button"
                onClick={() => onOpenBookingSheet?.(item)}
                style={{ minHeight: '42px' }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
                data-testid={`book-cta-${item.slug}`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                {language === 'tr' ? '3 Dokunuşta Randevu' : 'Book in 3 Taps'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileExploreMarketplacePage;
