export type MobilePushVerticalCategory =
  | 'booking_waitlist'
  | 'clinic_encounter'
  | 'health_tourism_concierge'
  | 'pos_loyalty';

export type MobilePushPlatform = 'ios' | 'android' | 'web_push';

export interface MobilePushNotificationTemplate {
  eventType:
    | 'WAITLIST_SLOT_OPENED'
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_REMINDER_2H'
    | 'RESCHEDULE_REQUESTED'
    | 'HT_NEW_HOT_LEAD'
    | 'HT_QUOTE_READY'
    | 'HT_VIP_TRANSFER_IMMINENT'
    | 'PACKAGE_CREDIT_DEDUCTED'
    | 'VERIFIED_REVIEW_EARNED_POINTS';
  category: MobilePushVerticalCategory;
  targetMode: 'b2c_customer' | 'b2b_partner';
  titleTr: string;
  bodyTr: string;
  deepLinkUrl: string;
}

export interface MobilePushDispatchResult {
  queued: boolean;
  executionAuthority: 'EXTERNAL_HOLD' | 'LOCAL_SIMULATION';
  reasonCode: 'LIVE_PUSH_CREDENTIALS_REQUIRED' | 'INVALID_INPUT' | 'CROSS_TENANT_BLOCKED';
  template?: MobilePushNotificationTemplate;
}

export function buildMobilePushTemplate(params: {
  eventType: MobilePushNotificationTemplate['eventType'];
  tenantSlug: string;
  referenceId: string;
  displayLabel?: string;
}): MobilePushNotificationTemplate {
  const slug = params.tenantSlug.trim();
  const label = params.displayLabel?.trim() || slug;

  switch (params.eventType) {
    case 'WAITLIST_SLOT_OPENED':
      return {
        eventType: params.eventType,
        category: 'booking_waitlist',
        targetMode: 'b2c_customer',
        titleTr: 'Bekleme Listesi Slotu Açıldı!',
        bodyTr: `${label} için beklediğiniz saat ve oda boşaldı. Hemen kapmak için dokunun.`,
        deepLinkUrl: `randevulari://s/${slug}`,
      };
    case 'HT_NEW_HOT_LEAD':
      return {
        eventType: params.eventType,
        category: 'health_tourism_concierge',
        targetMode: 'b2b_partner',
        titleTr: 'Yeni Sıcak Sağlık Turizmi Talebi',
        bodyTr: `${label} • Yeni yurt dışı hasta başvurusu AI tarafından skorlandı.`,
        deepLinkUrl: `randevulari://partner`,
      };
    case 'HT_QUOTE_READY':
      return {
        eventType: params.eventType,
        category: 'health_tourism_concierge',
        targetMode: 'b2c_customer',
        titleTr: 'Tedavi & VIP Seyahat Teklifiniz Hazır',
        bodyTr: `${label} tarafından hazırlanan paket teklifinizi inceleyip onaylayın.`,
        deepLinkUrl: `randevulari://ht/journey/${params.referenceId}`,
      };
    case 'HT_VIP_TRANSFER_IMMINENT':
      return {
        eventType: params.eventType,
        category: 'health_tourism_concierge',
        targetMode: 'b2c_customer',
        titleTr: 'VIP Transfer Aracınız 30 Dk Sonra Kapıda',
        bodyTr: `Şoför ve koordinatör bilgileriniz canlı seyahat zaman çizelgenizde.`,
        deepLinkUrl: `randevulari://ht/journey/${params.referenceId}`,
      };
    case 'PACKAGE_CREDIT_DEDUCTED':
      return {
        eventType: params.eventType,
        category: 'pos_loyalty',
        targetMode: 'b2c_customer',
        titleTr: 'QR Check-in Tamamlandı • Paket Güncellendi',
        bodyTr: `${label} ziyaretinizde seans paketinizden 1 hak kullanıldı.`,
        deepLinkUrl: `randevulari://appointment/manage/${params.referenceId}`,
      };
    case 'RESCHEDULE_REQUESTED':
      return {
        eventType: params.eventType,
        category: 'booking_waitlist',
        targetMode: 'b2b_partner',
        titleTr: 'Yeni Saat Değişikliği Talebi',
        bodyTr: `${label} için bir müşteri erteleme onayı bekliyor.`,
        deepLinkUrl: `randevulari://partner`,
      };
    default:
      return {
        eventType: params.eventType,
        category: 'booking_waitlist',
        targetMode: 'b2c_customer',
        titleTr: 'LARİ Randevu Güncellemesi',
        bodyTr: `${label} randevu bilgileriniz güncellendi.`,
        deepLinkUrl: `randevulari://appointment/manage/${params.referenceId}`,
      };
  }
}

export function queueMobilePushDispatchDryRun(params: {
  actorTenantId: string;
  targetTenantId: string;
  targetUserId: string;
  eventType: MobilePushNotificationTemplate['eventType'];
  tenantSlug: string;
  referenceId: string;
}): MobilePushDispatchResult {
  if (!params.actorTenantId || !params.targetTenantId || !params.targetUserId) {
    return {
      queued: false,
      executionAuthority: 'LOCAL_SIMULATION',
      reasonCode: 'INVALID_INPUT',
    };
  }

  if (params.actorTenantId !== params.targetTenantId) {
    return {
      queued: false,
      executionAuthority: 'LOCAL_SIMULATION',
      reasonCode: 'CROSS_TENANT_BLOCKED',
    };
  }

  return {
    queued: true,
    executionAuthority: 'EXTERNAL_HOLD',
    reasonCode: 'LIVE_PUSH_CREDENTIALS_REQUIRED',
    template: buildMobilePushTemplate({
      eventType: params.eventType,
      tenantSlug: params.tenantSlug,
      referenceId: params.referenceId,
    }),
  };
}
