import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  ImagePlus,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Palette,
  QrCode,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  X,
} from 'lucide-react';
import {
  useMobileAppSession,
  UpgradePartnerInput,
} from '../../../contexts/MobileAppSessionContext';
import {
  BillingPeriod,
  planService,
  PricingPlan,
} from '../../../services/planService';
import {
  convertFromTryMajor,
  sanitizePhoneDigits,
  validatePartnerRegistrationContact,
} from '../../../services/mobile/mobileRegionCurrencyService';

interface MobilePartnerOnboardingFunnelProps {
  onClose: () => void;
  onCompleted: (result: { switchToPartnerMode: boolean }) => void;
}

type FunnelStep = 1 | 2 | 3 | 4;
type PreviewTab = 'storefront' | 'management';

const SECTORS = [
  'Güzellik & Saç',
  'Oto Servis',
  'Diş Kliniği',
  'Berber',
  'Spa & Masaj',
  'Medikal Estetik',
];

const SIGNATURE_COLORS = ['#4F46E5', '#7C3AED', '#DB2777', '#0F766E', '#EA580C'];

const COVER_PRESETS = [
  {
    label: 'Modern Stüdyo',
    url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Premium Klinik',
    url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=85',
  },
  {
    label: 'Usta Atölyesi',
    url: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=85',
  },
];

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

const VALUE_PROPOSITIONS = [
  {
    title: '7/24 Randevu ile Boş Saatleri Doldurun',
    description: 'Müşterileriniz siz uyurken bile hizmet, uzman ve uygun saat seçerek randevu alsın.',
    icon: Clock3,
  },
  {
    title: '%0 Komisyon QR Mağaza',
    description: 'Kendi müşterinizden komisyon kesilmez; QR bağlantınız doğrudan canlı web vitrininizi açar.',
    icon: MapPin,
  },
  {
    title: 'Sesli Katalog + Cep POS',
    description: 'İşlemleri sesle ekleyin, fiyat dökümünü oluşturun ve tahsilatı cebinizden tamamlayın.',
    icon: QrCode,
  },
  {
    title: 'Ciro ve Performans Raporları',
    description: 'Günlükten 3 aylığa raporlarla kazancınızı, hizmetleri ve ekibinizi tek ekranda büyütün.',
    icon: BarChart3,
  },
];

const inputClass =
  'w-full min-h-11 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#4F46E5] dark:border-slate-700 dark:bg-slate-800 dark:text-white';

const formatTry = (amount: number) => amount.toLocaleString('tr-TR');

const getPlanFeatures = (plan: PricingPlan) => [
  `${plan.maxStaff} personel`,
  `${plan.maxServices} hizmet`,
  plan.aiRecommendationsEnabled
    ? `AI önerileri${plan.aiMonthlyQuota ? ` • ${formatTry(plan.aiMonthlyQuota)} hak` : ''}`
    : 'Temel dijital vitrin',
  plan.campaignsEnabled ? 'Kampanya yönetimi' : 'Google Takvim entegrasyonu',
  plan.whatsappAutomationEnabled ? 'WhatsApp otomasyonu' : 'WhatsApp paylaşım bağlantısı',
];

export const MobilePartnerOnboardingFunnel: React.FC<
  MobilePartnerOnboardingFunnelProps
