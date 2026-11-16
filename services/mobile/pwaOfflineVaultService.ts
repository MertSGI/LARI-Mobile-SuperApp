export interface OfflineAppointmentPass {
  tenantId: string;
  appointmentId: string;
  startsAt: string;
  signedQrPayload: string;
  customerName?: string;
  serviceName?: string;
  branchName?: string;
  [key: string]: unknown;
}

export interface OfflineHtItineraryPass {
  tenantId: string;
  itineraryId: string;
  approvedQuoteId: string;
  approvedQuote: unknown;
  itinerary: unknown;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface OfflineStalenessStatus {
  lastSyncedAt: string | null;
  isStale: boolean;
  ageMs: number | null;
}

export interface OfflineVaultStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface VaultEnvelope<T> {
  version: 1;
  tenantId: string;
  kind: VaultKind;
  data: T;
  integrity: string;
}

type VaultKind = 'appointments' | 'ht-itinerary' | 'sync';

const STORAGE_PREFIX = 'lari:pwa-offline-vault:v1';
const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;
const sharedMemory = new Map<string, string>();

export class MemoryOfflineVaultStorage implements OfflineVaultStorage {
  private readonly values: Map<string, string>;

  constructor(values: Map<string, string> = new Map()) {
    this.values = values;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  entries(): Array<[string, string]> {
    return [...this.values.entries()];
  }
}

function resolveStorage(): OfflineVaultStorage {
  try {
    const candidate = globalThis.localStorage;
    if (candidate) {
      const probe = `${STORAGE_PREFIX}:probe`;
      candidate.setItem(probe, '1');
      candidate.removeItem(probe);
      return candidate;
    }
  } catch {
    // Privacy modes can expose localStorage while denying access.
  }
  return new MemoryOfflineVaultStorage(sharedMemory);
}

function requireTenantId(tenantId: string): string {
  const normalized = tenantId?.trim();
  if (!normalized) throw new Error('TENANT_ID_REQUIRED');
  return normalized;
}

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isAppointmentPass(value: unknown, tenantId: string): value is OfflineAppointmentPass {
  if (!value || typeof value !== 'object') return false;
  const pass = value as Partial<OfflineAppointmentPass>;
  return pass.tenantId === tenantId
    && typeof pass.appointmentId === 'string'
    && typeof pass.startsAt === 'string'
    && typeof pass.signedQrPayload === 'string'
    && pass.signedQrPayload.length > 0;
}

function isHtPass(value: unknown, tenantId: string): value is OfflineHtItineraryPass {
  if (!value || typeof value !== 'object') return false;
  const pass = value as Partial<OfflineHtItineraryPass>;
  return pass.tenantId === tenantId
    && typeof pass.itineraryId === 'string'
    && typeof pass.approvedQuoteId === 'string'
    && pass.itinerary !== undefined
    && pass.approvedQuote !== undefined;
}

export class PwaOfflineVaultService {
  private readonly storage: OfflineVaultStorage;

  constructor(storage: OfflineVaultStorage = resolveStorage()) {
    this.storage = storage;
  }

