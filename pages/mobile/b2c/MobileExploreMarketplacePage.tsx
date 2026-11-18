import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Compass,
  ExternalLink,
  LayoutDashboard,
  Map,
  MapPin,
  Maximize2,
  Mic,
  RotateCcw,
  Search,
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
  convertFromTryMajor,
  validateMobileUserProfile,
} from '../../../services/mobile/mobileRegionCurrencyService';
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
    isSponsored: true,
    sponsorPriority: 1,
    sponsorTagTr: 'Öne Çıkan',
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

const MOBILE_CATEGORY_OPTIONS = [
  { id: 'beauty_salon', label: 'Güzellik & Saç', visualId: 'beauty_salon', vertical: 'beauty_salon' },
  { id: 'auto_service', label: 'Oto Bakım & Servis', visualId: 'auto_service', vertical: 'auto_service' },
  { id: 'dental_clinic', label: 'Diş & Klinik', visualId: 'dental_clinic', vertical: 'dental_clinic' },
  { id: 'barber', label: 'Berber Kulübü', visualId: 'barber', vertical: 'barber' },
  { id: 'aesthetic_clinic', label: 'Medikal Estetik', visualId: 'aesthetic_clinic', vertical: 'aesthetic_clinic' },
  { id: 'spa_wellness', label: 'Spa & Masaj', visualId: 'spa_wellness', vertical: 'spa_wellness' },
  { id: 'health_tourism', label: 'Sağlık Turizmi', visualId: 'health_tourism', vertical: 'aesthetic_clinic' },
  { id: 'nail_studio', label: 'Tırnak & İpek Kirpik', visualId: 'nail_studio', vertical: 'nail_studio' },
  { id: 'physiotherapy', label: 'Fizyoterapi & Rehabilitasyon', visualId: 'physiotherapy', vertical: 'physiotherapy' },
  { id: 'dietitian', label: 'Diyetisyen & Beslenme', visualId: 'dietitian', vertical: 'consulting' },
  { id: 'pet_grooming', label: 'Veteriner & Pet Bakım', visualId: 'pet_grooming', vertical: 'pet_grooming' },
  { id: 'personal_trainer', label: 'Pilates & Fitness', visualId: 'personal_trainer', vertical: 'personal_trainer' },
] as const;

interface VoiceRecognitionController {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type VoiceRecognitionConstructor = new () => VoiceRecognitionController;

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
  onOpenPartnerOnboarding?: () => void;
  onOpenProfile?: () => void;
}

export const MobileExploreMarketplacePage: React.FC<
  MobileExploreMarketplacePageProps