> = ({ onClose, onCompleted }) => {
  const { themeMode, selectedCurrency, showToast, upgradeToPartnerAccount } =
    useMobileAppSession();
  const isDark = themeMode === 'dark';
  const plans = useMemo(
    () => planService.getActivePlans(),
    []
  );
  const starterPlan = plans.find((plan) => plan.id === 'baslangic') ?? plans[0];
  const [step, setStep] = useState<FunnelStep>(1);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('storefront');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Lüks Stüdyo Kadıköy');
  const [sector, setSector] = useState(SECTORS[0]);
  const [location, setLocation] = useState('İstanbul / Kadıköy');
  const [signatureColor, setSignatureColor] = useState(SIGNATURE_COLORS[0]);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [coverPhotoFailed, setCoverPhotoFailed] = useState(false);
  const [tagline, setTagline] = useState(
    'Kendinizi iyi hissettiren dokunuşlar, size özel randevu deneyimi.'
  );
  const [whatsappNumber, setWhatsappNumber] = useState('905321234567');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vkn, setVkn] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(true);
  const [checkoutAttempted, setCheckoutAttempted] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [serviceName, setServiceName] = useState('İmza Bakım');
  const [servicePrice, setServicePrice] = useState('1800');
  const [serviceDuration, setServiceDuration] = useState('60');
  const [staffName, setStaffName] = useState('Ayşe Yılmaz');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('20:00');
  const [activationPending, setActivationPending] = useState(false);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const locationParts = location.split('/').map((part) => part.trim()).filter(Boolean);
  const city = locationParts[0] || 'İstanbul';
  const district = locationParts[1] || 'Kadıköy';
  const registrationValidation = useMemo(
    () =>
      validatePartnerRegistrationContact({
        ownerName,
        businessName,
        phone,
        email,
        vkn,
      }),
    [businessName, email, ownerName, phone, vkn]
  );
  const canCheckout = Boolean(
    selectedPlan && registrationValidation.valid && nameConfirmed && kvkkAccepted
  );

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      showToast('Yalnızca JPEG, PNG, WebP veya SVG görseller yüklenebilir.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      showToast('Görsel boyutu en fazla 5 MB olabilir.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverPhotoUrl(reader.result);
        setCoverPhotoFailed(false);
      }
    };
    reader.onerror = () => showToast('Görsel okunamadı. Lütfen yeniden deneyin.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleBack = () => {
    if (step === 1) {
      onClose();
      return;
    }
    setStep((current) => Math.max(1, current - 1) as FunnelStep);
  };

  const completeOnboarding = async (switchToPartnerMode: boolean) => {
    if (!selectedPlan) return;
    const upgradeInput: UpgradePartnerInput = {
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      billingPeriod,
      businessName: businessName.trim(),
      category: sector,
      city,
      district,
      ownerName: ownerName.trim(),
      ownerEmail: email.trim(),
      ownerPhone: phone,
      staffName: staffName.trim() || undefined,
      vkn,
      accentColor: signatureColor,
      coverPhotoUrl: coverPhotoUrl.trim(),
      tagline: tagline.trim(),
      whatsappNumber,
      trialDays: selectedPlan.trialDays,
      initialServiceName: serviceName.trim() || undefined,
      initialServicePrice: Number(servicePrice) || undefined,
      initialServiceDuration: Number(serviceDuration) || undefined,
    };
    setActivationPending(true);
    const result = await upgradeToPartnerAccount(upgradeInput);
    setActivationPending(false);
    if (!result.success) {
      if (result.requiresCheckout && result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
      }
      return;
    }
    onCompleted({ switchToPartnerMode });
  };

  const cardSurface = isDark
    ? 'border-slate-700 bg-slate-900 text-white'
    : 'border-slate-200 bg-white text-slate-900';
  const softSurface = isDark
    ? 'border-slate-700 bg-slate-800/80'
    : 'border-slate-200 bg-slate-50';

  return (
    <div
      className={`fixed inset-0 z-[92] overflow-y-auto ${
        isDark ? 'bg-slate-950 text-white' : 'bg-[#F8FAFC] text-slate-900'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="LARİ Partner hızlı kurulum"
      data-testid="mobile-partner-onboarding-funnel"
    >
      <header
        className={`sticky top-0 z-10 border-b-2 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl ${
          isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'
        }`}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${softSurface}`}
            aria-label={step === 1 ? 'Partner akışını kapat' : 'Önceki adıma dön'}
            data-testid="partner-funnel-back-btn"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] bg-clip-text text-sm font-black text-transparent">
              LARİ PARTNER EKOSİSTEMİ
            </p>
            <p className="text-[11px] font-bold text-slate-500">İşletmeni 4 adımda yayına al</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${softSurface}`}
            aria-label="Kapat"
            data-testid="partner-funnel-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-auto mt-3 grid max-w-lg grid-cols-4 gap-1.5" aria-label={`4 adımın ${step}. adımı`}>
          {[1, 2, 3, 4].map((item) => (
            <span
              key={item}
              className={`h-2 rounded-full transition-colors ${
                item <= step ? 'bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6]' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {step === 1 ? (
          <section className="space-y-4" data-testid="partner-funnel-step-showcase">
            <div className={`overflow-hidden rounded-3xl border-2 shadow-sm ${cardSurface}`}>
              <div className="bg-gradient-to-br from-[#312E81] via-[#4F46E5] to-[#8B5CF6] p-5 text-white">
                <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-black tracking-wider">
                  BAŞLANGIÇ PAKETİNDE {starterPlan?.trialDays || 0} GÜN ÜCRETSİZ DENEME
                </span>
                <h1 className="mt-3 text-2xl font-black leading-tight">
                  İşletmenizi 2 dakikada LARİ’ye taşıyın, daha çok randevuya ulaşın.
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-indigo-100">
                  Başlangıç paketini {starterPlan?.trialDays || 0} gün ücretsiz deneyin; canlı vitrininizi, ajandanızı ve
                  tahsilatınızı tek uygulamadan yönetin.
                </p>
              </div>
              <div className="space-y-2.5 p-4">
                {VALUE_PROPOSITIONS.map(({ title, description, icon: Icon }) => (
                  <div key={title} className={`flex gap-3 rounded-2xl border-2 p-3 ${softSurface}`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-sm font-black">{title}</h2>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-300">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200/50"
              data-testid="partner-funnel-open-preview-btn"
            >
              Kendi İşletmeni Önizle & Demo Gör
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="min-h-11 w-full text-sm font-black text-[#4F46E5] dark:text-indigo-300"
              data-testid="partner-funnel-skip-to-pricing-btn"
            >
              Abonelik Paketlerini Gör
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4" data-testid="partner-funnel-step-preview">
            <div>
              <span className="text-xs font-black text-[#4F46E5]">ADIM 2 • CANLI DEMO</span>
              <h1 className="mt-1 text-xl font-black">Kendi İşletmeni Önizle & Demo Gör</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Bilgileri değiştir; müşteri vitrinin ve yönetim ekranın anında işletmene dönüşsün.
              </p>
            </div>

            <div className={`space-y-3 rounded-3xl border-2 p-4 ${cardSurface}`}>
              <label className="block space-y-1 text-xs font-black">
                İşletme Adı
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  className={inputClass}
                  placeholder="Örn. Lüks Stüdyo Kadıköy"
                  data-testid="partner-funnel-business-name-input"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1 text-xs font-black">
                  Sektör
                  <select value={sector} onChange={(event) => setSector(event.target.value)} className={inputClass} data-testid="partner-funnel-sector-select">
                    {SECTORS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block space-y-1 text-xs font-black">
                  İl / İlçe
                  <input value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass} data-testid="partner-funnel-location-input" />
                </label>
              </div>
              <label className="block space-y-1 text-xs font-black">
                Tanıtım Sloganı / Açıklaması
                <textarea
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  className={`${inputClass} min-h-20 resize-none`}
                  maxLength={180}
                  placeholder="Müşterilerinize işletmenizi kısaca anlatın"
                  data-testid="partner-funnel-tagline-input"
                />
              </label>
              <label className="block space-y-1 text-xs font-black">
                WhatsApp Hattı
                <input
                  value={whatsappNumber}
                  onChange={(event) =>
                    setWhatsappNumber(sanitizePhoneDigits(event.target.value, 15))
                  }
                  className={inputClass}
                  inputMode="numeric"
                  placeholder="905321234567"
                  data-testid="partner-funnel-whatsapp-input"
                />
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black">Kapak Fotoğrafı</span>
                  <label className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-indigo-200 px-3 text-[10px] font-black text-[#4338CA] dark:border-indigo-700 dark:text-indigo-300">
                    <ImagePlus className="h-3.5 w-3.5" /> Cihazdan Yükle
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="sr-only"
                      onChange={handleCoverFileChange}
                      data-testid="partner-funnel-cover-file-input"
                    />
                  </label>
                </div>
                <input
                  type="url"
                  value={coverPhotoUrl.startsWith('data:') ? '' : coverPhotoUrl}
                  onChange={(event) => {
                    setCoverPhotoUrl(event.target.value);
                    setCoverPhotoFailed(false);
                  }}
                  className={inputClass}
                  placeholder="Fotoğraf URL'si (isteğe bağlı)"
                  data-testid="partner-funnel-cover-url-input"
                />
                <div className="grid grid-cols-3 gap-2" aria-label="Hazır kapak temaları">
                  {COVER_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCoverPhotoUrl(preset.url);
                        setCoverPhotoFailed(false);
                      }}
                      className={`relative h-16 overflow-hidden rounded-xl border-2 ${
                        coverPhotoUrl === preset.url
                          ? 'border-[#4F46E5]'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                      aria-pressed={coverPhotoUrl === preset.url}
                    >
                      <img src={preset.url} alt="" className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 px-1 py-1 text-[8px] font-black text-white">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Boş bırakırsanız sektörünüze uygun kurumsal bir kapak otomatik gösterilir.
                </p>
              </div>
              <fieldset>
                <legend className="mb-2 text-xs font-black">İmza Rengi</legend>
                <div className="flex gap-2">
                  {SIGNATURE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSignatureColor(color)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${signatureColor === color ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`${color} imza rengini seç`}
                      aria-pressed={signatureColor === color}
                    >
                      {signatureColor === color ? <Check className="h-5 w-5 text-white" /> : null}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className={`rounded-3xl border-2 p-3 ${cardSurface}`}>
              <div className={`grid grid-cols-2 gap-1.5 rounded-2xl border-2 p-1.5 ${softSurface}`}>
                <button type="button" onClick={() => setPreviewTab('storefront')} className={`min-h-10 rounded-xl px-2 text-xs font-black ${previewTab === 'storefront' ? 'bg-white text-[#4338CA] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`} aria-pressed={previewTab === 'storefront'} data-testid="partner-funnel-preview-storefront-tab">Müşteri Vitrininiz</button>
                <button type="button" onClick={() => setPreviewTab('management')} className={`min-h-10 rounded-xl px-2 text-xs font-black ${previewTab === 'management' ? 'bg-white text-[#4338CA] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`} aria-pressed={previewTab === 'management'} data-testid="partner-funnel-preview-management-tab">Partner Yönetim Ekranı</button>
              </div>

              {previewTab === 'storefront' ? (
                <div
                  className="mt-3 max-h-[430px] overflow-y-auto rounded-2xl border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                  data-testid="partner-funnel-storefront-preview"
                >
                  <div className="relative h-44 overflow-hidden text-white">
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(135deg, ${signatureColor}, #111827)` }}
                    />
                    {coverPhotoUrl && !coverPhotoFailed ? (
                      <img
                        src={coverPhotoUrl}
                        alt={`${businessName || 'İşletme'} kapak`}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={() => setCoverPhotoFailed(true)}
                      />
                    ) : (
                      <div className="absolute inset-0 opacity-50">
                        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-white/20" />
                        <div className="absolute -bottom-10 left-4 h-28 w-28 rotate-12 rounded-3xl bg-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="rounded-full px-2 py-1 text-[9px] font-black text-white"
                          style={{ backgroundColor: signatureColor }}
                        >
                          %0 KOMİSYON QR MAĞAZA
                        </span>
                        <span className="rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-slate-900">
                          BUGÜN AÇIK
                        </span>
                      </div>
                      <h2 className="mt-2 text-xl font-black">{businessName || 'İşletmeniz'}</h2>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white/90">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> 4,9 (286) • {sector} • {district}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 p-3 text-slate-900 dark:text-white">
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {tagline.trim() || 'Kaliteli hizmet, kolay randevu ve size özel deneyim.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="min-h-10 rounded-xl text-[11px] font-black text-white"
                        style={{ backgroundColor: signatureColor }}
                      >
                        Hemen Randevu Al
                      </button>
                      <button
                        type="button"
                        className="flex min-h-10 items-center justify-center gap-1 rounded-xl border-2 text-[11px] font-black"
                        style={{ borderColor: signatureColor, color: signatureColor }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[10px] font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                      WhatsApp iletişim önizlemesi: +{whatsappNumber || '90 5XX XXX XX XX'}
                    </div>
                    <div>
                      <h3 className="text-xs font-black">Popüler Hizmetler</h3>
                      <div className="mt-2 space-y-2">
                        {['İmza Bakım', 'Premium Randevu', 'Hızlı Kontrol'].map((service, index) => (
                          <div
                            key={service}
                            className="flex items-center justify-between rounded-xl border-2 bg-slate-50 p-2.5 dark:bg-slate-900"
                            style={{ borderColor: `${signatureColor}66` }}
                          >
                            <div>
                              <span className="block text-xs font-black">{service}</span>
                              <span className="text-[9px] text-slate-500">45-60 dk • Bugün uygun</span>
                            </div>
                            <span className="text-xs font-black" style={{ color: signatureColor }}>
                              {formatTry(convertFromTryMajor(900 + index * 450, selectedCurrency))} {selectedCurrency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
                      <p className="text-[10px] font-black" style={{ color: signatureColor }}>MÜŞTERİLER NE DİYOR?</p>
                      <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                        “Randevumu saniyeler içinde aldım, hizmet ve fiyat bilgileri çok netti.”
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3" data-testid="partner-funnel-management-preview">
                  <div className="rounded-2xl p-4 text-white" style={{ backgroundColor: signatureColor }}>
                    <p className="text-[10px] font-black opacity-80">BUGÜN • {businessName || 'İşletmeniz'}</p>
                    <p className="mt-1 text-2xl font-black">12 Randevu</p>
                    <p className="text-xs opacity-90">Tahmini ciro: 24.800 TRY</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[['Ajanda', Clock3], ['QR Kabul', QrCode], ['Katalog', Store], ['Ciro', BarChart3]].map(([label, Icon]) => {
                      const PreviewIcon = Icon as typeof Clock3;
                      return <div key={label as string} className={`flex items-center gap-2 rounded-xl border-2 p-3 text-xs font-black ${softSurface}`}><PreviewIcon className="h-4 w-4 text-[#4F46E5]" />{label as string}</div>;
                    })}
                  </div>
                </div>
              )}
            </div>

            <button type="button" onClick={() => setStep(3)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-4 py-3 text-sm font-black text-white" data-testid="partner-funnel-preview-continue-btn">
              Bu bilgiler ile devam et
              <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4" data-testid="partner-funnel-step-pricing">
            <div>
              <span className="text-xs font-black text-[#4F46E5]">ADIM 3 • ABONELİK</span>
              <h1 className="mt-1 text-xl font-black">İşletmene uygun paketi seç.</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Tüm planlarda %0 mağaza komisyonu ve hızlı kurulum dahildir.</p>
              <p className="mt-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-xs font-black text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                {starterPlan?.trialDays || 0} gün deneme bilgisi ve {formatTry(starterPlan?.monthlyPrice || 0)} TRY/ay fiyatı planService tarafından yönetilir.
              </p>
            </div>

            <div className={`grid grid-cols-2 gap-1.5 rounded-2xl border-2 p-1.5 ${softSurface}`}>
              <button type="button" onClick={() => setBillingPeriod('monthly')} className={`min-h-11 rounded-xl text-xs font-black ${billingPeriod === 'monthly' ? 'bg-white text-[#4338CA] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`} aria-pressed={billingPeriod === 'monthly'} data-testid="partner-funnel-billing-monthly">Aylık</button>
              <button type="button" onClick={() => setBillingPeriod('annual')} className={`min-h-11 rounded-xl text-xs font-black ${billingPeriod === 'annual' ? 'bg-white text-[#4338CA] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`} aria-pressed={billingPeriod === 'annual'} data-testid="partner-funnel-billing-annual">Yıllık • %20 İndirim</button>
            </div>

            <div className="space-y-3">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                const monthlyDisplayTry = billingPeriod === 'annual' ? plan.annualPrice / 12 : plan.monthlyPrice;
                const monthlyDisplay = convertFromTryMajor(monthlyDisplayTry, selectedCurrency);
                const annualDisplay = convertFromTryMajor(plan.annualPrice, selectedCurrency);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative w-full rounded-3xl border-2 p-4 text-left transition ${
                      selected
                        ? 'border-[#4F46E5] bg-[#EEF2FF] shadow-md dark:bg-indigo-950/50'
                        : plan.isRecommended
                          ? 'border-violet-400 bg-white dark:bg-slate-900'
                          : cardSurface
                    }`}
                    aria-pressed={selected}
                    data-testid={`partner-funnel-plan-${plan.id}`}
                  >
                    {plan.isRecommended ? <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] px-3 py-1 text-[10px] font-black text-white">ÖNERİLEN</span> : null}
                    {plan.id === 'baslangic' ? (
                      <span className="mb-3 inline-flex rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-amber-950">
                        {plan.trialDays} Gün Ücretsiz Deneme • Sadece Başlangıç Paketinde
                      </span>
                    ) : null}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-black">{plan.name}</h2>
                        <p className="mt-1 text-2xl font-black text-[#4338CA] dark:text-indigo-300">{formatTry(monthlyDisplay)} {selectedCurrency}<span className="text-xs text-slate-500">/ay</span></p>
                        {billingPeriod === 'annual' ? <p className="text-[10px] font-bold text-emerald-600">Yıllık {formatTry(annualDisplay)} {selectedCurrency} faturalandırılır</p> : null}
                      </div>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${selected ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-slate-300'}`}>{selected ? <Check className="h-4 w-4" /> : null}</span>
                    </div>
                    <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {getPlanFeatures(plan).map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />{feature}</li>)}
                    </ul>
                  </button>
                );
              })}
            </div>

            {selectedPlan ? (
              <form
                className={`space-y-3 rounded-3xl border-2 p-4 ${cardSurface}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  setCheckoutAttempted(true);
                  if (canCheckout) setStep(4);
                }}
                noValidate
                data-testid="partner-funnel-checkout-form"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#4F46E5]" />
                  <div><h2 className="text-sm font-black">Güvenli kayıt & abonelik</h2><p className="text-[11px] text-slate-500">{selectedPlan.name} • {billingPeriod === 'annual' ? 'Yıllık' : 'Aylık'}</p></div>
                </div>
                <div>
                  <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className={inputClass} placeholder="Yetkili Ad Soyad" autoComplete="name" data-testid="partner-funnel-owner-name-input" />
                  {(checkoutAttempted || ownerName.length > 0) && registrationValidation.errors.ownerName ? (
                    <p className="mt-1 text-[10px] font-bold text-rose-600">{registrationValidation.errors.ownerName}</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(sanitizePhoneDigits(event.target.value, 12))}
                      className={inputClass}
                      placeholder="Telefon"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      data-testid="partner-funnel-phone-input"
                    />
                    {(checkoutAttempted || phone.length > 0) && registrationValidation.errors.phone ? (
                      <p className="mt-1 text-[10px] font-bold text-rose-600">{registrationValidation.errors.phone}</p>
                    ) : null}
                  </div>
                  <div>
                    <input value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="E-posta" type="email" autoComplete="email" data-testid="partner-funnel-email-input" />
                    {(checkoutAttempted || email.length > 0) && registrationValidation.errors.email ? (
                      <p className="mt-1 text-[10px] font-bold text-rose-600">{registrationValidation.errors.email}</p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <input
                    value={vkn}
                    onChange={(event) => setVkn(sanitizePhoneDigits(event.target.value, 10))}
                    className={inputClass}
                    placeholder="Vergi Kimlik Numarası (VKN - 10 Hane)"
                    inputMode="numeric"
                    maxLength={10}
                    data-testid="partner-funnel-vkn-input"
                  />
                  {(checkoutAttempted || vkn.length > 0) && registrationValidation.errors.vkn ? (
                    <p className="mt-1 text-[10px] font-bold text-rose-600">{registrationValidation.errors.vkn}</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">VKN yalnızca rakamlardan oluşan 10 haneli numaradır.</p>
                  )}
                </div>
                <div
                  className={`space-y-2 rounded-2xl border-2 p-3 ${softSurface}`}
                  data-testid="partner-funnel-name-confirm-box"
                >
                  <p className="text-xs font-black">
                    Vitrinde müşterilerinize görünecek son işletme adı: “{businessName || '—'}”
                  </p>
                  <input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    className={inputClass}
                    placeholder="Vitrin İşletme Adı"
                    data-testid="partner-funnel-checkout-business-input"
                  />
                  {(checkoutAttempted || businessName.length > 0) && registrationValidation.errors.businessName ? (
                    <p className="text-[10px] font-bold text-rose-600">{registrationValidation.errors.businessName}</p>
                  ) : null}
                  <label className="flex cursor-pointer items-start gap-2 text-[11px] font-bold">
                    <input
                      type="checkbox"
                      checked={nameConfirmed}
                      onChange={(event) => setNameConfirmed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#4F46E5]"
                      data-testid="partner-funnel-name-confirm-checkbox"
                    />
                    Bu işletme adının müşteri vitrinimde yayınlanacağını onaylıyorum.
                  </label>
                </div>
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border-2 p-3 text-xs font-semibold ${softSurface}`}>
                  <input type="checkbox" checked={kvkkAccepted} onChange={(event) => setKvkkAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#4F46E5]" data-testid="partner-funnel-kvkk-checkbox" />
                  <span>KVKK Aydınlatma Metni’ni ve abonelik koşullarını okudum, onaylıyorum.</span>
                </label>
                <button type="submit" disabled={!canCheckout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40" data-testid="partner-funnel-checkout-btn">
                  Satın Al & Hızlı Kuruluma Geç
                  <ChevronRight className="h-4 w-4" />
                </button>
              </form>
            ) : null}
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-4" data-testid="partner-funnel-step-setup">
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#8B5CF6] text-white shadow-lg"><Rocket className="h-7 w-7" /></span>
              <span className="mt-3 block text-xs font-black text-[#4F46E5]">ADIM 4 • HIZLI KURULUM</span>
              <h1 className="mt-1 text-xl font-black">Partner merkezin yayına hazır.</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Üç mini ayarı tamamla; ilk müşterini hemen kabul et.</p>
            </div>

            <div className={`space-y-3 rounded-3xl border-2 p-4 ${cardSurface}`}>
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-xs font-black text-[#4F46E5]">1</span><div><h2 className="text-sm font-black">İlk Hizmet & Fiyat</h2><p className="text-[11px] text-slate-500">Müşterinin vitrinde göreceği ilk işlem.</p></div></div>
              <input value={serviceName} onChange={(event) => setServiceName(event.target.value)} className={inputClass} placeholder="İmza Bakım" data-testid="partner-funnel-service-name-input" />
              <div className="grid grid-cols-2 gap-2">
                <input value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} className={inputClass} type="number" min="0" placeholder="1.800 TRY" data-testid="partner-funnel-service-price-input" />
                <input value={serviceDuration} onChange={(event) => setServiceDuration(event.target.value)} className={inputClass} type="number" min="1" placeholder="60 dk" data-testid="partner-funnel-service-duration-input" />
              </div>
            </div>

            <div className={`space-y-3 rounded-3xl border-2 p-4 ${cardSurface}`}>
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-xs font-black text-[#4F46E5]">2</span><div><h2 className="text-sm font-black">İlk Uzman & Çalışma Saatleri</h2><p className="text-[11px] text-slate-500">Ajandanızı ilk günden doldurmaya başlayın.</p></div></div>
              <input value={staffName} onChange={(event) => setStaffName(event.target.value)} className={inputClass} placeholder="Uzman Adı" data-testid="partner-funnel-staff-name-input" />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-black text-slate-500">AÇILIŞ<input value={openingTime} onChange={(event) => setOpeningTime(event.target.value)} className={`${inputClass} mt-1`} type="time" data-testid="partner-funnel-opening-time-input" /></label>
                <label className="text-[10px] font-black text-slate-500">KAPANIŞ<input value={closingTime} onChange={(event) => setClosingTime(event.target.value)} className={`${inputClass} mt-1`} type="time" data-testid="partner-funnel-closing-time-input" /></label>
              </div>
            </div>

            <div className={`rounded-3xl border-2 p-4 ${cardSurface}`}>
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF2FF] text-xs font-black text-[#4F46E5]">3</span><div><h2 className="text-sm font-black">Kurumsal Özet & Canlıya Alma</h2><p className="text-[11px] text-slate-500">Son kontrolünüz hazır.</p></div></div>
              <div className={`mt-3 space-y-2 rounded-2xl border-2 p-3 text-xs ${softSurface}`}>
                <p className="flex items-center gap-2 font-black"><Store className="h-4 w-4 text-[#4F46E5]" />{businessName}</p>
                <p className="flex items-center gap-2"><Palette className="h-4 w-4 text-[#4F46E5]" />{sector} • {city} / {district}</p>
                <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#4F46E5]" />{serviceName} • {formatTry(Number(servicePrice) || 0)} TRY • {serviceDuration} dk</p>
                <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#4F46E5]" />{staffName} • {openingTime} – {closingTime}</p>
                <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />{selectedPlan?.name} Partner paketi doğrulandı</p>
              </div>
            </div>

            <button type="button" disabled={activationPending} onClick={() => void completeOnboarding(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-4 py-3 text-sm font-black text-white shadow-lg disabled:cursor-wait disabled:opacity-60" data-testid="partner-funnel-activate-btn">
              {activationPending ? 'Abonelik Doğrulanıyor…' : 'Partner Hesabımı Aktif Et & Panele Geç'}
              <LayoutDashboard className="h-4 w-4" />
            </button>
            <button type="button" disabled={activationPending} onClick={() => void completeOnboarding(false)} className="min-h-11 w-full text-sm font-black text-slate-500 disabled:cursor-wait disabled:opacity-60 dark:text-slate-300" data-testid="partner-funnel-stay-customer-btn">Şimdilik Müşteri Modunda Kal</button>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default MobilePartnerOnboardingFunnel;
