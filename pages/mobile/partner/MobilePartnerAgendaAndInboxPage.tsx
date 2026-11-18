import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarClock,
  ChartNoAxesColumn,
  Check,
  ClipboardList,
  Clock,
  Coffee,
  Copy,
  ExternalLink,
  ImagePlus,
  Inbox,
  Megaphone,
  PackagePlus,
  Pencil,
  ShieldAlert,
  Sparkles,
  Store,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Trash2,
  UserPlus,
  Users,
  VolumeX,
  WalletCards,
  X,
} from 'lucide-react';
import { Role } from '../../../types';
import { sanitizeUserMessage } from '../../../services/mobile/mobileUiSanitizer';
import {
  convertFromTryMajor,
  getStorefrontEditLockStatus,
  sanitizePhoneDigits,
  SupportedCurrency,
} from '../../../services/mobile/mobileRegionCurrencyService';
import {
  BusinessHoursKey,
  BusinessHoursSchedule,
  DailyBusinessHoursKey,
  slugifyBusinessName,
  useMobileAppSession,
} from '../../../contexts/MobileAppSessionContext';
import MobileAIStyleVisualizerPage from '../b2c/MobileAIStyleVisualizerPage';
import { resolvePartnerFeatureEntitlements } from '../../../services/mobile/mobilePackageEntitlementService';
import { MobilePersonaType } from '../../../services/mobile/mobileShellPolicyService';
import { mobileCoreBridgeService } from '../../../services/mobile/mobileCoreBridgeService';
import { MobileRevenueSummary } from '../../../services/reportingService';

export interface PartnerAgendaItem {
  appointmentId: string;
  tenantId: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  scheduledTime: string;
  resourceLabel?: string;
  noShowRiskLevel: 'low' | 'medium' | 'high';
  depositPaid: boolean;
  status: 'confirmed' | 'completed' | 'no_show' | 'cancelled_by_salon';
  vipDrinkPreference?: string;
  quietSessionRequested?: boolean;
  lastPassportFormula?: string;
}

export interface PartnerInboxRequest {
  requestId: string;
  tenantId: string;
  type: 'reschedule' | 'new_booking' | 'waitlist_offer';
  customerName: string;
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PartnerRoleCheckResult {
  allowed: boolean;
  reasonCode?: 'FORBIDDEN_PARTNER_ROLE' | 'TENANT_MISMATCH';
}

const ALLOWED_PARTNER_ROLES: ReadonlySet<string> = new Set([
  'tenant_owner',
  'staff',
  'super_admin',
]);

type PartnerManagementTab = 'agenda' | 'catalog' | 'staff_reports' | 'storefront';

const PARTNER_MANAGEMENT_TABS: ReadonlyArray<{
  id: PartnerManagementTab;
  label: string;
}> = [
  { id: 'agenda', label: 'Ajanda & Talepler' },
  { id: 'catalog', label: 'Katalog & Hizmetler' },
  { id: 'staff_reports', label: 'Personel & Raporlar' },
  { id: 'storefront', label: 'Mağaza & %0 Komisyon' },
];

type RevenuePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';
const SIGNATURE_ACCENT_COLORS = ['#4F46E5', '#7C3AED', '#DB2777', '#0F766E', '#EA580C'];

const PARTNER_TENANT_SLUG = 'atelier-nisantasi';
const PARTNER_BUSINESS_NAME = 'Atelier Nişantaşı Hair & Spa';
const QUICK_GALLERY_PHOTO_URL =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85';
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

const REVENUE_REPORTS: MobileRevenueSummary = {
  daily: {
    label: 'Günlük',
    revenue: 12450,
    serviceRevenue: 9710,
    productRevenue: 2740,
    estimatedNetRevenue: 9960,
    completedAppointments: 6,
  },
  weekly: {
    label: 'Haftalık',
    revenue: 68400,
    serviceRevenue: 53350,
    productRevenue: 15050,
    estimatedNetRevenue: 54720,
    completedAppointments: 34,
  },
  monthly: {
    label: 'Aylık',
    revenue: 274800,
    serviceRevenue: 214344,
    productRevenue: 60456,
    estimatedNetRevenue: 219840,
    completedAppointments: 138,
  },
  quarterly: {
    label: 'Son 3 Ay',
    revenue: 798500,
    serviceRevenue: 622830,
    productRevenue: 175670,
    estimatedNetRevenue: 638800,
    completedAppointments: 402,
  },
};

const REVENUE_PERIODS = Object.keys(REVENUE_REPORTS) as RevenuePeriod[];

export function verifyPartnerMobileAccess(
  userRole: Role | 'guest',
  actorTenantId: string,
  targetTenantId: string
): PartnerRoleCheckResult {
  if (!ALLOWED_PARTNER_ROLES.has(userRole)) {
    return { allowed: false, reasonCode: 'FORBIDDEN_PARTNER_ROLE' };
  }
  if (!actorTenantId || actorTenantId !== targetTenantId) {
    return { allowed: false, reasonCode: 'TENANT_MISMATCH' };
  }
  return { allowed: true };
}

export interface MobilePartnerAgendaAndInboxPageProps {
  tenantId: string;
  userRole: Role | 'guest';
  language?: 'tr' | 'en';
  initialTabFocus?: 'agenda' | 'inbox';
  partnerQuickAddTick?: number;
  effectivePersona?: MobilePersonaType;
  onRequestPlanUpgrade?: () => void;
}

export const MobilePartnerAgendaAndInboxPage: React.FC<
  MobilePartnerAgendaAndInboxPageProps
> = ({
  tenantId,
  userRole,
  language = 'tr',
  initialTabFocus = 'agenda',
  partnerQuickAddTick = 0,
  effectivePersona,
  onRequestPlanUpgrade,
}) => {
  const {
    addCatalogItem,
    addVenuePhoto,
    appendPassportFormula,
    customVenuePhotos,
    partnerCatalog,
    partnerSubscription,
    publishSocialPost,
    removeCatalogItem,
    removeVenuePhoto,
    getLiveStageForAppointment,
    updateLiveAppointmentStage,
    partnerStaffMembers: staffMembers,
    addPartnerStaffMember,
    updatePartnerStaffMember,
    removePartnerStaffMember,
    partnerGroupedHours: businessHours,
    updatePartnerGroupedHours,
    partnerDailyHours: dailyBusinessHours,
    updatePartnerDailyHours,
    partnerDailyHoursMode: dailyHoursMode,
    setPartnerDailyHoursMode: setDailyHoursMode,
    partnerCampaigns: campaigns,
    savePartnerCampaign,
    removePartnerCampaign,
    showToast,
    themeMode,
    updateCatalogItem,
    selectedCurrency,
    setSelectedCurrency,
    storefrontCustomization,
    storefrontLastEditedAtIso,
    saveStorefrontCustomization,
  } = useMobileAppSession();
  const isDark = themeMode === 'dark';
  const lastPartnerActionRef = useRef<Record<string, number>>({});
  const acquireActionGate = (actionKey: string, cooldownMs = 700): boolean => {
    const now = Date.now();
    if (now - (lastPartnerActionRef.current[actionKey] || 0) < cooldownMs) {
      return false;
    }
    lastPartnerActionRef.current[actionKey] = now;
    return true;
  };
  const access = verifyPartnerMobileAccess(userRole, tenantId, tenantId);
  const entitlements = resolvePartnerFeatureEntitlements({
    partnerSubscription,
    effectivePersona,
  });
  const [agenda, setAgenda] = useState<PartnerAgendaItem[]>([
    {
      appointmentId: 'apt-p1',
      tenantId,
      customerName: 'Selin Demir',
      serviceName: 'Soft Balayage & Bakım',
      staffName: 'Merve Yılmaz',
      scheduledTime: '14:00',
      resourceLabel: 'Oda-2 (Boya)',
      noShowRiskLevel: 'low',
      depositPaid: true,
      status: 'confirmed',
      vipDrinkPreference: 'Filtre Kahve (Şekersiz)',
      quietSessionRequested: true,
      lastPassportFormula:
        'Dip 7.1 Küllü Kumral (20 Vol) + Uçlar 9.12 Soğuk Bej Tonlama + Olaplex No.2',
    },
    {
      appointmentId: 'apt-p2',
      tenantId,
      customerName: 'Burak Kaya',
      serviceName: 'Lazer Epilasyon (Tam)',
      staffName: 'Dr. Ece Aksoy',
      scheduledTime: '15:30',
      resourceLabel: 'Lazer Cihazı #1',
      noShowRiskLevel: 'high',
      depositPaid: false,
      status: 'confirmed',
      vipDrinkPreference: 'Buzlu Matcha Latte',
      quietSessionRequested: false,
      lastPassportFormula: 'Alexandrite 16 J/cm² • Soğutucu Başlık Seviye 4',
    },
  ]);

  const [expandedChairsideId, setExpandedChairsideId] = useState<string | null>(
    'apt-p1'
  );
  const [formulaInput, setFormulaInput] = useState<string>(
    'Dip 7.1 + Uçlar 10.12 Platin Tonlama + Keratin Mühürleme'
  );
  const [savedPassportMessage, setSavedPassportMessage] = useState<
    string | null
  >(null);

  const [inbox, setInbox] = useState<PartnerInboxRequest[]>([
    {
      requestId: 'req-101',
      tenantId,
      type: 'reschedule',
      customerName: 'Zeynep Aydın',
      summary: '17 Kasım 13:00 -> 18 Kasım 15:00 saat değişikliği talebi',
      status: 'pending',
    },
    {
      requestId: 'req-102',
      tenantId,
      type: 'waitlist_offer',
      customerName: 'Aylin Koç',
      summary: 'Bugün 17:30 boşalan Soft Balayage randevusu için bekleme listesi onayı',
      status: 'pending',
    },
  ]);
  const [activeManagementTab, setActiveManagementTab] =
    useState<PartnerManagementTab>('agenda');
  const [isAgendaAddOpen, setIsAgendaAddOpen] = useState(false);
  const inboxFocusRef = useRef<HTMLDivElement | null>(null);
  const [newAgendaCustomer, setNewAgendaCustomer] = useState('');
  const [newAgendaService, setNewAgendaService] = useState('');
  const [newAgendaStaff, setNewAgendaStaff] = useState('Merve Yılmaz');
  const [newAgendaTime, setNewAgendaTime] = useState('16:30');
  const [newAgendaResource, setNewAgendaResource] = useState('');
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogPrice, setNewCatalogPrice] = useState('');
  const [newCatalogDuration, setNewCatalogDuration] = useState('60');
  const [newCatalogKind, setNewCatalogKind] = useState<'beauty' | 'product'>(
    'beauty'
  );
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [editingCatalogName, setEditingCatalogName] = useState('');
  const [editingCatalogPrice, setEditingCatalogPrice] = useState('');
  const [isStaffAddOpen, setIsStaffAddOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffSpecialty, setNewStaffSpecialty] = useState('');
  const [newStaffCommission, setNewStaffCommission] = useState('20');
  const [newStaffShift, setNewStaffShift] = useState('09:00–19:00');
  const [selectedRevenuePeriod, setSelectedRevenuePeriod] =
    useState<RevenuePeriod>('daily');
  const [revenueReports, setRevenueReports] =
    useState<MobileRevenueSummary>(REVENUE_REPORTS);
  const [galleryUrl, setGalleryUrl] = useState(QUICK_GALLERY_PHOTO_URL);
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<string | null>(
    null
  );
  const [socialCaption, setSocialCaption] = useState('Yeni çalışmamızı keşfedin.');
  const [newCampaignCode, setNewCampaignCode] = useState('');
  const [newCampaignDiscount, setNewCampaignDiscount] = useState('10');
  const [storefrontBusinessName, setStorefrontBusinessName] = useState(
    storefrontCustomization.businessName
  );
  const [storefrontTagline, setStorefrontTagline] = useState(
    storefrontCustomization.tagline
  );
  const [storefrontWhatsapp, setStorefrontWhatsapp] = useState(
    storefrontCustomization.whatsappNumber
  );
  const [storefrontAccentColor, setStorefrontAccentColor] = useState(
    storefrontCustomization.accentColor || '#4F46E5'
  );
  const [storefrontCoverUrl, setStorefrontCoverUrl] = useState(
    storefrontCustomization.coverPhotoUrl || ''
  );
  const [storefrontNowMs, setStorefrontNowMs] = useState(() => Date.now());

