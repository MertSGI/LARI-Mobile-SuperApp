import { planService, PricingPlan } from '../planService';
import { repositoryFactory } from '../repositoryFactory';
import { subscriptionService } from '../subscriptionService';
import { tenantRegistrationService } from '../tenantRegistrationService';
import { Appointment, Service, Staff } from '../../types';
import { PartnerCatalogItem } from './voiceCatalogMatcherService';

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

export const mobileCoreBridgeService = {
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
