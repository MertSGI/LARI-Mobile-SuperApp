import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Palette,
  QrCode,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
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

const VALUE_PROPOSITIONS = [
  {
    title: 'WhatsApp / Telefon Karmaşasına Son',
    description: '7/24 online randevu, canlı fiyat listesi ve uzman seçimi.',
    icon: Clock3,
  },
  {
    title: '%0 Komisyon Mağaza & Google Haritalar',
    description: 'Kendi müşterinizden komisyon kesilmez; QR linkiniz vitrininizi açar.',
    icon: MapPin,
  },
  {
    title: 'QR Kabul, Sesli Katalog & Cep POS',
    description: 'Sesli işlem ekleyin; fiyat dökümü ve bahşişli ödeme QR’ı üretin.',
    icon: QrCode,
  },
  {
    title: 'Ciro, Personel & Galeri Tek Ekranda',
    description: 'Günlükten 3 aylığa raporlarla işletmenizi bilgisayarsız yönetin.',
    icon: BarChart3,
  },
  {
    title: 'Müşteri ve Partner Dünyaları Ayrı',
    description: 'Keşfet deneyiminizi kaybetmeden iki izole mod arasında geçin.',
    icon: Users,
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
  const { themeMode, upgradeToPartnerAccount } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const plans = useMemo(() => planService.getActivePlans(), []);
  const [step, setStep] = useState<FunnelStep>(1);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('storefront');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Lüks Stüdyo Kadıköy');
  const [sector, setSector] = useState(SECTORS[0]);
  const [location, setLocation] = useState('İstanbul / Kadıköy');
  const [signatureColor, setSignatureColor] = useState(SIGNATURE_COLORS[0]);
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [serviceName, setServiceName] = useState('İmza Bakım');
  const [servicePrice, setServicePrice] = useState('1800');
  const [serviceDuration, setServiceDuration] = useState('60');
  const [staffName, setStaffName] = useState('Ayşe Yılmaz');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('20:00');

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const locationParts = location.split('/').map((part) => part.trim()).filter(Boolean);
  const city = locationParts[0] || 'İstanbul';
  const district = locationParts[1] || 'Kadıköy';
  const canCheckout = Boolean(
    selectedPlan && ownerName.trim() && phone.trim() && email.trim() && businessName.trim() && kvkkAccepted
  );

  const handleBack = () => {
    if (step === 1) {
      onClose();
      return;
    }
    setStep((current) => Math.max(1, current - 1) as FunnelStep);
  };

  const completeOnboarding = (switchToPartnerMode: boolean) => {
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
      staffName: staffName.trim() || undefined,
      initialServiceName: serviceName.trim() || undefined,
      initialServicePrice: Number(servicePrice) || undefined,
      initialServiceDuration: Number(serviceDuration) || undefined,
    };
    upgradeToPartnerAccount(upgradeInput);
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
                  MÜŞTERİ DENEYİMİN AYNI KALIR
                </span>
                <h1 className="mt-3 text-2xl font-black leading-tight">İşletmenizin dijital vitrini, ajandası ve kasası cebinizde.</h1>
                <p className="mt-2 text-sm leading-relaxed text-indigo-100">
                  LARİ’de keşfetmeye devam ederken Partner modunda işletmenizi uçtan uca yönetin.
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
              <h1 className="mt-1 text-xl font-black">Kendi işletmeni daha satın almadan gör.</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Bilgileri değiştir; iki ekran da anında işletmene dönüşsün.</p>
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
                <div className="mt-3 overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700" data-testid="partner-funnel-storefront-preview">
                  <div className="h-24 p-4 text-white" style={{ background: `linear-gradient(135deg, ${signatureColor}, #111827)` }}>
                    <p className="text-[10px] font-black tracking-wider opacity-80">DOĞRUDAN QR VİTRİNİ</p>
                    <h2 className="mt-1 truncate text-lg font-black">{businessName || 'İşletmeniz'}</h2>
                    <p className="text-xs">★ 4.9 • {sector} • {district}</p>
                  </div>
                  <div className="space-y-2 p-3">
                    {['İmza Bakım', 'Premium Randevu', 'Hızlı Kontrol'].map((service, index) => (
                      <div key={service} className={`flex items-center justify-between rounded-xl border p-2.5 ${softSurface}`}>
                        <span className="text-xs font-bold">{service}</span>
                        <span className="text-xs font-black">{formatTry(900 + index * 450)} TRY</span>
                      </div>
                    ))}
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
              Abonelik Paketi Seç & Kuruluma Başla
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
            </div>

            <div className={`grid grid-cols-2 gap-1.5 rounded-2xl border-2 p-1.5 ${softSurface}`}>
              <button type="button" onClick={() => setBillingPeriod('monthly')} className={`min-h-11 rounded-xl text-xs font-black ${billingPeriod === 'monthly' ? 'bg-white text-[#4338CA] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`} aria-pressed={billingPeriod === 'monthly'} data-testid="partner-funnel-billing-monthly">Aylık</button>
              <button type="button" onClick={() => setBillingPeriod('annual')} className={`min-h-11 rounded-xl text-xs font-black ${billingPeriod === 'annual' ? 'bg-white text-[#4338CA] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`} aria-pressed={billingPeriod === 'annual'} data-testid="partner-funnel-billing-annual">Yıllık • %20 İndirim</button>
            </div>

            <div className="space-y-3">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                const monthlyDisplay = billingPeriod === 'annual' ? plan.annualPrice / 12 : plan.monthlyPrice;
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-black">{plan.name}</h2>
                        <p className="mt-1 text-2xl font-black text-[#4338CA] dark:text-indigo-300">{formatTry(monthlyDisplay)} {plan.currency}<span className="text-xs text-slate-500">/ay</span></p>
                        {billingPeriod === 'annual' ? <p className="text-[10px] font-bold text-emerald-600">Yıllık {formatTry(plan.annualPrice)} {plan.currency} faturalandırılır</p> : null}
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
                  if (canCheckout) setStep(4);
                }}
                data-testid="partner-funnel-checkout-form"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#4F46E5]" />
                  <div><h2 className="text-sm font-black">Güvenli kayıt & abonelik</h2><p className="text-[11px] text-slate-500">{selectedPlan.name} • {billingPeriod === 'annual' ? 'Yıllık' : 'Aylık'}</p></div>
                </div>
                <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className={inputClass} placeholder="Ad Soyad" autoComplete="name" required data-testid="partner-funnel-owner-name-input" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} placeholder="Telefon" type="tel" autoComplete="tel" required data-testid="partner-funnel-phone-input" />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="E-posta" type="email" autoComplete="email" required data-testid="partner-funnel-email-input" />
                </div>
                <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} className={inputClass} placeholder="İşletme Adı" required data-testid="partner-funnel-checkout-business-input" />
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

            <button type="button" onClick={() => completeOnboarding(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-4 py-3 text-sm font-black text-white shadow-lg" data-testid="partner-funnel-activate-btn">
              Partner Hesabımı Aktif Et & Panele Geç
              <LayoutDashboard className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => completeOnboarding(false)} className="min-h-11 w-full text-sm font-black text-slate-500 dark:text-slate-300" data-testid="partner-funnel-stay-customer-btn">Şimdilik Müşteri Modunda Kal</button>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default MobilePartnerOnboardingFunnel;
