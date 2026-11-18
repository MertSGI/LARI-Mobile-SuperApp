import { planService, PricingPlan } from '../planService';
import { repositoryFactory } from '../repositoryFactory';
import { subscriptionService } from '../subscriptionService';
import { tenantRegistrationService } from '../tenantRegistrationService';
import { reportingService, MobileRevenueSummary } from '../reportingService';
import { mediaUploadService } from '../mediaUploadService';
import { Appointment, BusinessCustomerCampaign, Service, Staff } from '../../types';
import { PartnerCatalogItem } from './voiceCatalogMatcherService';
import {
  LariBusinessVertical,
  MarketplaceTenantListing,
} from './mobileDiscoveryService';

export interface MobileCoreBookingInput {
  appointmentId: string;
  tenantId: string;
  tenantSlug: string;
  branchLabel: string;
  serviceName: string;
  serviceCategory?: string;
  specialistName: string;
  scheduledDate: string;
  scheduledTime: string;
  priceMajor: number;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface MobilePartnerUpgradeInput {
  planId: string;
  billingPeriod: 'monthly' | 'annual';
  businessName: string;
  category: string;
  city: string;
  district: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  actorUserId?: string;
  staffName?: string;
  vkn?: string;
  accentColor?: string;
  coverPhotoUrl?: string;
  tagline?: string;
  whatsappNumber?: string;
  initialServiceName?: string;
  initialServicePrice?: number;
  initialServiceDuration?: number;
}

export interface MobilePartnerUpgradeResult {
  success: boolean;
  tenantId?: string;
  plan?: PricingPlan;
  subscriptionStatus?: string;
  checkoutUrl?: string;
  requiresCheckout?: boolean;
  requiresTrustedOwnerRole?: boolean;
  initialCatalogItem?: PartnerCatalogItem;
  reasonCode?:
    | 'PLAN_NOT_FOUND'
    | 'TENANT_REGISTRATION_FAILED'
    | 'PAYMENT_OR_SUBSCRIPTION_APPROVAL_REQUIRED'
    | 'PARTNER_ACTIVATION_FAILED';
  message?: string;
}

interface MobileStorefrontPatch {
  businessName?: string;
  tagline?: string;
  accentColor?: string;
  coverPhotoUrl?: string;
  whatsappNumber?: string;
}

export interface MobilePartnerStaffRecord {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
  available: boolean;
  commissionRate: number;
  workDaysLabel: string;
  shiftHours: string;
}

export interface MobileBusinessHoursSchedule {
  label: string;
  open: boolean;
  openTime: string;
  closeTime: string;
}

export interface MobilePartnerCampaignRecord {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

const APPROVED_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
  'manual_active',
  'comped',
]);

function normalizeForMatch(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function splitOwnerName(ownerName: string): { firstName: string; surname: string } {
  const parts = ownerName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || 'LARI', surname: 'Partner' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    surname: parts[parts.length - 1],
  };
}

async function resolveBookingDependencies(input: MobileCoreBookingInput): Promise<{
  service: Service;
  staff: Staff;
}> {
  const catalogRepository = repositoryFactory.getCatalogRepository();
  const [services, staffMembers] = await Promise.all([
    catalogRepository.listServices(input.tenantId),
    catalogRepository.listStaff(input.tenantId),
  ]);
  const targetService = normalizeForMatch(input.serviceName);
  const targetStaff = normalizeForMatch(input.specialistName);
  let service = services.find(
    (candidate) =>
      normalizeForMatch(candidate.name) === targetService ||
      normalizeForMatch(candidate.name_tr || '') === targetService
  );
  let staff = staffMembers.find(
    (candidate) => normalizeForMatch(candidate.name) === targetStaff
  );

  if (!repositoryFactory.isLocalMode() && (!service || !staff)) {
    throw new Error('BOOKING_CATALOG_OR_STAFF_NOT_FOUND');
  }

  if (!service) {
    service = await catalogRepository.createService(input.tenantId, {
      name: input.serviceName,
      name_tr: input.serviceName,
      duration: 60,
      price: input.priceMajor,
      active: true,
      category: input.serviceCategory,
    });
  }
  if (!staff) {
    staff = await catalogRepository.createStaff(input.tenantId, {
      name: input.specialistName,
      title: input.serviceCategory || 'Uzman',
      active: true,
    });
  }
  const eligibleStaff = await catalogRepository.listStaffForService(
    input.tenantId,
    service.id
  );
  if (!eligibleStaff.some((candidate) => candidate.id === staff!.id)) {
    if (!repositoryFactory.isLocalMode()) {
      throw new Error('BOOKING_STAFF_NOT_ELIGIBLE');
    }
    const assign = catalogRepository.assignServiceToStaff as (
      staffId: string,
      serviceId: string,
      tenantId?: string
    ) => Promise<void>;
    await assign.call(catalogRepository, staff.id, service.id, input.tenantId);
  }
  return { service, staff };
}