  private key(tenantId: string, kind: VaultKind): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(requireTenantId(tenantId))}:${kind}`;
  }

  private write<T>(tenantId: string, kind: VaultKind, data: T): void {
    const normalizedTenantId = requireTenantId(tenantId);
    const serializedData = JSON.stringify(data);
    const envelope: VaultEnvelope<T> = {
      version: 1,
      tenantId: normalizedTenantId,
      kind,
      data,
      integrity: checksum(`${normalizedTenantId}|${kind}|${serializedData}`)
    };
    this.storage.setItem(this.key(normalizedTenantId, kind), JSON.stringify(envelope));
  }

  private read<T>(tenantId: string, kind: VaultKind, validate: (data: unknown) => data is T): T | null {
    const normalizedTenantId = requireTenantId(tenantId);
    const storageKey = this.key(normalizedTenantId, kind);
    const raw = this.storage.getItem(storageKey);
    if (!raw) return null;

    try {
      const envelope = JSON.parse(raw) as Partial<VaultEnvelope<unknown>>;
      const serializedData = JSON.stringify(envelope.data);
      const expectedIntegrity = checksum(`${normalizedTenantId}|${kind}|${serializedData}`);
      if (envelope.version !== 1
        || envelope.tenantId !== normalizedTenantId
        || envelope.kind !== kind
        || envelope.integrity !== expectedIntegrity
        || !validate(envelope.data)) {
        this.storage.removeItem(storageKey);
        return null;
      }
      return envelope.data;
    } catch {
      this.storage.removeItem(storageKey);
      return null;
    }
  }

  saveAppointmentPass(pass: OfflineAppointmentPass): void;
  saveAppointmentPass(tenantId: string, pass: OfflineAppointmentPass): void;
  saveAppointmentPass(tenantOrPass: string | OfflineAppointmentPass, suppliedPass?: OfflineAppointmentPass): void {
    const pass = typeof tenantOrPass === 'string' ? suppliedPass : tenantOrPass;
    const tenantId = typeof tenantOrPass === 'string' ? tenantOrPass : tenantOrPass.tenantId;
    if (!pass || !isAppointmentPass(pass, requireTenantId(tenantId))) {
      throw new Error('INVALID_OR_CROSS_TENANT_APPOINTMENT_PASS');
    }
    const passes = this.getAppointmentPasses(tenantId);
    const next = passes.filter(item => item.appointmentId !== pass.appointmentId);
    next.push(pass);
    this.write(tenantId, 'appointments', next);
  }

  cacheUpcomingAppointments(tenantId: string, passes: OfflineAppointmentPass[]): void {
    const normalizedTenantId = requireTenantId(tenantId);
    if (!Array.isArray(passes) || !passes.every(pass => isAppointmentPass(pass, normalizedTenantId))) {
      throw new Error('INVALID_OR_CROSS_TENANT_APPOINTMENT_PASS');
    }
    this.write(normalizedTenantId, 'appointments', passes);
  }

  getAppointmentPasses(tenantId: string): OfflineAppointmentPass[] {
    return this.read(
      tenantId,
      'appointments',
      (data): data is OfflineAppointmentPass[] => Array.isArray(data)
        && data.every(pass => isAppointmentPass(pass, requireTenantId(tenantId)))
    ) ?? [];
  }

  getUpcomingAppointmentPasses(tenantId: string): OfflineAppointmentPass[] {
    return this.getAppointmentPasses(tenantId);
  }

  saveHtItineraryPass(pass: OfflineHtItineraryPass): void;
  saveHtItineraryPass(tenantId: string, pass: OfflineHtItineraryPass): void;
  saveHtItineraryPass(tenantOrPass: string | OfflineHtItineraryPass, suppliedPass?: OfflineHtItineraryPass): void {
    const pass = typeof tenantOrPass === 'string' ? suppliedPass : tenantOrPass;
    const tenantId = typeof tenantOrPass === 'string' ? tenantOrPass : tenantOrPass.tenantId;
    if (!pass || !isHtPass(pass, requireTenantId(tenantId))) {
      throw new Error('INVALID_OR_CROSS_TENANT_HT_ITINERARY_PASS');
    }
    this.write(tenantId, 'ht-itinerary', pass);
  }

  getHtItineraryPass(tenantId: string): OfflineHtItineraryPass | null {
    return this.read(tenantId, 'ht-itinerary', (data): data is OfflineHtItineraryPass => isHtPass(data, requireTenantId(tenantId)));
  }

  markSynced(tenantId: string, syncedAt: string = new Date().toISOString()): void {
    if (!Number.isFinite(Date.parse(syncedAt))) throw new Error('INVALID_SYNC_TIMESTAMP');
    this.write(tenantId, 'sync', syncedAt);
  }

  getLastSyncedAt(tenantId: string): string | null {
    return this.read(tenantId, 'sync', (data): data is string => typeof data === 'string' && Number.isFinite(Date.parse(data)));
  }

  getOfflineStaleness(tenantId: string, staleAfterMs = DEFAULT_STALE_AFTER_MS, nowMs = Date.now()): OfflineStalenessStatus {
    const lastSyncedAt = this.getLastSyncedAt(tenantId);
    if (!lastSyncedAt) return { lastSyncedAt: null, isStale: true, ageMs: null };
    const ageMs = Math.max(0, nowMs - Date.parse(lastSyncedAt));
    return { lastSyncedAt, isStale: ageMs > staleAfterMs, ageMs };
  }

  isOfflineDataStale(tenantId: string, staleAfterMs = DEFAULT_STALE_AFTER_MS, nowMs = Date.now()): boolean {
    return this.getOfflineStaleness(tenantId, staleAfterMs, nowMs).isStale;
  }

  clearTenantData(tenantId: string): void {
    for (const kind of ['appointments', 'ht-itinerary', 'sync'] as const) {
      this.storage.removeItem(this.key(tenantId, kind));
    }
  }

  clearOnLogout(tenantId: string): void {
    this.clearTenantData(tenantId);
  }
}

export const pwaOfflineVaultService = new PwaOfflineVaultService();
