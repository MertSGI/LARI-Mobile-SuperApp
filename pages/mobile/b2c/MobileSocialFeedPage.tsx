import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  CalendarPlus,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  Store,
} from 'lucide-react';
import { useMobileAppSession } from '../../../contexts/MobileAppSessionContext';
import MobileStorefrontDetailDrawer, {
  StorefrontSpecialistProfile,
} from '../../../components/mobile/b2c/MobileStorefrontDetailDrawer';
import {
  MobileDiscoveryListingItem,
  searchMobileMarketplace,
  sortItemsByPreferredSectors,
} from '../../../services/mobile/mobileDiscoveryService';
import { VENUE_VISUAL_CATALOG } from '../../../services/mobile/mobileVisualAssets';
import { DEFAULT_MOBILE_MARKETPLACE_LISTINGS } from './MobileExploreMarketplacePage';

interface SocialShowcasePost {
  postId: string;
  tenantSlug: string;
  businessName: string;
  specialist: string;
  caption: string;
  baseLikes: number;
  serviceTag: string;
  photoUrl?: string;
}

const DEFAULT_SOCIAL_SHOWCASE_POSTS: SocialShowcasePost[] = [
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
];

export interface MobileSocialFeedPageProps {
  onOpenBookingSheet?: (
    listing: MobileDiscoveryListingItem,
    specialist?: StorefrontSpecialistProfile,
    serviceNames?: string[]
  ) => void;
}