function mapCatalogPatch(
  patch: Partial<Omit<PartnerCatalogItem, 'id'>>
): Partial<Service> {
  const mapped: Partial<Service> = {};
  if (patch.name !== undefined) {
    mapped.name = patch.name;
    mapped.name_tr = patch.name;
  }
  if (patch.durationMinutes !== undefined) mapped.duration = patch.durationMinutes;
  if (patch.unitPriceMajor !== undefined) mapped.price = patch.unitPriceMajor;
  if (patch.category !== undefined) mapped.category = patch.category;
  return mapped;
}

function resolveTenantId(explicitTenantId?: string): string {
  const tenantRepository = repositoryFactory.getTenantRepository();
  const tenantId = explicitTenantId?.trim() || tenantRepository.getActiveTenantId();
  if (!tenantId) throw new Error('ACTIVE_TENANT_REQUIRED');
  return tenantId;
}

const MOBILE_VERTICALS = new Set<LariBusinessVertical>([
  'beauty_salon',
  'barber',
  'nail_studio',
  'spa_wellness',
  'dental_clinic',
  'aesthetic_clinic',
  'physiotherapy',
  'personal_trainer',
  'consulting',
  'auto_service',
  'pet_grooming',
  'home_repair',
]);

function resolveMarketplaceVertical(value?: string): LariBusinessVertical {
  const normalized = normalizeForMatch(value || '').replace(/[\s&-]+/g, '_');
  if (MOBILE_VERTICALS.has(normalized as LariBusinessVertical)) {
    return normalized as LariBusinessVertical;
  }
  if (/(hair|beauty|güzellik|kuaför)/.test(normalized)) return 'beauty_salon';
  if (/(dent|diş)/.test(normalized)) return 'dental_clinic';
  if (/(auto|oto|servis)/.test(normalized)) return 'auto_service';
  if (/(barber|berber)/.test(normalized)) return 'barber';
  if (/(spa|wellness|masaj)/.test(normalized)) return 'spa_wellness';
  if (/(estetik|aesthetic|derma)/.test(normalized)) return 'aesthetic_clinic';
  if (/(fizyo|physio)/.test(normalized)) return 'physiotherapy';
  if (/(veteriner|pet)/.test(normalized)) return 'pet_grooming';
  if (/(pilates|fitness|trainer)/.test(normalized)) return 'personal_trainer';
  return 'consulting';
}

function priceTierFromServices(services: Service[]): 1 | 2 | 3 {
  if (services.length === 0) return 2;
  const average =
    services.reduce((total, service) => total + (Number(service.price) || 0), 0) /
    services.length;
  if (average >= 2500) return 3;
  if (average >= 1000) return 2;
  return 1;
}

function normalizeTime(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

function parseShiftHours(shiftHours?: string): { startTime: string; endTime: string } {
  const match = shiftHours?.match(/(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})/);
  return {
    startTime: normalizeTime(match?.[1] || '09:00'),
    endTime: normalizeTime(match?.[2] || '18:00'),
  };
}