> = ({
  whiteLabelLockedTenantSlug = null,
  pastAppointments = [],
  language = 'tr',
  onOpenBookingSheet,
  onOneTapRebook,
  onOpenPartnerOnboarding,
  onOpenProfile,
}) => {
  const {
    showToast,
    themeMode,
    selectedCurrency,
    userProfile,
    mobileAuthUser,
    isExplicitlySignedOut,
    openAuthModal,
  } = useMobileAppSession();
  const showGuestAuthBanner = isExplicitlySignedOut && !mobileAuthUser;
  const isProfileIncomplete = !validateMobileUserProfile(userProfile).valid;
  const isDark = themeMode === 'dark';

  const [vertical, setVertical] = useState<LariBusinessVertical | 'all'>('all');
  const [queryText, setQueryText] = useState('');
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [googleVerifiedOnly, setGoogleVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [showRadarMap, setShowRadarMap] = useState(true);
  const [expandedMapOpen, setExpandedMapOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedMapPinSlug, setSelectedMapPinSlug] = useState<string>(
    'atelier-nisantasi'
  );
  const [storefrontDrawerListing, setStorefrontDrawerListing] =
    useState<MobileDiscoveryListingItem | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceFallbackOpen, setVoiceFallbackOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(
    'Mikrofona dokunun veya hazır aramalardan birini seçin.'
  );
  const recognitionRef = useRef<VoiceRecognitionController | null>(null);

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

  const mapItems = searchMobileMarketplace({
    listings: DEFAULT_MOBILE_MARKETPLACE_LISTINGS,
    userCoords,
    sortBy: userCoords ? 'distance_km' : 'rating',
  }).items;

  const rebook = buildOneTapRebookCandidate(pastAppointments);
  const pinnedItem =
    mapItems.find((i) => i.slug === selectedMapPinSlug) || mapItems[0];
  const orderedMapPins = pinnedItem
    ? [pinnedItem, ...mapItems.filter((item) => item.slug !== pinnedItem.slug)]
    : mapItems;

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

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
    },
    []
  );

  const handleVoiceSearch = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceStatus('Dinleme durduruldu. Tekrar deneyebilir veya hazır arama seçebilirsiniz.');
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: VoiceRecognitionConstructor;
      webkitSpeechRecognition?: VoiceRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceFallbackOpen(true);
      setVoiceStatus(
        'Bu tarayıcı ses tanımayı desteklemiyor. Hazır aramalardan birini seçebilirsiniz.'
      );
      showToast('Sesli arama bu cihazda desteklenmiyor; hızlı arama seçenekleri açıldı.');
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }

      const recognition = new Recognition();
      recognition.lang = 'tr-TR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) {
          setQueryText(transcript);
          setVoiceStatus(`Algılandı: “${transcript}”`);
          setVoiceFallbackOpen(false);
          showToast(`Sesli arama: "${transcript}"`);
        }
        setIsListening(false);
      };
      recognition.onerror = (event) => {
        const permissionDenied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
        setIsListening(false);
        setVoiceFallbackOpen(true);
        setVoiceStatus(
          permissionDenied
            ? 'Mikrofon izni verilmedi. Tarayıcı ayarlarından mikrofon erişimine izin verin.'
            : 'Ses anlaşılamadı. Yeniden deneyin veya hazır aramalardan birini seçin.'
        );
        showToast(
          permissionDenied
            ? 'Mikrofon izni gerekli. Lütfen cihaz ayarlarından izin verin.'
            : 'Sesli arama tamamlanamadı; tekrar deneyebilirsiniz.'
        );
      };
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      setVoiceFallbackOpen(false);
      setVoiceStatus('Dinleniyor… Aramak istediğiniz işletmeyi veya hizmeti söyleyin.');
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceFallbackOpen(true);
      setVoiceStatus(
        'Mikrofona erişilemedi. İzinleri kontrol edin veya hazır aramalardan birini seçin.'
      );
      showToast('Mikrofon izni gerekli. Lütfen cihaz ayarlarından izin verin.');
    }
  };

  return (
    <div className="space-y-5 pb-28" data-testid="mobile-explore-marketplace-page">
      {showGuestAuthBanner && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-3.5 py-2.5 ${
            isDark
              ? 'border-indigo-500/40 bg-slate-900 text-indigo-100'
              : 'border-indigo-200 bg-[#EEF2FF] text-[#312E81]'
          }`}
          data-testid="explore-auth-cta-card"
        >
          <div className="min-w-0">
            <p className="text-xs font-black">Misafir Modundasınız</p>
            <p className="text-[11px] opacity-85 truncate">
              Gmail, Apple veya e-posta ile giriş yapıp üye olabilirsiniz.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="min-h-[44px] rounded-xl bg-[#4F46E5] px-3 py-1.5 text-[11px] font-black text-white"
              data-testid="explore-auth-login-btn"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="min-h-[44px] rounded-xl border-2 border-[#4F46E5] bg-white px-2.5 py-1 text-[11px] font-black text-[#4338CA]"
              data-testid="explore-auth-register-btn"
            >
              Üye Ol
            </button>
          </div>
        </div>
      )}
      {isProfileIncomplete && onOpenProfile && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-3.5 py-2.5 ${
            isDark
              ? 'border-indigo-500/40 bg-indigo-950/50 text-indigo-100'
              : 'border-indigo-200 bg-[#EEF2FF] text-[#312E81]'
          }`}
          data-testid="explore-profile-completion-banner"
        >
          <div className="min-w-0">
            <p className="text-xs font-black">
              Hızlı Randevu İçin Profilinizi Tamamlayın
            </p>
            <p className="text-[11px] opacity-85 truncate">
              Ad, e-posta ve telefon ekleyerek 3 saniyede randevu alın. Misafir gezinme açık.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenProfile}
            className="min-h-[44px] shrink-0 rounded-xl bg-[#4F46E5] px-3 py-1.5 text-[11px] font-black text-white"
            data-testid="explore-complete-profile-btn"
          >
            Tamamla
          </button>
        </div>
      )}
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
            <div
              className={`flex-1 min-w-0 flex items-center gap-2 rounded-2xl border-2 px-3 min-h-[46px] ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder={
                  language === 'tr'
                    ? 'Salon, klinik, oto servis veya işlem...'
                    : 'Search salon, clinic, auto service...'
                }
                className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder-slate-400"
                data-testid="explore-search-input"
              />
              {queryText && (
                <button
                  type="button"
                  onClick={() => setQueryText('')}
                  aria-label="Aramayı temizle"
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  data-testid="explore-search-clear-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                aria-label={isListening ? 'Sesli aramayı durdur' : 'Sesli aramayı başlat'}
                aria-pressed={isListening}
                onClick={() => void handleVoiceSearch()}
                className={`relative flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl transition ${
                  isListening
                    ? 'animate-pulse bg-rose-500 text-white ring-4 ring-rose-200 dark:ring-rose-900'
                    : 'bg-[#EEF2FF] text-[#4F46E5] hover:bg-indigo-100'
                }`}
                data-testid="explore-voice-search-btn"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              aria-label="Filtreleri aç"
              className={`relative h-[46px] w-[46px] shrink-0 justify-center p-0 rounded-2xl border-2 flex items-center ${
                activeFilterCount > 0
                  ? 'bg-[#4F46E5] text-white border-[#4338CA]'
                  : isDark
                    ? 'bg-slate-900 text-slate-200 border-slate-700'
                    : 'bg-white text-slate-800 border-slate-300'
              }`}
              data-testid="explore-filter-drawer-btn"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRadarMap((v) => !v)}
              aria-label={showRadarMap ? 'Haritayı gizle' : 'Haritayı göster'}
              className={`h-[46px] w-[46px] shrink-0 justify-center p-0 rounded-2xl border-2 flex items-center ${
                showRadarMap
                  ? 'bg-[#EEF2FF] text-[#4338CA] border-[#4F46E5]'
                  : isDark
                    ? 'bg-slate-900 text-slate-200 border-slate-700'
                    : 'bg-white text-slate-800 border-slate-300'
              }`}
              data-testid="explore-radar-map-toggle"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>

          {voiceFallbackOpen && (
            <div
              className={`rounded-2xl border-2 p-3.5 ${innerSurface}`}
              data-testid="voice-search-fallback-bar"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#4F46E5]">Sesli Arama Yardımcısı</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {voiceStatus}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVoiceFallbackOpen(false)}
                  aria-label="Sesli arama yardımcısını kapat"
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Maslak oto servis', 'Soft Balayage', 'Kadıköy diş'].map((voiceQuery) => (
                  <button
                    key={voiceQuery}
                    type="button"
                    onClick={() => {
                      setQueryText(voiceQuery);
                      setVoiceFallbackOpen(false);
                      showToast(`Sesli arama: "${voiceQuery}"`);
                    }}
                    className="min-h-[44px] rounded-full border-2 border-indigo-200 bg-white px-3 py-1.5 text-xs font-black text-[#4338CA] dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-200"
                  >
                    {voiceQuery}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void handleVoiceSearch()}
                  className="flex min-h-[44px] items-center gap-1 rounded-full bg-[#4F46E5] px-3 py-1.5 text-xs font-black text-white"
                >
                  <Mic className="h-3.5 w-3.5" /> Mikrofonu Yeniden Dene
                </button>
              </div>
            </div>
          )}

          {/* Clean Visual Bento Category Grid (Zero Redundant Sub-Pills!) */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-wide uppercase">
                SEKTÖR & KATEGORİLER
              </h2>
              <div className="flex items-center gap-2">
                {selectedCategoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setVertical('all');
                    }}
                    className="min-h-[44px] text-xs font-bold text-slate-500 underline"
                  >
                    Filtreyi Temizle
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAllCategories((current) => !current)}
                  className="min-h-[44px] text-xs font-black text-[#4F46E5]"
                  data-testid="category-visibility-toggle"
                >
                  {showAllCategories ? 'Daha Az Gör' : 'Tümünü Gör'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {(showAllCategories
                ? MOBILE_CATEGORY_OPTIONS
                : MOBILE_CATEGORY_OPTIONS.slice(0, 6)
              ).map((category) => {
                const artwork = MOBILE_CATEGORY_ARTWORKS[category.visualId];
                const isActiveCat = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(isActiveCat ? null : category.id);
                      setVertical(isActiveCat ? 'all' : category.vertical);
                    }}
                    className={`relative h-28 overflow-hidden rounded-2xl border-2 text-left transition shadow-xs ${
                      isActiveCat
                        ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/30'
                        : 'border-white/60 dark:border-slate-700'
                    }`}
                    data-testid={`category-card-${category.id}`}
                  >
                    <img
                      src={artwork.photoUrl}
                      alt={artwork.alt}
                      onError={(event) => {
                        if (event.currentTarget.src !== artwork.svgUrl) {
                          event.currentTarget.src = artwork.svgUrl;
                        }
                      }}
                      className="absolute inset-0 h-full w-full object-cover bg-slate-100"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <span
                      className="absolute inset-x-0 bottom-0 z-10 block px-2.5 py-2.5 text-xs font-black leading-tight text-white"
                    >
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Real Google Maps Container + Google Business Profile Integration */}
          {showRadarMap && mapItems.length > 0 && pinnedItem && (
            <div
              className={`rounded-3xl overflow-hidden shadow-sm ${cardSurface}`}
              data-testid="interactive-radar-map-card"
            >
              {/* Google Maps Venue Selector Bar */}
              <div className="p-3 border-b-2 border-slate-200 dark:border-slate-700 flex items-center">
                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-2">
                  {orderedMapPins.map((pin) => {
                    const isSelectedPin = pinnedItem.slug === pin.slug;
                    return (
                      <button
                        key={pin.slug}
                        type="button"
                        onClick={() => setSelectedMapPinSlug(pin.slug)}
                        className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border-2 whitespace-nowrap transition flex items-center gap-1 ${
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
                        {pin.isSponsored ? (
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="shrink-0 pl-2.5 ml-1 border-l-2 border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setGpsEnabled((prev) => !prev)}
                    className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 flex items-center gap-1 shrink-0 ${
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
                <button
                  type="button"
                  onClick={() => setExpandedMapOpen(true)}
                  className="absolute right-2.5 top-2.5 flex min-h-[44px] items-center gap-1 rounded-xl border-2 border-indigo-200 bg-white/95 px-2.5 py-1.5 text-xs font-black text-[#4338CA] shadow-sm"
                  data-testid="explore-expand-map-btn"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Haritayı Büyüt
                </button>
              </div>

              {/* Selected Google Business Pin Card */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">{pinnedItem.name}</p>
                  <p className="text-xs text-emerald-700 font-bold truncate mt-0.5">
                    İlk Müsait: {pinnedItem.nextAvailableSlot} •{' '}
                    {convertFromTryMajor(
                      pinnedItem.popularServices[0]?.priceMajor || 0,
                      selectedCurrency
                    ).toLocaleString('tr-TR')}{' '}
                    {selectedCurrency}
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
                    className="min-h-[44px] px-2.5 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 text-xs font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Yol Tarifi
                  </a>
                  <button
                    type="button"
                    onClick={() => setStorefrontDrawerListing(pinnedItem)}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold"
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
                  <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                    <span
                      className={`rounded-full border-2 px-3 py-1 text-xs font-bold shadow-sm ${accent.pillClass}`}
                    >
                      {accent.badgeTr}
                    </span>
                    {item.isSponsored ? (
                      <span className="rounded-full border-2 border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900 shadow-sm">
                        {item.sponsorTagTr || 'Sponsorlu'}
                      </span>
                    ) : null}
                  </div>
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
                      {convertFromTryMajor(
                        item.popularServices[0].priceMajor,
                        selectedCurrency
                      ).toLocaleString('tr-TR')}{' '}
                      {selectedCurrency}
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
        <section
          className="relative overflow-hidden rounded-3xl border-2 border-indigo-300 bg-gradient-to-br from-[#EEF2FF] via-white to-violet-50 p-5 text-slate-900 shadow-sm dark:border-indigo-700 dark:from-indigo-950 dark:via-slate-900 dark:to-violet-950 dark:text-white"
          data-testid="explore-partner-invite-card"
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-300/30 blur-2xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[10px] font-black tracking-wider text-[#4338CA] dark:border-indigo-700 dark:bg-slate-900/70 dark:text-indigo-300">
              <Store className="h-3.5 w-3.5" />
              90 GÜN ÜCRETSİZ DENEME • BAŞLANGIÇ 999 TRY
            </span>
            <h2 className="mt-3 text-xl font-black leading-tight">
              90 Gün Ücretsiz Deneyin: İşletmenizi 2 Dakikada LARİ’ye Taşıyın
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Daha çok randevu alın, tahsilatı hızlandırın ve işletmenizi tek ekrandan büyütün.
              Canlı web vitrininizi hemen önizleyin.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                '%0 Komisyon QR Mağaza',
                'Canlı Web Vitrin Önizleme',
                'Cep POS',
                'Otomatik Hatırlatma & Takvim',
              ].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-indigo-200 bg-white/80 px-2.5 py-1 text-[10px] font-black text-[#4338CA] dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-300"
                >
                  {badge}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onOpenPartnerOnboarding?.()}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200/40 dark:shadow-none"
              data-testid="explore-open-partner-onboarding-btn"
            >
              90 Gün Ücretsiz Dene & Vitrinini Oluştur
              <LayoutDashboard className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {expandedMapOpen && pinnedItem && (
        <div
          className={`fixed inset-0 z-[95] flex flex-col ${
            isDark ? 'bg-slate-950 text-white' : 'bg-[#F8F9FB] text-slate-900'
          }`}
          data-testid="explore-expanded-map-modal"
        >
          <div className="flex items-center justify-between gap-3 border-b-2 border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4F46E5]">
                Tüm LARİ İşletmeleri
              </p>
              <h2 className="text-lg font-black">Yakındaki İşletme Haritası</h2>
            </div>
            <button
              type="button"
              onClick={() => setExpandedMapOpen(false)}
              aria-label="Büyük haritayı kapat"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              data-testid="explore-expanded-map-close-btn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b-2 border-slate-200 px-3 py-2.5 no-scrollbar dark:border-slate-700">
            {orderedMapPins.map((pin) => (
              <button
                key={pin.slug}
                type="button"
                onClick={() => setSelectedMapPinSlug(pin.slug)}
                className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-2 text-xs font-black ${
                  pinnedItem.slug === pin.slug
                    ? 'border-[#4338CA] bg-[#4F46E5] text-white'
                    : isDark
                      ? 'border-slate-600 bg-slate-800 text-slate-200'
                      : 'border-slate-300 bg-white text-slate-700'
                }`}
                data-testid={`expanded-map-pin-${pin.slug}`}
              >
                <MapPin className="h-3.5 w-3.5" />
                {pin.district}
                {pin.isSponsored ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-900">
                    Sponsorlu
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="relative min-h-[48vh] flex-1 bg-slate-200">
            <iframe
              title={`Büyük Google Maps - ${pinnedItem.name}`}
              src={`https://maps.google.com/maps?q=${pinnedItem.latitude},${pinnedItem.longitude}&z=15&output=embed`}
              className="h-full min-h-[48vh] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {pinnedItem.isSponsored ? (
              <span className="absolute left-3 top-3 rounded-full border-2 border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900 shadow-sm">
                {pinnedItem.sponsorTagTr || 'Sponsorlu'}
              </span>
            ) : null}
          </div>

          <div className="rounded-t-3xl border-t-2 border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black">{pinnedItem.name}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {pinnedItem.district} • ⭐ {pinnedItem.rating} • İlk müsait {pinnedItem.nextAvailableSlot}
                </p>
              </div>
              {pinnedItem.googleBusinessProfile?.verifiedGoogleBusiness ? (
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <a
                href={
                  pinnedItem.googleBusinessProfile?.mapsUri ||
                  `https://www.google.com/maps/search/?api=1&query=${pinnedItem.latitude},${pinnedItem.longitude}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-center gap-1 rounded-2xl border-2 border-slate-300 bg-white px-2 text-center text-xs font-black text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Yol Tarifi
              </a>
              <button
                type="button"
                onClick={() => {
                  setExpandedMapOpen(false);
                  setStorefrontDrawerListing(pinnedItem);
                }}
                className="min-h-12 rounded-2xl border-2 border-[#4F46E5] px-2 text-xs font-black text-[#4338CA] dark:text-indigo-200"
                data-testid="expanded-map-open-storefront-btn"
              >
                Vitrine Gir
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpandedMapOpen(false);
                  onOpenBookingSheet?.(pinnedItem);
                }}
                className="min-h-12 rounded-2xl bg-[#4F46E5] px-2 text-xs font-black text-white"
                data-testid="expanded-map-open-booking-btn"
              >
                Randevu Al
              </button>
            </div>
          </div>
        </div>
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
                className="min-h-[44px] min-w-[44px] rounded-full bg-slate-100 text-slate-700 flex items-center justify-center"
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
                    className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold border-2 text-left ${
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
                    className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border-2 ${
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
                  setSelectedCategoryId(null);
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