  useEffect(() => {
    setActiveManagementTab('agenda');
    if (initialTabFocus !== 'inbox') return;

    const animationFrame = window.requestAnimationFrame(() => {
      inboxFocusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [initialTabFocus]);

  useEffect(() => {
    if (partnerQuickAddTick <= 0) return;
    setActiveManagementTab('agenda');
    setIsAgendaAddOpen(true);
  }, [partnerQuickAddTick]);

  useEffect(() => {
    setStorefrontBusinessName(storefrontCustomization.businessName);
    setStorefrontTagline(storefrontCustomization.tagline);
    setStorefrontWhatsapp(storefrontCustomization.whatsappNumber);
    setStorefrontAccentColor(storefrontCustomization.accentColor || '#4F46E5');
    setStorefrontCoverUrl(storefrontCustomization.coverPhotoUrl || '');
  }, [storefrontCustomization]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setStorefrontNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;
    void mobileCoreBridgeService
      .loadPartnerRevenueSummary(tenantId, REVENUE_REPORTS)
      .then((summary) => {
        if (active) setRevenueReports(summary);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [tenantId]);

  const visiblePartnerCatalog = partnerCatalog.filter(
    (item) => item.tenantId === tenantId
  );
  const dynamicStorefrontSlug = slugifyBusinessName(
    storefrontCustomization.businessName || PARTNER_BUSINESS_NAME
  );
  const storefrontUrl = `https://app.randevulari.com/#/m?slug=${dynamicStorefrontSlug}`;
  const venuePhotos = customVenuePhotos[PARTNER_TENANT_SLUG] ?? [];
  const selectedRevenue = revenueReports[selectedRevenuePeriod];
  const storefrontLockStatus = getStorefrontEditLockStatus(
    storefrontLastEditedAtIso,
    storefrontNowMs
  );
  const formatPartnerMoney = (amountTry: number) =>
    `${convertFromTryMajor(amountTry, selectedCurrency).toLocaleString('tr-TR')} ${selectedCurrency}`;
  const isInboxFocus = initialTabFocus === 'inbox';

  if (!access.allowed) {
    return (
      <div
        className="rounded-2xl bg-rose-950/40 border border-rose-500/40 p-4 text-xs text-rose-200"
        data-testid="partner-agenda-forbidden"
      >
        {sanitizeUserMessage(
          access.reasonCode,
          'Bu işletme paneline erişmek için yetkili Partner hesabıyla giriş yapmalısınız.'
        )}
      </div>
    );
  }

  const handleDecision = (reqId: string, decision: 'approved' | 'rejected') => {
    setInbox((prev) =>
      prev.map((r) => (r.requestId === reqId ? { ...r, status: decision } : r))
    );
  };

  const handleSaveStorefrontCustomization = async () => {
    if (!storefrontBusinessName.trim() || storefrontLockStatus.locked) return;
    const result = await saveStorefrontCustomization({
      businessName: storefrontBusinessName.trim(),
      tagline: storefrontTagline.trim(),
      whatsappNumber: sanitizePhoneDigits(storefrontWhatsapp, 15),
      accentColor: storefrontAccentColor,
      coverPhotoUrl: storefrontCoverUrl.trim(),
    });
    if (result.accepted) setStorefrontNowMs(Date.now());
  };

  const handleClearInboxRequest = (reqId: string) => {
    setInbox((prev) => prev.filter((request) => request.requestId !== reqId));
    showToast('Sonuçlandırılmış talep temizlendi.');
  };

  const handleAddAgendaItem = () => {
    if (!acquireActionGate('agenda_add')) return;
    const customerName = newAgendaCustomer.trim();
    const serviceName = newAgendaService.trim();
    const staffName = newAgendaStaff.trim();
    if (!customerName || !serviceName || !staffName || !newAgendaTime) {
      showToast('Müşteri, hizmet, uzman ve saat alanlarını doldurun.');
      return;
    }

    const slotCollision = agenda.find(
      (item) =>
        item.status !== 'cancelled_by_salon' &&
        item.status !== 'no_show' &&
        item.scheduledTime === newAgendaTime &&
        (item.staffName.trim().toLowerCase() === staffName.toLowerCase() ||
          item.customerName.trim().toLowerCase() === customerName.toLowerCase())
    );
    if (slotCollision) {
      showToast(
        `${newAgendaTime} saatinde ${slotCollision.staffName} / ${slotCollision.customerName} için çakışan aktif randevu mevcut.`
      );
      return;
    }

    const created: PartnerAgendaItem = {
      appointmentId: `apt-walkin-${Date.now().toString(36)}`,
      tenantId,
      customerName,
      serviceName,
      staffName,
      scheduledTime: newAgendaTime,
      resourceLabel: newAgendaResource.trim() || undefined,
      noShowRiskLevel: 'low',
      depositPaid: false,
      status: 'confirmed',
      lastPassportFormula: 'Henüz işlem formülü eklenmedi.',
    };
    setAgenda((prev) => [created, ...prev]);
    setNewAgendaCustomer('');
    setNewAgendaService('');
    setNewAgendaResource('');
    setIsAgendaAddOpen(false);
    showToast(`${customerName} için yeni randevu ajandaya eklendi.`);
  };

  const handleDeleteAgendaItem = (appointmentId: string) => {
    setAgenda((prev) => prev.filter((item) => item.appointmentId !== appointmentId));
    setExpandedChairsideId((current) =>
      current === appointmentId ? null : current
    );
    showToast('Randevu iptal edilerek ajandadan silindi.');
  };

  const handleStatusUpdate = (
    aptId: string,
    nextStatus: PartnerAgendaItem['status']
  ) => {
    setAgenda((prev) =>
      prev.map((a) =>
        a.appointmentId === aptId ? { ...a, status: nextStatus } : a
      )
    );
  };

  const handleSaveFormulaToCustomerPassport = (aptId: string) => {
    const targetItem = agenda.find((a) => a.appointmentId === aptId);
    setAgenda((prev) =>
      prev.map((a) =>
        a.appointmentId === aptId
          ? { ...a, lastPassportFormula: formulaInput }
          : a
      )
    );
    appendPassportFormula({
      id: `passport-partner-${Date.now()}`,
      businessName: 'Atelier Nişantaşı Hair & Spa',
      serviceTitle: targetItem?.serviceName || 'Bakım İşlemi',
      dateLabel: 'Bugün',
      formulaOrProtocol: formulaInput,
      specialistName: targetItem?.staffName || 'Uzman',
      specialistNote: 'Koltuk başı uzman kaydı ile müşterinin pasaportuna eklendi.',
    });
    setSavedPassportMessage(
      'Yeni işlem formülü müşterinin Bakım Pasaportuna canlı olarak işlendi!'
    );
    showToast('Formül müşterinin Bakım Pasaportuna senkronize edildi!');
  };

  const handleAddCatalogItem = () => {
    if (!acquireActionGate('catalog_add')) return;
    const normalizedName = newCatalogName.trim();
    const parsedPrice = Number(newCatalogPrice);
    const parsedDuration = Number(newCatalogDuration);
    if (
      !normalizedName ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isFinite(parsedDuration) ||
      parsedDuration < 0
    ) {
      showToast('Hizmet adı, geçerli fiyat ve süre girin.');
      return;
    }

    addCatalogItem({
      tenantId,
      name: normalizedName,
      category: newCatalogKind,
      unitPriceMajor: Math.round(parsedPrice),
      durationMinutes: Math.round(parsedDuration),
      currency: 'TRY',
      taxRateBps: 2000,
      commissionRateBps: newCatalogKind === 'product' ? 1000 : 2500,
      packageEligible: newCatalogKind !== 'product',
      keywords: normalizedName.toLocaleLowerCase('tr-TR').split(/\s+/),
    });
    setNewCatalogName('');
    setNewCatalogPrice('');
    setNewCatalogDuration(newCatalogKind === 'product' ? '0' : '60');
  };

  const handleStartCatalogEdit = (item: (typeof partnerCatalog)[number]) => {
    setEditingCatalogId(item.id);
    setEditingCatalogName(item.name);
    setEditingCatalogPrice(String(item.unitPriceMajor));
  };

  const handleSaveCatalogEdit = (item: (typeof partnerCatalog)[number]) => {
    const normalizedName = editingCatalogName.trim();
    const parsedPrice = Number(editingCatalogPrice);
    if (!normalizedName || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      showToast('Geçerli bir katalog adı ve fiyat girin.');
      return;
    }
    updateCatalogItem(item.id, {
      name: normalizedName,
      unitPriceMajor: Math.round(parsedPrice),
      keywords: normalizedName.toLocaleLowerCase('tr-TR').split(/\s+/),
    });
    setEditingCatalogId(null);
  };

  const handleAddStaffMember = async () => {
    if (!acquireActionGate('staff_add')) return;
    const name = newStaffName.trim();
    const specialty = newStaffSpecialty.trim();
    const shiftHours = newStaffShift.trim();
    const commissionRate = Number(newStaffCommission);
    if (
      !name ||
      !specialty ||
      !shiftHours ||
      !Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 100
    ) {
      showToast('Uzman adı, uzmanlık alanı ve 0-100 arası prim oranı girin.');
      return;
    }
    await addPartnerStaffMember(tenantId, {
      name,
      specialty,
      active: true,
      available: true,
      commissionRate: Math.round(commissionRate),
      workDaysLabel: 'Pzt–Cmt',
      shiftHours,
    });
    setNewStaffName('');
    setNewStaffSpecialty('');
    setNewStaffCommission('20');
    setNewStaffShift('09:00–19:00');
    setIsStaffAddOpen(false);
  };

  const handleDeleteStaffMember = (staffId: string) => {
    void removePartnerStaffMember(tenantId, staffId);
  };

  const toggleStaffField = (
    staffId: string,
    field: 'active' | 'available'
  ) => {
    const member = staffMembers.find((item) => item.id === staffId);
    if (!member) return;
    void updatePartnerStaffMember(tenantId, staffId, {
      [field]: !member[field],
    });
  };

  const handleStaffCommissionChange = (staffId: string, value: string) => {
    const commissionRate = Number(value);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      return;
    }
    void updatePartnerStaffMember(tenantId, staffId, {
      commissionRate: Math.round(commissionRate),
    });
  };

  const handleStaffShiftChange = (staffId: string, shiftHours: string) => {
    void updatePartnerStaffMember(tenantId, staffId, { shiftHours });
  };

  const handleToggleBusinessDay = (key: BusinessHoursKey) => {
    if (storefrontLockStatus.locked) {
      showToast(`24 saatlik vitrin kilidi aktif (${storefrontLockStatus.countdownText} kaldı).`);
      return;
    }
    void updatePartnerGroupedHours(tenantId, {
      ...businessHours,
      [key]: { ...businessHours[key], open: !businessHours[key].open },
    });
  };

  const handleBusinessTimeChange = (
    key: BusinessHoursKey,
    field: 'openTime' | 'closeTime',
    value: string
  ) => {
    if (storefrontLockStatus.locked) {
      showToast(`24 saatlik vitrin kilidi aktif (${storefrontLockStatus.countdownText} kaldı).`);
      return;
    }
    void updatePartnerGroupedHours(tenantId, {
      ...businessHours,
      [key]: { ...businessHours[key], [field]: value },
    });
    showToast(`${businessHours[key].label} çalışma saati ${value} olarak güncellendi.`);
  };

  const handleToggleDailyBusinessDay = (key: DailyBusinessHoursKey) => {
    if (storefrontLockStatus.locked) {
      showToast(`24 saatlik vitrin kilidi aktif (${storefrontLockStatus.countdownText} kaldı).`);
      return;
    }
    void updatePartnerDailyHours(tenantId, {
      ...dailyBusinessHours,
      [key]: { ...dailyBusinessHours[key], open: !dailyBusinessHours[key].open },
    });
  };

  const handleDailyBusinessTimeChange = (
    key: DailyBusinessHoursKey,
    field: 'openTime' | 'closeTime',
    value: string
  ) => {
    if (storefrontLockStatus.locked) {
      showToast(`24 saatlik vitrin kilidi aktif (${storefrontLockStatus.countdownText} kaldı).`);
      return;
    }
    void updatePartnerDailyHours(tenantId, {
      ...dailyBusinessHours,
      [key]: { ...dailyBusinessHours[key], [field]: value },
    });
    showToast(`${dailyBusinessHours[key].label} çalışma saati ${value} olarak güncellendi.`);
  };

  const handleGalleryFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (storefrontLockStatus.locked) {
      showToast(`24 saatlik vitrin kilidi aktif (${storefrontLockStatus.countdownText} kaldı).`);
      event.target.value = '';
      return;
    }
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
    event.target.value = '';
    try {
      const uploadedUrl = await mobileCoreBridgeService.uploadPartnerGalleryImage(
        tenantId,
        file
      );
      addVenuePhoto(PARTNER_TENANT_SLUG, uploadedUrl);
      setSelectedGalleryPhoto(uploadedUrl);
      showToast('İşletme fotoğrafı galeriye eklendi.');
    } catch {
      showToast('Fotoğraf yüklenemedi. Lütfen yeniden deneyin.');
    }
  };

  const handleAddGalleryUrl = () => {
    if (storefrontLockStatus.locked) {
      showToast(`24 saatlik vitrin kilidi aktif (${storefrontLockStatus.countdownText} kaldı).`);
      return;
    }
    const normalizedUrl = galleryUrl.trim();
    if (!normalizedUrl) {
      showToast('Geçerli bir fotoğraf URL’si girin.');
      return;
    }
    addVenuePhoto(PARTNER_TENANT_SLUG, normalizedUrl);
    setSelectedGalleryPhoto(normalizedUrl);
    showToast('Hızlı fotoğraf galeriye eklendi.');
  };

  const handleRemoveGalleryPhoto = (photoUrl: string) => {
    if (storefrontLockStatus.locked) {
      showToast(`24 saatlik vitrin kilidi aktif (${storefrontLockStatus.countdownText} kaldı).`);
      return;
    }
    removeVenuePhoto(PARTNER_TENANT_SLUG, photoUrl);
    setSelectedGalleryPhoto((current) => (current === photoUrl ? null : current));
    showToast('Fotoğraf işletme galerisinden silindi.');
  };

  const handlePublishSocialPost = () => {
    const caption = socialCaption.trim();
    if (!selectedGalleryPhoto || !caption) {
      showToast('Paylaşım için bir fotoğraf seçin ve kısa açıklama girin.');
      return;
    }
    publishSocialPost({
      tenantSlug: PARTNER_TENANT_SLUG,
      businessName: PARTNER_BUSINESS_NAME,
      specialist: 'Merve Yılmaz • Kuaför & Güzellik',
      caption,
      serviceTag: 'Soft Balayage & Bakım',
      photoUrl: selectedGalleryPhoto,
    });
    setSocialCaption('');
    showToast('Gönderi Topluluk Akışında yayınlandı.');
  };

  const handleAddCampaign = () => {
    if (storefrontLockStatus.locked) {
      showToast(
        `24 saatlik vitrin düzenleme kilidi aktif (${storefrontLockStatus.countdownText} kaldı).`
      );
      return;
    }
    const code = newCampaignCode.trim().toLocaleUpperCase('tr-TR');
    const discountPercent = Number(newCampaignDiscount);
    if (
      !code ||
      !Number.isFinite(discountPercent) ||
      discountPercent <= 0 ||
      discountPercent > 100
    ) {
      showToast('Kampanya kodu ve 1-100 arası indirim oranı girin.');
      return;
    }
    void savePartnerCampaign(tenantId, {
      id: `campaign-${Date.now().toString(36)}`,
      code,
      discountPercent: Math.round(discountPercent),
      active: true,
    });
    setNewCampaignCode('');
    setNewCampaignDiscount('10');
    showToast(`${code} kampanyası aktif edildi.`);
  };

  const handleCopyStorefrontLink = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      showToast('%0 komisyon mağaza linki panoya kopyalandı.');
    } catch {
      showToast(`Mağaza linki: ${storefrontUrl}`);
    }
  };

  const displayedBusinessHours: Array<{
    key: BusinessHoursKey | DailyBusinessHoursKey;
    schedule: BusinessHoursSchedule;
  }> = dailyHoursMode
    ? (Object.entries(dailyBusinessHours) as [DailyBusinessHoursKey, BusinessHoursSchedule][]).map(
        ([key, schedule]) => ({ key, schedule })
      )
    : (Object.entries(businessHours) as [BusinessHoursKey, BusinessHoursSchedule][]).map(
        ([key, schedule]) => ({ key, schedule })
      );

  return (
    <div
      className={`space-y-4 pb-32 ${isDark ? 'text-white' : 'text-[#111827]'}`}
      data-testid="mobile-partner-agenda-page"
    >
      {/* Staff Live Commission & Daily Performance Header */}
      <div
        className={`rounded-3xl border-2 p-4 flex items-center justify-between gap-3 shadow-sm ${
          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}
        data-testid="partner-daily-commission-card"
      >
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#5B5FEF] flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            UZMAN CEP STÜDYOSU • CANLI PRİM SAYACI
          </span>
          <p className="text-lg font-black mt-0.5">
            {formatPartnerMoney(1860)}{' '}
            <span className="text-xs font-semibold text-emerald-600">
              (Bugünkü Net Primin)
            </span>
          </p>
          <p className="text-xs text-slate-500">
            6 Randevu • 2 VIP Sessiz Seans • %84 Günlük Hedef
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border-2 border-indigo-300 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-black text-[#4F46E5]">%84</span>
          <span className="text-[9px] text-[#4338CA] font-semibold">Hedef</span>
        </div>
      </div>

      <section
        className={`rounded-3xl border-2 p-3 shadow-sm ${
          isDark
            ? 'bg-slate-900 border-slate-700'
            : 'bg-white border-slate-300'
        }`}
        aria-label="İşletme Yönetim Merkezi"
        data-testid="partner-management-center"
      >
        <div className="mb-3 flex items-start justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-2">
            <ClipboardList className="h-4 w-4 shrink-0 text-[#5B5FEF]" />
            <div>
              <h2 className="text-sm font-black">İşletme Yönetim Merkezi</h2>
              <p className="text-[10px] text-slate-500">
                Ajanda, katalog, ekip ve doğrudan mağaza tek merkezde
              </p>
            </div>
          </div>
          <label className="shrink-0 text-[9px] font-black uppercase tracking-wide text-slate-500">
            Para Birimi
            <select
              value={selectedCurrency}
              onChange={(event) =>
                setSelectedCurrency(event.target.value as SupportedCurrency)
              }
              className={`mt-1 block min-h-9 rounded-xl border-2 px-2 text-[11px] font-black outline-none ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-indigo-200 bg-[#EEF2FF] text-[#4338CA]'
              }`}
              data-testid="partner-currency-select"
            >
              {(['TRY', 'USD', 'EUR', 'GBP'] as SupportedCurrency[]).map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2" role="tablist">
          {PARTNER_MANAGEMENT_TABS.map((tab) => {
            const isActive = activeManagementTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`partner-management-panel-${tab.id}`}
                onClick={() => setActiveManagementTab(tab.id)}
                className={`min-h-11 rounded-xl border-2 px-2 py-2 text-[11px] font-black transition ${
                  isActive
                    ? 'border-[#4338CA] bg-[#4F46E5] text-white shadow-sm'
                    : isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-200'
                      : 'border-slate-200 bg-[#F8FAFC] text-slate-700'
                }`}
                data-testid={`partner-management-tab-${tab.id}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeManagementTab === 'agenda' && (
        <div
          className="flex flex-col gap-4"
          role="tabpanel"
          id="partner-management-panel-agenda"
          data-testid="partner-management-agenda-panel"
        >
      {isInboxFocus && (
        <div
          className={`order-0 rounded-3xl border-2 p-4 shadow-sm ${
            isDark
              ? 'border-indigo-400 bg-indigo-950/50 text-indigo-100'
              : 'border-indigo-300 bg-[#EEF2FF] text-[#312E81]'
          }`}
          data-testid="partner-inbox-focus-banner"
        >
          <p className="flex items-center gap-2 text-sm font-black">
            <Inbox className="h-5 w-5" />
            Onay & Erteleme Kutusu Odakta
          </p>
          <p className="mt-1 text-[11px] font-semibold opacity-80">
            Bekleyen randevu, erteleme ve bekleme listesi taleplerini buradan sonuçlandırın.
          </p>
        </div>
      )}
      {/* Reschedule & Approval Inbox */}
      <div
        ref={inboxFocusRef}
        className={`rounded-3xl border-2 p-4 space-y-2.5 shadow-sm ${
          isInboxFocus ? 'order-1 ring-2 ring-[#4F46E5]/25' : 'order-2'
        } ${
          isDark
            ? 'bg-slate-900 border-slate-700'
            : isInboxFocus
              ? 'bg-white border-[#4F46E5]'
              : 'bg-white border-slate-200'
        }`}
        data-testid="partner-inbox-focus-card"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
            <Inbox className="w-4 h-4 text-[#5B5FEF]" />
            {language === 'tr' ? 'Onay & Erteleme Kutusu' : 'Approval Inbox'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#EEF0FF] text-[#4338CA] font-bold">
            {inbox.filter((i) => i.status === 'pending').length} Bekleyen
          </span>
        </div>

        {inbox.map((req) => (
          <div
            key={req.requestId}
            className="rounded-2xl bg-[#F8F9FB] border border-slate-200 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827]">
                {req.customerName}
              </span>
              <span className="text-[10px] uppercase font-bold text-amber-700">
                {req.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">{req.summary}</p>
            {req.status === 'pending' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision(req.requestId, 'approved')}
                  style={{ minHeight: '40px' }}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                  data-testid={`approve-req-${req.requestId}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Onayla
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(req.requestId, 'rejected')}
                  style={{ minHeight: '40px' }}
                  className="rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Reddet
                </button>
              </div>
            )}
            {req.status !== 'pending' && (
              <button
                type="button"
                onClick={() => handleClearInboxRequest(req.requestId)}
                className="flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700"
                data-testid={`partner-inbox-clear-${req.requestId}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Temizle / Sil
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Chairside Agenda with Hospitality & Passport Formula Drawer */}
      <div className={`rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm ${
        isInboxFocus ? 'order-2' : 'order-1'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-[#5B5FEF]" />
            {language === 'tr'
              ? 'Koltuk Başı (Chairside) Ajanda & Müşteri Pasaportu'
              : 'Chairside Agenda & Client Passport'}
          </span>
          <button
            type="button"
            aria-expanded={isAgendaAddOpen}
            onClick={() => setIsAgendaAddOpen((current) => !current)}
            className="shrink-0 rounded-lg bg-[#EEF2FF] px-2.5 py-2 text-[10px] font-black text-[#4338CA]"
            data-testid="partner-agenda-add-toggle-btn"
          >
            {isAgendaAddOpen ? 'Formu Kapat' : '+ Yeni Randevu Ekle'}
          </button>
        </div>

        {isAgendaAddOpen && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-indigo-200 bg-[#F8FAFF] p-3">
            <label className="col-span-2 text-[10px] font-bold text-slate-600">
              Müşteri Adı
              <input
                type="text"
                value={newAgendaCustomer}
                onChange={(event) => setNewAgendaCustomer(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                data-testid="partner-agenda-customer-input"
              />
            </label>
            <label className="col-span-2 text-[10px] font-bold text-slate-600">
              Hizmet
              <input
                type="text"
                list="partner-agenda-service-options"
                value={newAgendaService}
                onChange={(event) => setNewAgendaService(event.target.value)}
                placeholder="Katalogdan seçin veya serbest yazın"
                className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                data-testid="partner-agenda-service-input"
              />
              <datalist id="partner-agenda-service-options">
                {visiblePartnerCatalog.map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
              </datalist>
            </label>
            <label className="text-[10px] font-bold text-slate-600">
              Uzman
              <select
                value={newAgendaStaff}
                onChange={(event) => setNewAgendaStaff(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-xs text-slate-900"
                data-testid="partner-agenda-staff-select"
              >
                {staffMembers.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-bold text-slate-600">
              Saat
              <input
                type="time"
                value={newAgendaTime}
                onChange={(event) => setNewAgendaTime(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-xs text-slate-900"
                data-testid="partner-agenda-time-input"
              />
            </label>
            <label className="col-span-2 text-[10px] font-bold text-slate-600">
              Oda / Kaynak (opsiyonel)
              <input
                type="text"
                value={newAgendaResource}
                onChange={(event) => setNewAgendaResource(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                data-testid="partner-agenda-resource-input"
              />
            </label>
            <button
              type="button"
              onClick={handleAddAgendaItem}
              className="col-span-2 min-h-11 rounded-xl bg-[#4F46E5] text-xs font-black text-white"
              data-testid="partner-agenda-add-submit-btn"
            >
              Ajandaya Ekle
            </button>
          </div>
        )}

        {agenda.map((item) => {
          const isExpanded = expandedChairsideId === item.appointmentId;
          return (
            <div
              key={item.appointmentId}
              className="rounded-2xl bg-[#F8F9FB] border border-slate-200 p-3.5 space-y-2.5"
              data-testid={`partner-agenda-item-${item.appointmentId}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[#111827] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#5B5FEF]" />
                  {item.scheduledTime} • {item.customerName}
                </span>
                {item.noShowRiskLevel === 'high' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    No-Show Riski
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-600">
                {item.serviceName} • {item.staffName}
                {item.resourceLabel ? ` • ${item.resourceLabel}` : ''}
              </p>

              {/* VIP Hospitality Badges sent from Customer App */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.vipDrinkPreference && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                    <Coffee className="w-3 h-3" />
                    İkram: {item.vipDrinkPreference}
                  </span>
                )}
                {item.quietSessionRequested && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EEF0FF] text-[#4338CA] border border-indigo-200 text-[10px] font-bold">
                    <VolumeX className="w-3 h-3" />
                    Sessiz Seans Talebi
                  </span>
                )}
              </div>

              {/* Chairside Passport Formula Section */}
              <div className="rounded-xl bg-white border border-slate-200 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#5B5FEF] flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Müşteri Pasaportundaki Son Formül:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedChairsideId(
                        isExpanded ? null : item.appointmentId
                      )
                    }
                    className="text-[10px] font-bold text-[#5B5FEF] underline"
                  >
                    {isExpanded ? 'Gizle' : 'Formül Güncelle'}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-slate-700">
                  {item.lastPassportFormula}
                </p>

                {isExpanded && (
                  <div className="space-y-2 pt-1.5 border-t border-slate-100">
                    <input
                      type="text"
                      value={formulaInput}
                      onChange={(e) => setFormulaInput(e.target.value)}
                      className="w-full rounded-lg bg-[#F8F9FB] border border-slate-200 px-2.5 py-1.5 text-[11px] text-[#111827]"
                      placeholder="Bugün uygulanan boya/bakım formülünü girin..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveFormulaToCustomerPassport(item.appointmentId)
                      }
                      className="w-full py-2 rounded-lg bg-[#5B5FEF] hover:bg-[#4A4EE0] text-white text-[11px] font-bold flex items-center justify-center gap-1.5"
                      data-testid={`save-passport-formula-${item.appointmentId}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Müşterinin Pasaportuna Canlı İşle
                    </button>
                    {savedPassportMessage && (
                      <p className="text-[10px] text-emerald-700 font-semibold">
                        {savedPassportMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { s: 1 as const, label: 'Onaylandı' },
                    { s: 2 as const, label: 'Yola Çık' },
                    { s: 3 as const, label: 'Check-in' },
                    { s: 4 as const, label: 'Koltukta' },
                  ].map((st) => {
                    const currentStage = getLiveStageForAppointment(item.appointmentId);
                    return (
                    <button
                      key={st.s}
                      type="button"
                      onClick={() => updateLiveAppointmentStage(st.s, userRole, item.appointmentId)}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition ${
                        currentStage === st.s
                          ? 'bg-[#EEF0FF] border-[#5B5FEF] text-[#4338CA]'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {st.label}
                    </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                {item.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusUpdate(item.appointmentId, 'completed')
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#5B5FEF] text-white text-[11px] font-bold"
                  >
                    Tamamlandı İşaretle
                  </button>
                )}
                  <button
                    type="button"
                    aria-label={`${item.customerName} randevusunu iptal et ve sil`}
                    onClick={() => handleDeleteAgendaItem(item.appointmentId)}
                    className="flex min-h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-[10px] font-bold text-rose-700"
                    data-testid={`partner-agenda-delete-${item.appointmentId}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    İptal / Sil
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
        </div>
      )}

      {activeManagementTab === 'catalog' && (
        <div
          className="space-y-4"
          role="tabpanel"
          id="partner-management-panel-catalog"
          data-testid="partner-management-catalog-panel"
        >
          <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <PackagePlus className="h-4 w-4 text-[#5B5FEF]" />
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Yeni Hizmet / Ürün Ekle
                </h3>
                <p className="text-[10px] text-slate-500">
                  Katalog kaydı POS ve müşteri vitriniyle ortak kullanılır.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="col-span-2 text-[10px] font-bold text-slate-600">
                Hizmet veya ürün adı
                <input
                  type="text"
                  value={newCatalogName}
                  onChange={(event) => setNewCatalogName(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-200 bg-[#F8FAFC] px-3 text-xs text-slate-900 outline-none focus:border-[#5B5FEF]"
                  placeholder="Örn. İmza Saç Bakımı"
                  data-testid="partner-catalog-name-input"
                />
              </label>
              <label className="text-[10px] font-bold text-slate-600">
                Tür
                <select
                  value={newCatalogKind}
                  onChange={(event) => {
                    const nextKind = event.target.value as 'beauty' | 'product';
                    setNewCatalogKind(nextKind);
                    if (nextKind === 'product') setNewCatalogDuration('0');
                  }}
                  className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-200 bg-[#F8FAFC] px-2 text-xs text-slate-900"
                >
                  <option value="beauty">Hizmet</option>
                  <option value="product">Ürün</option>
                </select>
              </label>
              <label className="text-[10px] font-bold text-slate-600">
                Fiyat (TRY)
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={newCatalogPrice}
                  onChange={(event) => setNewCatalogPrice(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-200 bg-[#F8FAFC] px-3 text-xs text-slate-900"
                  placeholder="1800"
                  data-testid="partner-catalog-price-input"
                />
              </label>
              <label className="col-span-2 text-[10px] font-bold text-slate-600">
                Süre (dakika)
                <input
                  type="number"
                  min="0"
                  step="5"
                  inputMode="numeric"
                  value={newCatalogDuration}
                  onChange={(event) => setNewCatalogDuration(event.target.value)}
                  disabled={newCatalogKind === 'product'}
                  className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-200 bg-[#F8FAFC] px-3 text-xs text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="partner-catalog-duration-input"
                />
              </label>
              <button
                type="button"
                onClick={handleAddCatalogItem}
                className="col-span-2 min-h-11 rounded-xl bg-[#4F46E5] px-4 text-xs font-black text-white"
                data-testid="partner-catalog-add-btn"
              >
                Kataloğa Ekle
              </button>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <Store className="h-4 w-4 text-[#5B5FEF]" />
                Aktif İşletme Kataloğu
              </span>
              <span className="rounded-full bg-[#EEF2FF] px-2 py-1 text-[10px] font-black text-[#4338CA]">
                {visiblePartnerCatalog.length} kalem
              </span>
            </div>
            <div className="space-y-2">
              {visiblePartnerCatalog.map((item) => {
                const isEditing = editingCatalogId === item.id;
                return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3"
                  data-testid={`partner-catalog-item-${item.id}`}
                >
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editingCatalogName}
                        onChange={(event) => setEditingCatalogName(event.target.value)}
                        aria-label="Katalog kalemi adı"
                        className="col-span-2 min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                        data-testid={`partner-catalog-edit-name-${item.id}`}
                      />
                      <input
                        type="number"
                        min="1"
                        value={editingCatalogPrice}
                        onChange={(event) => setEditingCatalogPrice(event.target.value)}
                        aria-label="Katalog kalemi fiyatı"
                        className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                        data-testid={`partner-catalog-edit-price-${item.id}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCatalogEdit(item)}
                        className="min-h-10 rounded-xl bg-[#4F46E5] text-xs font-black text-white"
                        data-testid={`partner-catalog-save-${item.id}`}
                      >
                        Kaydet
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {item.category === 'product'
                        ? 'Perakende ürün'
                        : `${item.durationMinutes ?? 60} dk hizmet`}{' '}
                      • KDV %{item.taxRateBps / 100}
                    </p>
                    <span className="mt-1 block text-sm font-black text-[#4338CA]">
                      {formatPartnerMoney(item.unitPriceMajor)}
                    </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${item.name} katalog kalemini düzenle`}
                        onClick={() => handleStartCatalogEdit(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 bg-white text-[#4338CA]"
                        data-testid={`partner-catalog-edit-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${item.name} katalog kalemini sil`}
                        onClick={() => removeCatalogItem(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700"
                        data-testid={`partner-catalog-delete-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeManagementTab === 'staff_reports' && (
        <div
          className="space-y-4"
          role="tabpanel"
          id="partner-management-panel-staff_reports"
          data-testid="partner-management-staff-reports-panel"
        >
          <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-900">
              <Users className="h-4 w-4 text-[#5B5FEF]" />
              İşletme Uzman Kadrosu
            </span>
              <button
                type="button"
                aria-expanded={isStaffAddOpen}
                onClick={() => setIsStaffAddOpen((current) => !current)}
                className="flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-[#EEF2FF] px-2.5 text-[10px] font-black text-[#4338CA]"
                data-testid="partner-staff-add-toggle-btn"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {isStaffAddOpen ? 'Kapat' : '+ Personel Ekle'}
              </button>
            </div>
            {isStaffAddOpen && (
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border-2 border-indigo-200 bg-[#F8FAFF] p-3">
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(event) => setNewStaffName(event.target.value)}
                  placeholder="Uzman adı soyadı"
                  aria-label="Uzman adı soyadı"
                  className="col-span-2 min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                  data-testid="partner-staff-name-input"
                />
                <input
                  type="text"
                  value={newStaffSpecialty}
                  onChange={(event) => setNewStaffSpecialty(event.target.value)}
                  placeholder="Uzmanlık alanı"
                  aria-label="Uzmanlık alanı"
                  className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                  data-testid="partner-staff-specialty-input"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newStaffCommission}
                  onChange={(event) => setNewStaffCommission(event.target.value)}
                  placeholder="Prim %"
                  aria-label="Prim oranı"
                  className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                  data-testid="partner-staff-commission-input"
                />
                <input
                  type="text"
                  value={newStaffShift}
                  onChange={(event) => setNewStaffShift(event.target.value)}
                  placeholder="Çalışma saati (09:00–19:00)"
                  aria-label="Personel çalışma saati"
                  className="col-span-2 min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900"
                  data-testid="partner-staff-shift-input"
                />
                <button
                  type="button"
                  onClick={handleAddStaffMember}
                  className="col-span-2 min-h-11 rounded-xl bg-[#4F46E5] text-xs font-black text-white"
                  data-testid="partner-staff-add-submit-btn"
                >
                  Uzmanı Ekle
                </button>
              </div>
            )}
            <div className="space-y-2.5">
              {staffMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3"
                  data-testid={`partner-staff-item-${member.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-900">
                        {member.name}
                      </p>
                      <p className="text-[10px] text-slate-500">{member.specialty}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                        {member.workDaysLabel} • {member.shiftHours}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800">
                        Prim %{member.commissionRate}
                      </span>
                      <button
                        type="button"
                        aria-label={`${member.name} personelini sil`}
                        onClick={() => handleDeleteStaffMember(member.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700"
                        data-testid={`partner-staff-delete-${member.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      Prim %
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={member.commissionRate}
                        onChange={(event) =>
                          handleStaffCommissionChange(member.id, event.target.value)
                        }
                        className="mt-1 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        data-testid={`partner-staff-commission-edit-${member.id}`}
                      />
                    </label>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      Çalışma Saatleri
                      <input
                        type="text"
                        value={member.shiftHours}
                        onChange={(event) =>
                          handleStaffShiftChange(member.id, event.target.value)
                        }
                        className="mt-1 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        data-testid={`partner-staff-shift-edit-${member.id}`}
                      />
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={member.active}
                      onClick={() => toggleStaffField(member.id, 'active')}
                      className={`min-h-10 rounded-xl border text-[10px] font-black ${
                        member.active
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-300 bg-white text-slate-500'
                      }`}
                    >
                      {member.active ? 'Aktif' : 'Pasif'}
                    </button>
                    <button
                      type="button"
                      aria-pressed={member.available}
                      onClick={() => toggleStaffField(member.id, 'available')}
                      className={`min-h-10 rounded-xl border text-[10px] font-black ${
                        member.available
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 bg-white text-slate-500'
                      }`}
                    >
                      {member.available ? 'Müsait' : 'Meşgul'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 shadow-sm">
            <span className="mb-3 flex items-center gap-1.5 text-xs font-black text-slate-900">
              <ChartNoAxesColumn className="h-4 w-4 text-[#5B5FEF]" />
              Ciro & Tahsilat Raporu
            </span>
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {REVENUE_PERIODS.map((period) => (
                <button
                  key={period}
                  type="button"
                  aria-pressed={selectedRevenuePeriod === period}
                  onClick={() => setSelectedRevenuePeriod(period)}
                  className={`min-h-10 rounded-xl px-1 text-[9px] font-black transition-colors ${
                    selectedRevenuePeriod === period
                      ? 'bg-[#4F46E5] text-white'
                      : 'border border-indigo-200 bg-[#F8FAFF] text-[#4338CA]'
                  }`}
                  data-testid={`partner-revenue-period-${period}`}
                >
                  {REVENUE_REPORTS[period].label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REVENUE_PERIODS.map((period) => {
                const report = REVENUE_REPORTS[period];
                return (
                  <div
                    key={period}
                    className={`rounded-2xl p-3 ${
                      selectedRevenuePeriod === period
                        ? 'bg-[#E0E7FF] ring-2 ring-[#5B5FEF]'
                        : 'bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-[#4338CA]">
                      {report.label} Ciro
                    </span>
                    <p className="mt-1 text-sm font-black text-[#312E81]">
                      {formatPartnerMoney(report.revenue)}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-600">
                  <TrendingUp className="h-3.5 w-3.5" /> Hizmet Geliri
                </span>
                <strong>{formatPartnerMoney(selectedRevenue.serviceRevenue)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Ürün Geliri</span>
                <strong>{formatPartnerMoney(selectedRevenue.productRevenue)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tahmini Net Gelir</span>
                <strong>
                  {formatPartnerMoney(selectedRevenue.estimatedNetRevenue)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tamamlanan Randevu</span>
                <strong>
                  {selectedRevenue.completedAppointments.toLocaleString('tr-TR')}
                </strong>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Kart / QR', value: 65 },
                { label: 'Nakit', value: 25 },
                { label: 'Cüzdan', value: 10 },
              ].map((method) => (
                <div key={method.label} className="rounded-xl border border-slate-200 p-2">
                  <WalletCards className="mx-auto h-3.5 w-3.5 text-[#5B5FEF]" />
                  <p className="mt-1 text-[9px] text-slate-500">{method.label}</p>
                  <strong className="text-xs text-slate-900">%{method.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeManagementTab === 'storefront' && (
        <div
          className="space-y-4"
          role="tabpanel"
          id="partner-management-panel-storefront"
          data-testid="partner-management-storefront-panel"
        >
          <div
            className={`rounded-3xl border-2 p-4 shadow-sm ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-white'
                : 'border-indigo-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex items-start gap-2">
              <Store className="mt-0.5 h-5 w-5 shrink-0 text-[#5B5FEF]" />
              <div>
                <h3 className="text-sm font-black">Vitrin Kimliği & Özelleştirme (Canlı Mağaza)</h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                  Müşterilerinizin canlı vitrinde gördüğü işletme adını ve iletişim bilgilerini yönetin.
                </p>
              </div>
            </div>

            {storefrontLockStatus.locked ? (
              <div
                className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                data-testid="partner-storefront-edit-lock-banner"
              >
                <p className="flex items-center gap-2 text-xs font-black">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  24 saatlik vitrin düzenleme kilidi aktif
                </p>
                <p className="mt-1 text-[11px] font-semibold">
                  Güvenlik kuralı gereği vitrin değişiklikleri 24 saatte bir yapılabilir.
                  Yeni düzenleme için {storefrontLockStatus.countdownText} kaldı.
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                Vitrininiz düzenlemeye açık. Kaydettiğiniz anda 24 saatlik güvenlik süresi başlar.
              </p>
            )}

            <div className="mt-3 space-y-3">
              <label className="block text-[11px] font-black">
                Storefront İşletme Adı
                <input
                  value={storefrontBusinessName}
                  onChange={(event) => setStorefrontBusinessName(event.target.value)}
                  disabled={storefrontLockStatus.locked}
                  className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  data-testid="partner-storefront-business-name-input"
                />
              </label>
              <label className="block text-[11px] font-black">
                Slogan
                <textarea
                  value={storefrontTagline}
                  onChange={(event) => setStorefrontTagline(event.target.value)}
                  disabled={storefrontLockStatus.locked}
                  rows={3}
                  maxLength={180}
                  className="mt-1 w-full resize-none rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  data-testid="partner-storefront-tagline-input"
                />
              </label>
              <label className="block text-[11px] font-black">
                WhatsApp Numarası
                <input
                  value={storefrontWhatsapp}
                  onChange={(event) =>
                    setStorefrontWhatsapp(sanitizePhoneDigits(event.target.value, 15))
                  }
                  disabled={storefrontLockStatus.locked}
                  inputMode="numeric"
                  className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  data-testid="partner-storefront-whatsapp-input"
                />
              </label>
              <label className="block text-[11px] font-black">
                Vitrin Kapak Fotoğrafı URL (Opsiyonel)
                <input
                  type="url"
                  value={storefrontCoverUrl}
                  onChange={(event) => setStorefrontCoverUrl(event.target.value)}
                  disabled={storefrontLockStatus.locked}
                  placeholder="https://..."
                  className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  data-testid="partner-storefront-cover-url-input"
                />
              </label>
              <div>
                <span className="mb-1.5 block text-[11px] font-black">
                  İmza Rengi (Vitrin Buton & Etiket Aksanı)
                </span>
                <div className="flex flex-wrap gap-2">
                  {SIGNATURE_ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      disabled={storefrontLockStatus.locked}
                      onClick={() => setStorefrontAccentColor(color)}
                      aria-label={`Vitrin rengi ${color}`}
                      aria-pressed={storefrontAccentColor === color}
                      style={{ backgroundColor: color }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition disabled:opacity-50 ${
                        storefrontAccentColor === color
                          ? 'scale-105 border-slate-900 dark:border-white'
                          : 'border-transparent'
                      }`}
                    >
                      {storefrontAccentColor === color ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveStorefrontCustomization}
                disabled={storefrontLockStatus.locked || !storefrontBusinessName.trim()}
                className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="partner-storefront-save-btn"
              >
                Vitrin Değişikliklerini Kaydet
              </button>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 shadow-sm">
            <span className="mb-3 flex items-center gap-1.5 text-xs font-black text-slate-900">
              <Clock className="h-4 w-4 text-[#5B5FEF]" />
              İşletme Çalışma Saatleri
            </span>
            <button
              type="button"
              aria-pressed={dailyHoursMode}
              disabled={storefrontLockStatus.locked}
              onClick={() => setDailyHoursMode((current) => !current)}
              className={`mb-3 flex min-h-11 w-full items-center justify-between rounded-2xl border-2 px-3 text-left text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                dailyHoursMode
                  ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4338CA]'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
              data-testid="partner-hours-daily-mode-toggle"
            >
              <span>Gün Gün Saat Düzenle (Pzt–Paz)</span>
              {dailyHoursMode ? (
                <ToggleRight className="h-6 w-6 text-[#4F46E5]" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-slate-400" />
              )}
            </button>
            <div className="space-y-2">
              {displayedBusinessHours.map(({ key, schedule }) => {
                const isOpen = schedule.open;
                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3"
                  >
                    <button
                      type="button"
                      aria-pressed={isOpen}
                      disabled={storefrontLockStatus.locked}
                      onClick={() =>
                        dailyHoursMode
                          ? handleToggleDailyBusinessDay(key as DailyBusinessHoursKey)
                          : handleToggleBusinessDay(key as BusinessHoursKey)
                      }
                      className="flex min-h-10 w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-55"
                      data-testid={`partner-hours-toggle-${key}`}
                    >
                      <span>
                        <strong className="block text-xs text-slate-900">
                          {schedule.label}
                        </strong>
                        <span className="text-[10px] text-slate-500">
                          {isOpen
                            ? `${schedule.openTime} – ${schedule.closeTime}`
                            : 'Kapalı'}
                        </span>
                      </span>
                      {isOpen ? (
                        <ToggleRight className="h-6 w-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-slate-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
                        <label className="text-[10px] font-bold text-slate-600">
                          Açılış
                          <input
                            type="time"
                            disabled={storefrontLockStatus.locked}
                            value={schedule.openTime}
                            onChange={(event) =>
                              dailyHoursMode
                                ? handleDailyBusinessTimeChange(
                                    key as DailyBusinessHoursKey,
                                    'openTime',
                                    event.target.value
                                  )
                                : handleBusinessTimeChange(
                                    key as BusinessHoursKey,
                                    'openTime',
                                    event.target.value
                                  )
                            }
                            className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-xs text-slate-900 disabled:cursor-not-allowed disabled:opacity-55"
                            data-testid={`partner-hours-open-${key}`}
                          />
                        </label>
                        <label className="text-[10px] font-bold text-slate-600">
                          Kapanış
                          <input
                            type="time"
                            disabled={storefrontLockStatus.locked}
                            value={schedule.closeTime}
                            onChange={(event) =>
                              dailyHoursMode
                                ? handleDailyBusinessTimeChange(
                                    key as DailyBusinessHoursKey,
                                    'closeTime',
                                    event.target.value
                                  )
                                : handleBusinessTimeChange(
                                    key as BusinessHoursKey,
                                    'closeTime',
                                    event.target.value
                                  )
                            }
                            className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-xs text-slate-900 disabled:cursor-not-allowed disabled:opacity-55"
                            data-testid={`partner-hours-close-${key}`}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 shadow-sm">
            <span className="mb-3 flex items-center gap-1.5 text-xs font-black text-slate-900">
              <ImagePlus className="h-4 w-4 text-[#5B5FEF]" />
              İşletme Fotoğraf Galerisi
            </span>
            <label
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-[#F8FAFF] px-3 text-xs font-black text-[#4338CA] ${
                storefrontLockStatus.locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <ImagePlus className="h-4 w-4" />
              Cihazdan Fotoğraf Yükle
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                disabled={storefrontLockStatus.locked}
                onChange={handleGalleryFileChange}
                className="sr-only"
                data-testid="partner-gallery-file-input"
              />
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                disabled={storefrontLockStatus.locked}
                value={galleryUrl}
                onChange={(event) => setGalleryUrl(event.target.value)}
                aria-label="Hızlı fotoğraf URL’si"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-[10px] text-slate-900 disabled:cursor-not-allowed disabled:opacity-55"
                data-testid="partner-gallery-url-input"
              />
              <button
                type="button"
                disabled={storefrontLockStatus.locked}
                onClick={handleAddGalleryUrl}
                className="min-h-11 shrink-0 rounded-xl bg-[#4F46E5] px-3 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="partner-gallery-add-url-btn"
              >
                URL Ekle
              </button>
            </div>

            {venuePhotos.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2" data-testid="partner-gallery-grid">
                {venuePhotos.map((photoUrl, index) => (
                  <div
                    key={photoUrl}
                    className={`relative overflow-hidden rounded-xl border-2 ${
                      selectedGalleryPhoto === photoUrl
                        ? 'border-[#4F46E5]'
                        : 'border-slate-200'
                    }`}
                    data-testid={`partner-gallery-photo-${index}`}
                  >
                    <button
                      type="button"
                      aria-label={`${index + 1}. fotoğrafı paylaşım için seç`}
                      onClick={() => setSelectedGalleryPhoto(photoUrl)}
                      className="block h-24 w-full"
                    >
                      <img
                        src={photoUrl}
                        alt={`İşletme galerisi ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      disabled={storefrontLockStatus.locked}
                      aria-label={`${index + 1}. fotoğrafı sil`}
                      onClick={() => handleRemoveGalleryPhoto(photoUrl)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow disabled:cursor-not-allowed disabled:opacity-45"
                      data-testid={`partner-gallery-delete-${index}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-center text-[10px] text-slate-500">
                Henüz özel işletme fotoğrafı eklenmedi.
              </p>
            )}

            <div className="mt-3 rounded-2xl border border-indigo-200 bg-[#F8FAFF] p-3">
              <span className="flex items-center gap-1 text-[10px] font-black text-[#4338CA]">
                <Megaphone className="h-3.5 w-3.5" /> Topluluk Akışında Paylaş
              </span>
              <textarea
                value={socialCaption}
                onChange={(event) => setSocialCaption(event.target.value)}
                placeholder="Kısa bir açıklama yazın"
                rows={2}
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-900"
                data-testid="partner-social-caption-input"
              />
              <button
                type="button"
                onClick={handlePublishSocialPost}
                disabled={!selectedGalleryPhoto || !socialCaption.trim()}
                className="mt-2 min-h-11 w-full rounded-xl bg-[#4F46E5] text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="partner-publish-social-post-btn"
              >
                Seçili Fotoğrafı Yayınla
              </button>
            </div>
          </div>

          <MobileAIStyleVisualizerPage
            tenantId={tenantId}
            embeddedMode
            isPackageEligible={entitlements.aiVisualizerActiveOnStorefront}
            requiredPlanLabel={entitlements.requiredUpgradeForAi}
            onRequestUpgrade={onRequestPlanUpgrade}
          />

          <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
            <span className="mb-3 flex items-center gap-1.5 text-xs font-black text-amber-950">
              <Sparkles className="h-4 w-4 text-amber-600" />
              Hızlı Kampanya & İndirim Kodları
            </span>
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-stretch gap-2"
                >
                  <button
                    type="button"
                    disabled={storefrontLockStatus.locked}
                    aria-pressed={campaign.active}
                    onClick={() => {
                      if (storefrontLockStatus.locked) return;
                      void savePartnerCampaign(tenantId, {
                        ...campaign,
                        active: !campaign.active,
                      });
                    }}
                    className={`flex min-h-11 min-w-0 flex-1 items-center justify-between rounded-xl border px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                      campaign.active
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-300 bg-white text-slate-500'
                    }`}
                    data-testid={`partner-campaign-toggle-${campaign.id}`}
                  >
                    <span className="truncate">
                      {campaign.code} • %{campaign.discountPercent.toLocaleString('tr-TR')} İndirim
                    </span>
                    <span>{campaign.active ? 'Aktif' : 'Pasif'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={storefrontLockStatus.locked}
                    aria-label={`${campaign.code} kampanyasını sil`}
                    onClick={() => void removePartnerCampaign(campaign.id)}
                    className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid={`partner-campaign-delete-${campaign.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_80px] gap-2">
              <input
                type="text"
                disabled={storefrontLockStatus.locked}
                value={newCampaignCode}
                onChange={(event) => setNewCampaignCode(event.target.value)}
                placeholder="Kampanya kodu"
                aria-label="Yeni kampanya kodu"
                className="min-h-10 min-w-0 rounded-xl border border-amber-300 bg-white px-3 text-xs text-slate-900 disabled:cursor-not-allowed disabled:opacity-55"
                data-testid="partner-campaign-code-input"
              />
              <input
                type="number"
                min="1"
                max="100"
                disabled={storefrontLockStatus.locked}
                value={newCampaignDiscount}
                onChange={(event) => setNewCampaignDiscount(event.target.value)}
                aria-label="İndirim yüzdesi"
                className="min-h-10 rounded-xl border border-amber-300 bg-white px-2 text-xs text-slate-900 disabled:cursor-not-allowed disabled:opacity-55"
                data-testid="partner-campaign-discount-input"
              />
              <button
                type="button"
                disabled={storefrontLockStatus.locked}
                onClick={handleAddCampaign}
                className="col-span-2 min-h-11 rounded-xl bg-amber-600 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="partner-campaign-add-btn"
              >
                Yeni Kampanyayı Etkinleştir
              </button>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <Store className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <h3 className="text-sm font-black text-emerald-950">
                  Doğrudan Mağaza • %0 Komisyon
                </h3>
                <p className="mt-1 text-[11px] text-emerald-800">
                  Bu linkten gelen müşteriler yalnızca sizin vitrininizi ve uygunluk
                  takviminizi görür.
                </p>
                <p className="mt-2 break-all rounded-lg bg-white/70 p-2 text-[10px] font-semibold text-emerald-900">
                  {storefrontUrl}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyStorefrontLink()}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white"
              data-testid="partner-copy-storefront-link-btn"
            >
              <Copy className="h-4 w-4" />
              %0 Komisyon Vitrin Linkini Kopyala
            </button>
          </div>

            <div className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-sm">
              <div
                className="relative p-4 text-white"
                style={{
                  background: `linear-gradient(135deg, ${storefrontCustomization.accentColor || '#312E81'}, #111827)`,
                }}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-100">
                  Müşteri Vitrini Önizlemesi
                </span>
                <h3 className="mt-1 text-lg font-black">
                  {storefrontCustomization.businessName || PARTNER_BUSINESS_NAME}
                </h3>
                <p className="mt-1 text-xs text-indigo-100">
                  {storefrontCustomization.tagline || 'Google doğrulamalı • Bugün açık'}
                </p>
              </div>
              <div className="space-y-2 p-4">
                {visiblePartnerCatalog.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] p-2.5"
                  >
                    <span className="truncate text-[11px] font-bold text-slate-900">
                      {item.name}
                    </span>
                    <strong
                      className="shrink-0 text-xs"
                      style={{ color: storefrontCustomization.accentColor || '#4338CA' }}
                    >
                      {formatPartnerMoney(item.unitPriceMajor)}
                    </strong>
                  </div>
                ))}
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 text-xs font-black"
                  style={{
                    borderColor: storefrontCustomization.accentColor || '#4F46E5',
                    color: storefrontCustomization.accentColor || '#4338CA',
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Müşteri Vitrinini Aç
                </a>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MobilePartnerAgendaAndInboxPage;
