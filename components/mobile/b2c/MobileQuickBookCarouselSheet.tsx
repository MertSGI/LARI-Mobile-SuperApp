import React, { useMemo, useState } from 'react';
import { CalendarCheck, Clock, MapPin, ShieldCheck, Star, Store, X } from 'lucide-react';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';
import {
  LariBusinessVertical,
  MarketplaceTenantListing,
  MobileDiscoveryListingItem,
  searchMobileMarketplace,
} from '../../../services/mobile/mobileDiscoveryService';
import { convertFromTryMajor } from '../../../services/mobile/mobileRegionCurrencyService';
import { VENUE_VISUAL_CATALOG } from '../../../services/mobile/mobileVisualAssets';
import MobileStorefrontDetailDrawer, {
  StorefrontSpecialistProfile,
} from './MobileStorefrontDetailDrawer';

const CATEGORY_LABELS: Record<LariBusinessVertical, string> = {
  beauty_salon: 'Güzellik & Saç',
  barber: 'Berber',
  nail_studio: 'Tırnak',
  spa_wellness: 'Spa & Masaj',
  dental_clinic: 'Diş & Klinik',
  aesthetic_clinic: 'Medikal Estetik',
  physiotherapy: 'Fizyoterapi',
  personal_trainer: 'Pilates & Fitness',
  consulting: 'Danışmanlık',
  auto_service: 'Oto Servis',
  pet_grooming: 'Pet Bakım',
  home_repair: 'Ev Hizmetleri',
};

export interface MobileQuickBookCarouselSheetProps {
  listings: MarketplaceTenantListing[];
  initialVerticalFilter?: LariBusinessVertical | 'all';
  onClose: () => void;
  onOpenBooking: (
    listing: MobileDiscoveryListingItem,
    specialist?: StorefrontSpecialistProfile,
    serviceNames?: string[]
  ) => void;
}

export const MobileQuickBookCarouselSheet: React.FC<
  MobileQuickBookCarouselSheetProps
> = ({ listings, initialVerticalFilter = 'all', onClose, onOpenBooking }) => {
  const { themeMode, selectedCurrency } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const [verticalFilter, setVerticalFilter] = useState<
    LariBusinessVertical | 'all'
  >(initialVerticalFilter);
  const [storefrontListing, setStorefrontListing] =
    useState<MobileDiscoveryListingItem | null>(null);

  const availableVerticals = useMemo(
    () => Array.from(new Set(listings.map((item) => item.vertical))),
    [listings]
  );
  const items = useMemo(
    () =>
      searchMobileMarketplace({
        listings,
        userCoords: { latitude: 41.048, longitude: 28.995 },
        verticalFilter,
        sortBy: 'distance_km',
      }).items,
    [listings, verticalFilter]
  );

  const surface = isDark
    ? 'bg-slate-950 border-slate-700 text-white'
    : 'bg-[#F8F9FB] border-slate-300 text-slate-900';
  const cardSurface = isDark
    ? 'bg-slate-900 border-slate-700 text-white'
    : 'bg-white border-slate-300 text-slate-900';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm"
      data-testid="mobile-quick-book-carousel-sheet"
      onClick={onClose}
    >
      <section
        className={`max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-x-2 border-t-2 pb-7 shadow-2xl ${surface}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b-2 border-slate-200 bg-inherit px-4 pb-3 pt-4 dark:border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4F46E5]">
                Hızlı Randevu
              </p>
              <h2 className="mt-1 text-xl font-black">Yakındaki LARİ İşletmeleri</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                İşletmeleri kaydırın veya sektöre göre filtreleyin.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Hızlı randevu ekranını kapat"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              data-testid="quick-book-carousel-close-btn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setVerticalFilter('all')}
              className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-black ${
                verticalFilter === 'all'
                  ? 'border-[#4338CA] bg-[#4F46E5] text-white'
                  : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
              }`}
              data-testid="quick-book-filter-all"
            >
              Tümü
            </button>
            {availableVerticals.map((vertical) => (
              <button
                key={vertical}
                type="button"
                onClick={() => setVerticalFilter(vertical)}
                className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-black ${
                  verticalFilter === vertical
                    ? 'border-[#4338CA] bg-[#4F46E5] text-white'
                    : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                }`}
                data-testid={`quick-book-filter-${vertical}`}
              >
                {CATEGORY_LABELS[vertical]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-4 no-scrollbar">
          {items.map((item) => {
            const visual = VENUE_VISUAL_CATALOG[item.slug];
            const service = item.popularServices[0];
            const convertedPrice = service
              ? convertFromTryMajor(service.priceMajor, selectedCurrency)
              : null;
            return (
              <article
                key={item.slug}
                className={`w-[82vw] max-w-[340px] shrink-0 snap-center overflow-hidden rounded-3xl border-2 shadow-sm ${cardSurface}`}
                data-testid={`quick-book-business-${item.slug}`}
              >
                <div className="relative h-44 border-b-2 border-slate-200 bg-slate-200 dark:border-slate-700">
                  {visual ? (
                    <img
                      src={visual.coverPhotoUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        if (event.currentTarget.src !== visual.fallbackSvgUrl) {
                          event.currentTarget.src = visual.fallbackSvgUrl;
                        }
                      }}
                    />
                  ) : null}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {item.isSponsored ? (
                      <span className="rounded-full border-2 border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900">
                        {item.sponsorTagTr || 'Sponsorlu'}
                      </span>
                    ) : null}
                    {item.googleBusinessProfile?.verifiedGoogleBusiness ? (
                      <span className="flex items-center gap-1 rounded-full border-2 border-emerald-300 bg-white/95 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                        <ShieldCheck className="h-3 w-3" /> Doğrulanmış
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-black leading-tight">{item.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-[#4F46E5]" />
                        {item.district} • {item.distanceKm?.toLocaleString('tr-TR')} km
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-black">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {item.rating}
                    </span>
                  </div>

                  {service ? (
                    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                      <p className="truncate text-sm font-bold">{service.name}</p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                          <Clock className="h-3.5 w-3.5" /> İlk müsait {item.nextAvailableSlot}
                        </span>
                        <span className="font-black">
                          {convertedPrice?.toLocaleString('tr-TR')} {selectedCurrency}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStorefrontListing(item)}
                      className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-300 px-2 text-xs font-black dark:border-slate-600"
                      data-testid={`quick-book-storefront-${item.slug}`}
                    >
                      <Store className="h-4 w-4 text-[#4F46E5]" /> Vitrini Gör
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenBooking(item)}
                      className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-[#4F46E5] px-2 text-xs font-black text-white"
                      data-testid={`quick-book-book-${item.slug}`}
                    >
                      <CalendarCheck className="h-4 w-4" /> Hemen Randevu Al
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {storefrontListing ? (
        <div onClick={(event) => event.stopPropagation()}>
          <MobileStorefrontDetailDrawer
            listing={storefrontListing}
            onClose={() => setStorefrontListing(null)}
            onProceedToBooking={(listing, specialist, serviceNames) => {
              setStorefrontListing(null);
              onOpenBooking(listing, specialist, serviceNames);
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default MobileQuickBookCarouselSheet;
