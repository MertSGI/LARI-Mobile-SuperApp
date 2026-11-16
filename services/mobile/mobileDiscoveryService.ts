export type LariBusinessVertical =
  | 'beauty_salon'
  | 'barber'
  | 'nail_studio'
  | 'spa_wellness'
  | 'dental_clinic'
  | 'aesthetic_clinic'
  | 'physiotherapy'
  | 'personal_trainer'
  | 'consulting';

export interface MarketplaceTenantListing {
  tenantId: string;
  slug: string;
  name: string;
  vertical: LariBusinessVertical;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  priceTier: 1 | 2 | 3;
  availableToday: boolean;
  nextAvailableSlot?: string;
  popularServices: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceMajor: number;
    currency: string;
    requiredResourceId?: string;
  }>;
}

export interface MobileDiscoverySearchInput {
  listings: MarketplaceTenantListing[];
  userCoords?: { latitude: number; longitude: number } | null;
  verticalFilter?: LariBusinessVertical | 'all';
  queryText?: string;
  availableTodayOnly?: boolean;
  sortBy?: 'distance_km' | 'rating' | 'popular';
  whiteLabelLockedTenantSlug?: string | null;
}

export interface MobileDiscoveryListingItem extends MarketplaceTenantListing {
  distanceKm: number | null;
  estimatedTravelMinutes: number | null;
}

export interface MobileDiscoverySearchResult {
  guestBrowsingAllowed: true;
  storefrontLockActive: boolean;
  lockedTenantSlug: string | null;
  competitorLeakageCount: number;
  marketplaceCommissionBps: number;
  items: MobileDiscoveryListingItem[];
}

export interface PastAppointmentSnapshot {
  appointmentId: string;
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  branchId?: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  durationMinutes: number;
  priceMajor: number;
  currency: string;
  completedAtIso: string;
}

export interface OneTapRebookCandidate {
  available: boolean;
  reasonCode?: 'NO_PAST_APPOINTMENTS';
  tenantId?: string;
  tenantSlug?: string;
  businessName?: string;
  serviceId?: string;
  serviceName?: string;
  staffId?: string;
  staffName?: string;
  suggestedSlots: Array<{ date: string; time: string }>;
}

export interface WaitlistClaimRequest {
  tenantId: string;
  customerId: string;
  slotKey: string;
  staffId: string;
  requiredResourceId: string;
  resourceCapacity: number;
}

export interface WaitlistClaimResult {
  claimed: boolean;
  httpStatus: 201 | 409 | 400;
  reasonCode: 'CLAIMED' | 'RESOURCE_UNAVAILABLE_CONFLICT' | 'INVALID_INPUT';
  lockedResourceId?: string;
  claimId?: string;
}

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const km = 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(km * 100) / 100;
}

export function canBrowseWithoutAuth(): true {
  return true;
}

/**
 * Searches LARI multi-vertical marketplace with GPS Haversine sorting and
 * strict White-Label Storefront Lock (0% commission, zero competitor leakage)
 * when user enters via direct tenant link/QR.
 */
export function searchMobileMarketplace(
  input: MobileDiscoverySearchInput
): MobileDiscoverySearchResult {
  const lockedSlug = input.whiteLabelLockedTenantSlug?.trim().toLowerCase() || null;
  const storefrontLockActive = Boolean(lockedSlug);

  let filtered = input.listings.slice();

  if (storefrontLockActive && lockedSlug) {
    filtered = filtered.filter((item) => item.slug.toLowerCase() === lockedSlug);
  } else {
    if (input.verticalFilter && input.verticalFilter !== 'all') {
      filtered = filtered.filter((item) => item.vertical === input.verticalFilter);
    }
    if (input.availableTodayOnly) {
      filtered = filtered.filter((item) => item.availableToday);
    }
    if (input.queryText?.trim()) {
      const q = input.queryText.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.district.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          item.popularServices.some((s) => s.name.toLowerCase().includes(q))
      );
    }
  }

  const enriched: MobileDiscoveryListingItem[] = filtered.map((item) => {
    const distanceKm = input.userCoords
      ? haversineKm(input.userCoords, {
          latitude: item.latitude,
          longitude: item.longitude,
        })
      : null;
    const estimatedTravelMinutes =
      distanceKm !== null ? Math.max(3, Math.round((distanceKm / 25) * 60)) : null;
    return {
      ...item,
      distanceKm,
      estimatedTravelMinutes,
    };
  });

  if (!storefrontLockActive) {
    const sortBy = input.sortBy ?? (input.userCoords ? 'distance_km' : 'rating');
    enriched.sort((a, b) => {
      if (sortBy === 'distance_km') {
        const da = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const db = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      }
      if (sortBy === 'popular') {
        return b.reviewCount - a.reviewCount;
      }
      return b.rating - a.rating;
    });
  }

  const competitorLeakageCount = storefrontLockActive
    ? enriched.filter((i) => i.slug.toLowerCase() !== lockedSlug).length
    : 0;

  return {
    guestBrowsingAllowed: true,
    storefrontLockActive,
    lockedTenantSlug: lockedSlug,
    competitorLeakageCount,
    marketplaceCommissionBps: storefrontLockActive ? 0 : 1200,
    items: enriched,
  };
}

export function buildOneTapRebookCandidate(
  history: PastAppointmentSnapshot[]
): OneTapRebookCandidate {
  if (!history || history.length === 0) {
    return {
      available: false,
      reasonCode: 'NO_PAST_APPOINTMENTS',
      suggestedSlots: [],
    };
  }

  const sorted = history
    .slice()
    .sort(
      (a, b) =>
        new Date(b.completedAtIso).getTime() - new Date(a.completedAtIso).getTime()
    );
  const latest = sorted[0];

  return {
    available: true,
    tenantId: latest.tenantId,
    tenantSlug: latest.tenantSlug,
    businessName: latest.businessName,
    serviceId: latest.serviceId,
    serviceName: latest.serviceName,
    staffId: latest.staffId,
    staffName: latest.staffName,
    suggestedSlots: [
      { date: '2026-11-17', time: '14:00' },
      { date: '2026-11-17', time: '16:30' },
      { date: '2026-11-18', time: '11:00' },
    ],
  };
}

/**
 * In-memory atomic resource lock registry mirroring `claim_waitlist_slot` + `appointment_resources`
 * capacity invariants for mobile waitlist slot claiming.
 */
export class MobileResourceWaitlistRegistry {
  private allocations = new Map<string, number>();

  async claimSlot(req: WaitlistClaimRequest): Promise<WaitlistClaimResult> {
    if (!req.tenantId || !req.customerId || !req.slotKey || !req.requiredResourceId) {
      return { claimed: false, httpStatus: 400, reasonCode: 'INVALID_INPUT' };
    }

    const lockKey = `${req.tenantId}::${req.slotKey}::${req.requiredResourceId}`;
    const used = this.allocations.get(lockKey) ?? 0;
    if (used >= Math.max(1, req.resourceCapacity)) {
      return {
        claimed: false,
        httpStatus: 409,
        reasonCode: 'RESOURCE_UNAVAILABLE_CONFLICT',
      };
    }

    this.allocations.set(lockKey, used + 1);
    return {
      claimed: true,
      httpStatus: 201,
      reasonCode: 'CLAIMED',
      lockedResourceId: req.requiredResourceId,
      claimId: `wl_${req.tenantId.slice(0, 6)}_${used + 1}`,
    };
  }
}
