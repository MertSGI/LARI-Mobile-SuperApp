import React, { useState } from 'react';
import {
  Award,
  CalendarPlus,
  Check,
  Clock,
  Coffee,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  VolumeX,
  X,
} from 'lucide-react';
import { MobileDiscoveryListingItem } from '../../../services/mobile/mobileDiscoveryService';

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
  accentGradient: string;
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
        durationMinutes: 60,
        priceMajor: 4500,
        currency: 'TRY' as const,
      },
      {
        id: 'srv-pano-checkup',
        name: '3D Panoramik Görüntüleme & Konsültasyon',
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
        durationMinutes: 90,
        priceMajor: 2200,
        currency: 'TRY' as const,
      },
      {
        id: 'srv-black-mask',
        name: 'Buharlı Gözenek Temizliği & Siyah Maske',
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
      durationMinutes: 75,
      priceMajor: 2600,
      currency: 'TRY' as const,
    },
    {
      id: 'srv-brow-lamination',
      name: 'Kaş Laminasyonu & İpek Kirpik Lifting',
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
    accentGradient: 'from-amber-600/40 via-rose-600/30 to-slate-900',
  },
  {
    id: 'lb-2',
    titleTr: 'Doğal Oranlı Dijital Gülüş (OM1)',
    formulaOrProtocolTr: 'Protokol: 3D Dijital Mockup + 10 Üye E-Max Lamina Önizleme',
    durationMinutes: 60,
    beforeLabelTr: 'ÖNCE: Asimetrik Diş Hattı',
    afterLabelTr: 'SONRA: Dudak Uyumlu Doğal Gülüş',
    accentGradient: 'from-cyan-600/40 via-blue-600/30 to-slate-900',
  },
];

export const MobileStorefrontDetailDrawer: React.FC<
  MobileStorefrontDetailDrawerProps
> = ({ listing, onClose, onProceedToBooking }) => {
  const [activeTab, setActiveTab] = useState<
    'services' | 'specialists' | 'portfolio' | 'hospitality'
  >('services');
  const services = getExtraServicesForListing(listing);
  const specialists = getSpecialistsForVertical(listing.vertical);

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

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur-xl flex flex-col overflow-hidden"
      data-testid="mobile-storefront-detail-drawer"
    >
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-b border-slate-800 p-4 pt-5 shrink-0">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Doğrulanmış LARİ Partner
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Star className="w-3 h-3 fill-amber-300" />
                  {listing.rating} ({listing.reviewCount} doğrulama)
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1.5">
                {listing.name}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                {listing.district}, {listing.city} • En yakın saat:{' '}
                <strong className="text-emerald-300">
                  {listing.nextAvailableSlot}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800/90 text-slate-200 flex items-center justify-center border border-slate-700"
              data-testid="close-storefront-drawer-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Hospitality & App-Exclusive Perks Strip */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-semibold text-slate-300 whitespace-nowrap">
              <Coffee className="w-3 h-3 text-amber-400" />
              Ücretsiz Barista Kahve & Matcha
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-semibold text-slate-300 whitespace-nowrap">
              <VolumeX className="w-3 h-3 text-indigo-400" />
              Sessiz Seans Seçeneği
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-semibold text-slate-300 whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-pink-400" />
              Formül Pasaporta İşlenir
            </span>
          </div>

          {/* 4 Storefront Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
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
                className={`py-2 rounded-lg text-[11px] font-bold transition ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                data-testid={`storefront-tab-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Drawer Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto space-y-3 pb-24">
          {activeTab === 'services' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400">
                Birden fazla hizmeti kombine ederek tek randevuda birleştirebilirsin:
              </p>
              {services.map((srv) => {
                const isSelected = selectedServiceIds.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className={`w-full text-left rounded-2xl p-3.5 border transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-950/50 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                    data-testid={`storefront-service-item-${srv.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{srv.name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {srv.durationMinutes} dk •
                        Pasaporta formül kaydı dahil
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-black text-white">
                        {srv.priceMajor} {srv.currency}
                      </span>
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'border-slate-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
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
                    className={`rounded-2xl p-4 border cursor-pointer transition space-y-2 ${
                      isPicked
                        ? 'bg-indigo-950/50 border-indigo-500'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                    data-testid={`storefront-specialist-${sp.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm">
                          {sp.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">
                            {sp.name}
                          </h4>
                          <p className="text-[11px] text-indigo-300">
                            {sp.titleTr}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-300" />
                        {sp.rating}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {sp.signatureNoteTr}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>{sp.experienceYears} Yıl Deneyim • {sp.reviewCount} Değerlendirme</span>
                      <span className="font-bold text-blue-400">
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
                  className={`rounded-2xl bg-gradient-to-br ${item.accentGradient} border border-slate-800 p-4 space-y-2.5`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {item.titleTr}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white">
                      {item.durationMinutes} dk işlem
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-center">
                      <span className="text-[10px] font-bold text-rose-300 block">
                        {item.beforeLabelTr}
                      </span>
                    </div>
                    <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-center">
                      <span className="text-[10px] font-bold text-emerald-300 block">
                        {item.afterLabelTr}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono bg-black/30 p-2 rounded-lg">
                    {item.formulaOrProtocolTr}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hospitality' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  Uygulamaya Özel VIP Karşılama Standartları
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Randevunuzu uygulama üzerinden aldığınızda salona girmeden kahve/içecek tercihinizi ve &ldquo;Sessiz Seans&rdquo; isteğinizi belirleyebilirsiniz. Uzmanınız koltuğunuzu tercihinize göre hazırlar.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Zeynep K. • Doğrulanmış QR Check-in Müşterisi
                  </span>
                  <span className="text-xs font-bold text-amber-300">★★★★★ 5.0</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  &ldquo;Uygulamadan filtre kahvemi ve sessiz seans istediğimi seçip girdim. Kapıdan girdiğimde kahvem hazırdı ve Merve Hanım geçen ayki boya formülümü pasaportumdan direkt gördü!&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bundle Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[85] bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 p-3.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block">
              {selectedServices.length} Hizmet • {totalMinutes} dk •{' '}
              {selectedSpecialist.name}
            </span>
            <span className="text-base font-black text-white">
              {totalPrice} TRY
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
            style={{ minHeight: '46px' }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-600/30"
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