export const MobileSocialFeedPage: React.FC<MobileSocialFeedPageProps> = ({
  onOpenBookingSheet,
}) => {
  const {
    customSocialPosts,
    likedSocialPosts,
    savedSocialPosts,
    toggleLikeSocialPost,
    toggleSaveSocialPost,
    showToast,
    themeMode,
    userProfile,
  } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const [storefrontListing, setStorefrontListing] =
    useState<MobileDiscoveryListingItem | null>(null);

  const nearbyBusinesses = useMemo(
    () =>
      searchMobileMarketplace({
        listings: DEFAULT_MOBILE_MARKETPLACE_LISTINGS,
        userCoords: { latitude: 41.048, longitude: 28.995 },
        sortBy: 'distance_km',
      }).items,
    []
  );

  const orderedBusinesses = useMemo(
    () => sortItemsByPreferredSectors(nearbyBusinesses, userProfile.interestedSectors),
    [nearbyBusinesses, userProfile.interestedSectors]
  );

  const orderedPosts = useMemo(() => {
    const posts: SocialShowcasePost[] = [
      ...customSocialPosts,
      ...DEFAULT_SOCIAL_SHOWCASE_POSTS,
    ];
    const postsWithVertical = posts.map((post) => ({
      ...post,
      vertical: DEFAULT_MOBILE_MARKETPLACE_LISTINGS.find(
        (listing) => listing.slug === post.tenantSlug
      )?.vertical,
    }));
    return sortItemsByPreferredSectors(
      postsWithVertical,
      userProfile.interestedSectors
    );
  }, [customSocialPosts, userProfile.interestedSectors]);

  const cardSurface = isDark
    ? 'bg-slate-900 border-2 border-slate-700 text-white'
    : 'bg-white border-2 border-slate-300 text-slate-900';

  return (
    <div
      className="space-y-5 pb-28"
      data-testid="mobile-social-feed-page"
    >
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4F46E5]">
          Keşfet
        </p>
        <h1 className="mt-1 text-2xl font-black">Sosyal Akış & Yakındaki İşletmeler</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          İlgi alanlarına göre öne çıkan işleri gör, vitrini incele ve tek dokunuşla randevu al.
        </p>
      </header>

      <section className="space-y-3" aria-label="Yakındaki ve ilgi alanındaki işletmeler">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-wide">
            Yakındaki & İlgi Alanındaki İşletmeler
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {orderedBusinesses.length} işletme
          </span>
        </div>
        <div className="-mx-3.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3.5 pb-2 no-scrollbar">
          {orderedBusinesses.map((item) => {
            const visual = VENUE_VISUAL_CATALOG[item.slug];
            return (
              <article
                key={item.slug}
                className={`w-[78vw] max-w-[310px] shrink-0 snap-center overflow-hidden rounded-3xl ${cardSurface}`}
                data-testid={`social-nearby-business-${item.slug}`}
              >
                {visual ? (
                  <div className="relative h-32 overflow-hidden border-b-2 border-slate-200 dark:border-slate-700">
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
                    {item.isSponsored ? (
                      <span className="absolute left-2.5 top-2.5 rounded-full border-2 border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900">
                        {item.sponsorTagTr || 'Sponsorlu'}
                      </span>
                    ) : null}
                    {userProfile.interestedSectors.length > 0 && item.matchesPreferredSector ? (
                      <span className="absolute bottom-2.5 left-2.5 rounded-full border-2 border-indigo-200 bg-white/95 px-2.5 py-1 text-[10px] font-black text-[#4338CA]">
                        İlgi Alanınıza Göre
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-2.5 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black">{item.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-[#4F46E5]" />
                        {item.district} • {item.distanceKm?.toLocaleString('tr-TR')} km
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-black">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {item.rating}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStorefrontListing(item)}
                      className="min-h-11 rounded-xl border-2 border-slate-300 px-2 text-xs font-black dark:border-slate-600"
                    >
                      Vitrini Gör
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenBookingSheet?.(item)}
                      className="min-h-11 rounded-xl bg-[#4F46E5] px-2 text-xs font-black text-white"
                    >
                      Randevu Al
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" data-testid="lari-social-showcase-feed">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wide">
            Yapılan İşler • Topluluk Akışı
          </h2>
          <span className="text-xs font-bold text-[#4F46E5]">Tüm Kesimler</span>
        </div>

        {orderedPosts.map((post) => {
          const listing = nearbyBusinesses.find((item) => item.slug === post.tenantSlug);
          const visual = VENUE_VISUAL_CATALOG[post.tenantSlug];
          const postPhotoUrl = post.photoUrl ?? visual?.coverPhotoUrl;
          const isLiked = likedSocialPosts.includes(post.postId);
          const isSaved = savedSocialPosts.includes(post.postId);

          return (
            <article
              key={post.postId}
              className={`overflow-hidden rounded-3xl shadow-sm ${cardSurface}`}
              data-testid={`social-post-${post.postId}`}
            >
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#4F46E5] bg-[#EEF2FF] text-xs font-black text-[#4338CA]">
                    {post.businessName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{post.businessName}</p>
                    <p className="truncate text-xs text-slate-500">{post.specialist}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {userProfile.interestedSectors.length > 0 && post.matchesPreferredSector ? (
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[9px] font-black text-[#4338CA] dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
                      İlgi Alanınıza Göre
                    </span>
                  ) : null}
                  <ShieldCheck className="h-4 w-4 text-[#4F46E5]" />
                </div>
              </div>

              {postPhotoUrl ? (
                <img
                  src={postPhotoUrl}
                  alt={post.caption}
                  className="h-56 w-full border-y-2 border-slate-200 bg-slate-100 object-cover dark:border-slate-700"
                  onError={(event) => {
                    if (visual && event.currentTarget.src !== visual.fallbackSvgUrl) {
                      event.currentTarget.src = visual.fallbackSvgUrl;
                    }
                  }}
                />
              ) : null}

              <div className="space-y-2.5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleLikeSocialPost(post.postId)}
                      className="flex items-center gap-1 pl-1 text-xs font-black"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-600'
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
                      <Share2 className="h-5 w-5" />
                    </button>
                    {listing ? (
                      <button
                        type="button"
                        onClick={() => onOpenBookingSheet?.(listing, undefined, [post.serviceTag])}
                        aria-label={`${post.serviceTag} için hızlı randevu al`}
                        className="text-[#4F46E5] hover:text-[#4338CA]"
                        data-testid={`social-quick-book-${post.postId}`}
                      >
                        <CalendarPlus className="h-5 w-5" />
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSaveSocialPost(post.postId)}
                    aria-label="Kaydet"
                  >
                    <Bookmark
                      className={`h-5 w-5 ${
                        isSaved ? 'fill-[#4F46E5] text-[#4F46E5]' : 'text-slate-600'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs leading-relaxed">
                  <strong className="mr-1">{post.businessName}</strong>
                  {post.caption}
                </p>
                {listing ? (
                  <button
                    type="button"
                    onClick={() => setStorefrontListing(listing)}
                    className="inline-flex items-center gap-1 text-xs font-black text-[#4F46E5]"
                  >
                    <Store className="h-3.5 w-3.5" /> Vitrine Git
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {storefrontListing ? (
        <MobileStorefrontDetailDrawer
          listing={storefrontListing}
          onClose={() => setStorefrontListing(null)}
          onProceedToBooking={(listing, specialist, serviceNames) => {
            setStorefrontListing(null);
            onOpenBookingSheet?.(listing, specialist, serviceNames);
          }}
        />
      ) : null}
    </div>
  );
};

export default MobileSocialFeedPage;