async function persistStaffAvailability(
  repository: ReturnType<typeof repositoryFactory.getCatalogRepository>,
  tenantId: string,
  staffId: string,
  input: { available?: boolean; shiftHours?: string }
): Promise<void> {
  const existingRules = await repository.listAvailabilityRules(tenantId, staffId);
  const ownRules = existingRules.filter((rule) => rule.staffId === staffId);
  const { startTime, endTime } = parseShiftHours(input.shiftHours);
  for (let weekday = 1; weekday <= 6; weekday += 1) {
    const existing = ownRules.find((rule) => rule.weekday === weekday);
    const patch = {
      weekday,
      staffId,
      is_active: input.available ?? existing?.is_active ?? true,
      start_time: input.shiftHours ? startTime : existing?.start_time || startTime,
      end_time: input.shiftHours ? endTime : existing?.end_time || endTime,
    };
    if (existing?.id) {
      const updateRule = repository.updateAvailabilityRule as (
        ruleId: string,
        rulePatch: typeof patch,
        explicitTenantId?: string
      ) => Promise<void>;
      await updateRule.call(repository, existing.id, patch, tenantId);
    } else {
      await repository.createAvailabilityRule(tenantId, patch);
    }
  }
}

function expandBusinessHours(
  hours: Record<string, MobileBusinessHoursSchedule>
): Array<{ weekday: number; schedule: MobileBusinessHoursSchedule }> {
  const dailyWeekdays: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };
  if (Object.keys(hours).some((key) => dailyWeekdays[key])) {
    return Object.entries(hours)
      .filter(([key]) => dailyWeekdays[key])
      .map(([key, schedule]) => ({ weekday: dailyWeekdays[key], schedule }));
  }
  const expanded: Array<{ weekday: number; schedule: MobileBusinessHoursSchedule }> = [];
  for (let weekday = 1; weekday <= 5; weekday += 1) {
    if (hours.weekdays) expanded.push({ weekday, schedule: hours.weekdays });
  }
  if (hours.saturday) expanded.push({ weekday: 6, schedule: hours.saturday });
  if (hours.sunday) expanded.push({ weekday: 7, schedule: hours.sunday });
  return expanded;
}

function toCampaignDomain(
  tenantId: string,
  campaign: MobilePartnerCampaignRecord,
  createdAt?: string
): BusinessCustomerCampaign {
  const nowIso = new Date().toISOString();
  return {
    id: campaign.id,
    tenantId,
    name: campaign.code,
    type: 'discount',
    isActive: campaign.active,
    rewardDescription: `%${campaign.discountPercent} indirim`,
    customerReward: `%${campaign.discountPercent} indirim`,
    referredCustomerReward: `%${campaign.discountPercent} indirim`,
    terms: `LARİ Mobile kampanya kodu: ${campaign.code}`,
    createdAt: createdAt || nowIso,
    updatedAt: nowIso,
  };
}

export const mobileCoreBridgeService = {
  async loadMarketplaceListings(
    fallbackListings: MarketplaceTenantListing[]
  ): Promise<MarketplaceTenantListing[]> {
    try {
      const tenantRepository = repositoryFactory.getTenantRepository();
      const profileRepository = repositoryFactory.getBusinessProfileRepository();
      const catalogRepository = repositoryFactory.getCatalogRepository();
      const tenants = (await tenantRepository.listTenants()).filter(
        (tenant) => tenant.status === 'active' || tenant.status === 'trialing'
      );
      const liveListings = (
        await Promise.all(
          tenants.map(async (tenant): Promise<MarketplaceTenantListing | null> => {
            try {
              const [profile, services] = await Promise.all([
                profileRepository.getProfile(tenant.id),
                catalogRepository.listServices(tenant.id, { activeOnly: true }),
              ]);
              if (profile && profile.is_public_profile_enabled === false) return null;
              const fallback = fallbackListings.find(
                (listing) =>
                  listing.tenantId === tenant.id || listing.slug === tenant.slug
              );
              const popularServices = services.slice(0, 4).map((service) => ({
                id: service.id,
                name: service.name_tr || service.name,
                durationMinutes: service.duration,
                priceMajor: service.price,
                currency: 'TRY',
              }));
              return {
                ...(fallback || {}),
                tenantId: tenant.id,
                slug: tenant.slug,
                name:
                  profile?.public_display_name ||
                  tenant.public_display_name ||
                  tenant.branding?.businessName ||
                  tenant.name,
                vertical: resolveMarketplaceVertical(
                  profile?.business_category || tenant.category
                ),
                city: profile?.city || tenant.city || fallback?.city || 'İstanbul',
                district:
                  profile?.district || tenant.district || fallback?.district || 'Merkez',
                latitude: fallback?.latitude ?? 41.0082,
                longitude: fallback?.longitude ?? 28.9784,
                rating: fallback?.rating ?? 4.5,
                reviewCount: fallback?.reviewCount ?? 0,
                priceTier: fallback?.priceTier ?? priceTierFromServices(services),
                availableToday: fallback?.availableToday ?? true,
                popularServices:
                  popularServices.length > 0
                    ? popularServices
                    : fallback?.popularServices || [],
              };
            } catch {
              return null;
            }
          })
        )
      ).filter((listing): listing is MarketplaceTenantListing => listing !== null);

      const liveByIdentity = new Map<string, MarketplaceTenantListing>();
      liveListings.forEach((listing) => {
        liveByIdentity.set(listing.tenantId, listing);
        liveByIdentity.set(listing.slug, listing);
      });
      const fallbackTenantIds = new Set(fallbackListings.map((item) => item.tenantId));
      const fallbackSlugs = new Set(fallbackListings.map((item) => item.slug));
      const mergedFallbacks = fallbackListings.map(
        (fallback) =>
          liveByIdentity.get(fallback.tenantId) || liveByIdentity.get(fallback.slug) || fallback
      );
      const appendedLive = liveListings
        .filter(
          (listing) =>
            !fallbackTenantIds.has(listing.tenantId) && !fallbackSlugs.has(listing.slug)
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
      return [...mergedFallbacks, ...appendedLive];
    } catch {
      return fallbackListings.slice();
    }
  },

  async addPartnerStaffMember(
    tenantId: string,
    input: Omit<MobilePartnerStaffRecord, 'id'>
  ): Promise<MobilePartnerStaffRecord> {
    const repository = repositoryFactory.getCatalogRepository();
    const created = await repository.createStaff(tenantId, {
      name: input.name,
      title: input.specialty,
      active: input.active,
    });
    await persistStaffAvailability(repository, tenantId, created.id, input);
    return { ...input, id: created.id };
  },

  async updatePartnerStaffMember(
    tenantId: string,
    staffId: string,
    patch: Partial<Omit<MobilePartnerStaffRecord, 'id'>>
  ): Promise<void> {
    const repository = repositoryFactory.getCatalogRepository();
    const update = repository.updateStaff as (
      id: string,
      staffPatch: Partial<Staff>,
      explicitTenantId?: string
    ) => Promise<Staff | null>;
    if (
      patch.name !== undefined ||
      patch.specialty !== undefined ||
      patch.active !== undefined
    ) {
      const updated = await update.call(
        repository,
        staffId,
        {
          name: patch.name,
          title: patch.specialty,
          active: patch.active,
        },
        tenantId
      );
      if (!updated) throw new Error('STAFF_UPDATE_FAILED');
    }
    if (patch.available !== undefined || patch.shiftHours !== undefined) {
      await persistStaffAvailability(repository, tenantId, staffId, patch);
    }
  },

  async removePartnerStaffMember(tenantId: string, staffId: string): Promise<void> {
    const repository = repositoryFactory.getCatalogRepository();
    const remove = repository.deleteOrDeactivateStaff as (
      id: string,
      explicitTenantId?: string
    ) => Promise<boolean>;
    if (!(await remove.call(repository, staffId, tenantId))) {
      throw new Error('STAFF_REMOVE_FAILED');
    }
  },

  async savePartnerBusinessHours(
    tenantId: string,
    hours: Record<string, MobileBusinessHoursSchedule>
  ): Promise<void> {
    const repository = repositoryFactory.getCatalogRepository();
    const expanded = expandBusinessHours(hours);
    if (expanded.length === 0) throw new Error('BUSINESS_HOURS_REQUIRED');
    const allRules = await repository.listAvailabilityRules(tenantId);
    const tenantRules = allRules.filter((rule) => !rule.staffId);
    const toPatch = ({ weekday, schedule }: (typeof expanded)[number]) => ({
      weekday,
      is_active: schedule.open,
      start_time: normalizeTime(schedule.openTime),
      end_time: normalizeTime(schedule.closeTime),
    });

    const handledWeekdays = new Set<number>();
    if (tenantRules.length > 0) {
      const firstRule = tenantRules[0];
      const firstEntry =
        expanded.find((entry) => entry.weekday === firstRule.weekday) || expanded[0];
      await repository.updateAvailability(tenantId, toPatch(firstEntry));
      handledWeekdays.add(firstEntry.weekday);
    } else if (allRules.length === 0) {
      await repository.updateAvailability(tenantId, toPatch(expanded[0]));
      handledWeekdays.add(expanded[0].weekday);
    } else {
      const firstRule = allRules[0];
      await repository.updateAvailability(tenantId, {
        weekday: firstRule.weekday,
        is_active: firstRule.is_active,
        start_time: firstRule.start_time,
        end_time: firstRule.end_time,
      });
    }

    const refreshedRules = (await repository.listAvailabilityRules(tenantId)).filter(
      (rule) => !rule.staffId
    );
    for (const entry of expanded) {
      if (handledWeekdays.has(entry.weekday)) continue;
      const existing = refreshedRules.find((rule) => rule.weekday === entry.weekday);
      if (existing?.id) {
        const updateRule = repository.updateAvailabilityRule as (
          ruleId: string,
          rulePatch: Record<string, unknown>,
          explicitTenantId?: string
        ) => Promise<void>;
        await updateRule.call(repository, existing.id, toPatch(entry), tenantId);
      } else {
        await repository.createAvailabilityRule(tenantId, {
          ...toPatch(entry),
          staffId: null,
        });
      }
    }
  },

  async savePartnerCampaign(
    tenantId: string,
    campaign: MobilePartnerCampaignRecord
  ): Promise<void> {
    const repository = repositoryFactory.getCampaignRepository();
    const existing = (await repository.listCampaigns(tenantId)).find(
      (item) => item.id === campaign.id
    );
    await repository.saveCampaign(
      tenantId,
      toCampaignDomain(tenantId, campaign, existing?.createdAt)
    );
  },

  async removePartnerCampaign(campaignId: string): Promise<void> {
    const removed = await repositoryFactory.getCampaignRepository().deleteCampaign(campaignId);
    if (!removed) throw new Error('CAMPAIGN_REMOVE_FAILED');
  },

  async uploadPartnerGalleryImage(tenantId: string, file: File): Promise<string> {
    return mediaUploadService.uploadGalleryImage(tenantId, file);
  },

  async loadPartnerRevenueSummary(
    tenantId: string,
    localFallback: MobileRevenueSummary
  ): Promise<MobileRevenueSummary> {
    if (repositoryFactory.isLocalMode()) {
      return JSON.parse(JSON.stringify(localFallback)) as MobileRevenueSummary;
    }
    const [appointments, services] = await Promise.all([
      repositoryFactory.getBookingRepository().listAppointments(tenantId),
      repositoryFactory.getCatalogRepository().listServices(tenantId),
    ]);
    return reportingService.getMobileRevenueSummary(appointments, services);
  },

  getPartnerPlans(): PricingPlan[] {
    return planService.getActivePlans();
  },

  async confirmBooking(input: MobileCoreBookingInput): Promise<{ appointmentId: string }> {
    const bookingRepository = repositoryFactory.getBookingRepository();
    const { service, staff } = await resolveBookingDependencies(input);

    if (repositoryFactory.isSupabaseMode() && bookingRepository.createPublicBooking) {
      const result = await bookingRepository.createPublicBooking({
        slug: input.tenantSlug,
        serviceId: service.id,
        staffId: staff.id,
        appointmentDate: input.scheduledDate,
        appointmentTime: input.scheduledTime,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        requiredConsent: true,
        reminderConsent: true,
        idempotencyKey: input.appointmentId,
      });
      if (!result.success || !result.appointmentId) {
        throw new Error(result.reasonCode || 'BOOKING_CREATE_FAILED');
      }
      return { appointmentId: result.appointmentId };
    }

    const appointment = await bookingRepository.createAppointment(input.tenantId, {
      branchId: undefined,
      userId: input.userId,
      customerId: input.userId,
      user_name: input.customerName,
      user_email: input.customerEmail,
      phone: input.customerPhone,
      serviceId: service.id,
      staffId: staff.id,
      date: input.scheduledDate,
      time: input.scheduledTime,
      durationMinutes: service.duration,
      status: 'confirmed',
      notes: `LARI Mobile | ${input.branchLabel}`,
      syncedToGoogle: false,
      source: 'lari_mobile_superapp',
    });
    return { appointmentId: appointment.id };
  },

  async rescheduleBooking(input: {
    tenantId: string;
    appointmentId: string;
    scheduledDate: string;
    scheduledTime: string;
  }): Promise<void> {
    const repository = repositoryFactory.getBookingRepository();
    const update = repository.updateAppointment as (
      appointmentId: string,
      patch: Partial<Appointment>,
      tenantId?: string
    ) => Promise<Appointment | null>;
    const updated = await update.call(
      repository,
      input.appointmentId,
      { date: input.scheduledDate, time: input.scheduledTime, status: 'confirmed' },
      input.tenantId
    );
    if (!updated) throw new Error('BOOKING_RESCHEDULE_FAILED');
  },

  async cancelBooking(input: {
    tenantId: string;
    appointmentId: string;
    reason?: string;
  }): Promise<void> {
    const repository = repositoryFactory.getBookingRepository();
    const cancel = repository.cancelAppointment as (
      appointmentId: string,
      reason?: string,
      cancelledBy?: 'customer' | 'salon' | 'system',
      tenantId?: string
    ) => Promise<boolean>;
    const cancelled = await cancel.call(
      repository,
      input.appointmentId,
      input.reason,
      'customer',
      input.tenantId
    );
    if (!cancelled) throw new Error('BOOKING_CANCEL_FAILED');
  },

  async addCatalogItem(
    item: Omit<PartnerCatalogItem, 'id'>
  ): Promise<PartnerCatalogItem> {
    const repository = repositoryFactory.getCatalogRepository();
    const created = await repository.createService(item.tenantId, {
      name: item.name,
      name_tr: item.name,
      duration: item.durationMinutes || 0,
      price: item.unitPriceMajor,
      active: true,
      category: item.category,
    });
    return { ...item, id: created.id };
  },

  async updateCatalogItem(
    tenantId: string,
    id: string,
    patch: Partial<Omit<PartnerCatalogItem, 'id'>>
  ): Promise<void> {
    const repository = repositoryFactory.getCatalogRepository();
    const update = repository.updateService as (
      serviceId: string,
      patch: Partial<Service>,
      tenantId?: string
    ) => Promise<Service | null>;
    const updated = await update.call(repository, id, mapCatalogPatch(patch), tenantId);
    if (!updated) throw new Error('CATALOG_UPDATE_FAILED');
  },

  async removeCatalogItem(tenantId: string, id: string): Promise<void> {
    const repository = repositoryFactory.getCatalogRepository();
    const removed = await repository.archiveService(tenantId, id);
    if (!removed) throw new Error('CATALOG_REMOVE_FAILED');
  },

  async saveStorefrontCustomization(
    patch: MobileStorefrontPatch,
    explicitTenantId?: string
  ): Promise<void> {
    const tenantId = resolveTenantId(explicitTenantId);
    const profileRepository = repositoryFactory.getBusinessProfileRepository();
    const tenantRepository = repositoryFactory.getTenantRepository();
    const existing = await profileRepository.getProfile(tenantId);
    const nowIso = new Date().toISOString();
    const profile = await profileRepository.updateProfile(tenantId, {
      id: existing?.id || `profile-${tenantId}`,
      tenant_id: tenantId,
      public_display_name: patch.businessName,
      short_description: patch.tagline,
      cover_image_url: patch.coverPhotoUrl,
      cover_images: patch.coverPhotoUrl ? [patch.coverPhotoUrl] : existing?.cover_images,
      whatsapp_number: patch.whatsappNumber,
      is_public_profile_enabled: existing?.is_public_profile_enabled ?? false,
      created_at: existing?.created_at || nowIso,
      updated_at: nowIso,
    });
    if (!profile) throw new Error('STOREFRONT_SAVE_FAILED');
    await tenantRepository.updateTenant(tenantId, {
      name: patch.businessName,
      public_display_name: patch.businessName,
      branding: {
        ...(await tenantRepository.getTenantById(tenantId))?.branding,
        tenantId,
        businessName: patch.businessName || profile.public_display_name || tenantId,
        tagline: patch.tagline,
        whatsappNumber: patch.whatsappNumber,
        primaryColor: patch.accentColor,
        logoUrl: patch.coverPhotoUrl,
      },
    });
  },

  async upgradePartnerAccount(
    input: MobilePartnerUpgradeInput
  ): Promise<MobilePartnerUpgradeResult> {
    const plan = planService.getPlan(input.planId);
    if (!plan || plan.isActive === false) {
      return { success: false, reasonCode: 'PLAN_NOT_FOUND' };
    }

    try {
      const tenantRepository = repositoryFactory.getTenantRepository();
      const subscriptionRepository = repositoryFactory.getSubscriptionRepository();
      const { firstName, surname } = splitOwnerName(input.ownerName);
      let tenantId: string;

      if (repositoryFactory.isLocalMode()) {
        const registration = await tenantRegistrationService.registerTenant({
          ownerName: firstName,
          ownerSurname: surname,
          ownerEmail: input.ownerEmail,
          ownerPhone: input.ownerPhone,
          password: '',
          businessName: input.businessName,
          businessDisplayName: input.businessName,
          businessCategory: input.category,
          city: input.city,
          planId: plan.id,
          billingPeriod: input.billingPeriod,
          acceptTerms: true,
        });
        if (!registration.success || !registration.tenantId) {
          return {
            success: false,
            reasonCode: 'TENANT_REGISTRATION_FAILED',
            message: registration.error,
          };
        }
        tenantId = registration.tenantId;
      } else {
        const created = await tenantRepository.createTenant({
          name: input.businessName,
          public_display_name: input.businessName,
          official_business_name: input.businessName,
          owner_user_id: input.actorUserId,
          category: input.category,
          city: input.city,
          district: input.district,
          phone: input.ownerPhone,
          status: 'none',
          subscription_status: 'pending_checkout',
          onboarding_status: 'setup_in_progress',
          branding: {
            tenantId: '',
            businessName: input.businessName,
            primaryColor: input.accentColor || '#4F46E5',
            tagline: input.tagline,
            whatsappNumber: input.whatsappNumber,
            logoUrl: input.coverPhotoUrl,
          },
        });
        tenantId = created.id;
        await subscriptionRepository.createPendingCheckout(tenantId, plan.id);
      }

      tenantRepository.setActiveTenant(tenantId);
      await this.saveStorefrontCustomization(
        {
          businessName: input.businessName,
          tagline: input.tagline,
          accentColor: input.accentColor,
          coverPhotoUrl: input.coverPhotoUrl,
          whatsappNumber: input.whatsappNumber,
        },
        tenantId
      );

      const checkoutUrl = await subscriptionService.startCheckout(tenantId, plan.id, {
        name: input.ownerName,
        email: input.ownerEmail,
        phone: input.ownerPhone,
        billingPeriod: input.billingPeriod,
      });
      const [serviceSubscription, repositorySubscription] = await Promise.all([
        subscriptionService.getSubscriptionState(tenantId),
        subscriptionRepository.getSubscription(tenantId),
      ]);
      const subscriptionStatus = String(
        serviceSubscription?.status || repositorySubscription?.status || 'pending_checkout'
      );

      if (!APPROVED_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
        return {
          success: false,
          tenantId,
          plan,
          subscriptionStatus,
          checkoutUrl: checkoutUrl || undefined,
          requiresCheckout: true,
          reasonCode: 'PAYMENT_OR_SUBSCRIPTION_APPROVAL_REQUIRED',
          message: 'Ödeme ve abonelik onayı tamamlanmadan Partner yetkisi açılamaz.',
        };
      }

      await tenantRepository.updateTenant(tenantId, {
        status: subscriptionStatus === 'trialing' ? 'trialing' : 'active',
        subscription_status: subscriptionStatus,
        onboarding_status: 'active',
      });

      let initialCatalogItem: PartnerCatalogItem | undefined;
      if (input.initialServiceName && input.initialServicePrice) {
        initialCatalogItem = await this.addCatalogItem({
          tenantId,
          name: input.initialServiceName,
          category: 'beauty',
          unitPriceMajor: input.initialServicePrice,
          durationMinutes: input.initialServiceDuration || 60,
          currency: 'TRY',
          taxRateBps: 2000,
          commissionRateBps: 2500,
          packageEligible: true,
          keywords: input.initialServiceName
            .toLocaleLowerCase('tr-TR')
            .split(/\s+/)
            .filter(Boolean),
        });
      }

      await repositoryFactory.getAuditEventRepository().createEvent({
        tenantId,
        actorType: repositoryFactory.isLocalMode() ? 'local_simulation' : 'tenant_owner',
        actorId: input.actorUserId || 'mobile-local-user',
        category: 'subscription',
        severity: 'info',
        action: 'mobile_partner_account_activated',
        status: 'recorded',
        entityType: 'Subscription',
        entityId: tenantId,
        summary: 'Mobile Partner onboarding completed after subscription approval.',
        safeDetails: {
          planId: plan.id,
          billingPeriod: input.billingPeriod,
          subscriptionStatus,
        },
        redactionApplied: true,
      });

      return {
        success: true,
        tenantId,
        plan,
        subscriptionStatus,
        initialCatalogItem,
        requiresTrustedOwnerRole: repositoryFactory.isSupabaseMode(),
      };
    } catch (error) {
      return {
        success: false,
        reasonCode: 'PARTNER_ACTIVATION_FAILED',
        message: error instanceof Error ? error.message : 'Partner activation failed.',
      };
    }
  },

  async recordAccountDeletion(input: {
    tenantId: string;
    userId: string;
    outcome: string;
    auditReceiptId?: string;
    medicalRecordsAnonymizedOnly: boolean;
  }): Promise<void> {
    await repositoryFactory.getAuditEventRepository().createEvent({
      id: input.auditReceiptId,
      tenantId: input.tenantId,
      actorType: 'customer',
      actorId: input.userId,
      category: 'auth',
      severity: 'warning',
      action: 'mobile_account_deletion_completed',
      status: 'recorded',
      entityType: 'UserAccount',
      entityId: input.userId,
      summary: 'Mobile account deletion result recorded.',
      safeDetails: {
        outcome: input.outcome,
        medicalRecordsAnonymizedOnly: input.medicalRecordsAnonymizedOnly,
      },
      redactionApplied: true,
    });
  },
};

export default mobileCoreBridgeService;
