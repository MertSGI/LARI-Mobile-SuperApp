import { getDataSourceMode } from '../dataSourceConfig';
import { supabase } from '../supabaseClient';
import {
  DEFAULT_USER_PROFILE,
  MobileUserProfile,
  validateMobileUserProfile,
} from './mobileRegionCurrencyService';

export type MobileAuthProvider = 'email' | 'google' | 'apple';
export type MobileAuthAccountRole = 'customer' | 'tenant_owner';

export interface MobileAuthUser {
  userId: string;
  email: string;
  fullName: string;
  provider: MobileAuthProvider;
  role: MobileAuthAccountRole;
  tenantId?: string;
  defaultPlanId?: 'baslangic' | 'profesyonel' | 'kurumsal';
  kvkkAccepted: boolean;
  createdAtIso: string;
  lastLoginAtIso: string;
}

export interface MobileStoredAccount {
  user: MobileAuthUser;
  passwordDigest?: string;
  profile: MobileUserProfile;
}

export interface MobileRegistrationPayload {
  provider: MobileAuthProvider;
  profile: MobileUserProfile;
  password?: string;
  passwordConfirm?: string;
  kvkkAccepted: boolean;
  accountRole?: MobileAuthAccountRole;
}

export interface MobileAuthActionResult {
  success: boolean;
  user?: MobileAuthUser;
  profile?: MobileUserProfile;
  needsProfileCompletion?: boolean;
  prefill?: {
    provider: MobileAuthProvider;
    email: string;
    fullName: string;
  };
  errors?: Record<string, string>;
  errorMessage?: string;
}

export const MOBILE_AUTH_STORAGE_KEYS = {
  ACTIVE_USER: 'lari_mobile_auth_user_v1',
  SIGNED_OUT: 'lari_mobile_signed_out_v1',
  ACCOUNTS: 'lari_mobile_registered_accounts_v1',
  USER_PROFILE: 'lari_mobile_user_profile_v1',
} as const;

export const SOCIAL_QUICK_PRESETS: Array<{
  provider: 'google' | 'apple';
  label: string;
  email: string;
  fullName: string;
  profile: MobileUserProfile;
}> = [
  {
    provider: 'google',
    label: 'Google Hesabı',
    email: 'mert@randevulari.com',
    fullName: 'Mert Özçelikbaş',
    profile: { ...DEFAULT_USER_PROFILE },
  },
  {
    provider: 'google',
    label: 'Google Hesabı',
    email: 'ayse.kaya@gmail.com',
    fullName: 'Ayşe Kaya',
    profile: {
      ...DEFAULT_USER_PROFILE,
      fullName: 'Ayşe Kaya',
      email: 'ayse.kaya@gmail.com',
      phoneDigits: '5324441122',
      gender: 'female',
    },
  },
  {
    provider: 'apple',
    label: 'Apple ID',
    email: 'mert.oz@icloud.com',
    fullName: 'Mert Özçelikbaş',
    profile: {
      ...DEFAULT_USER_PROFILE,
      fullName: 'Mert Özçelikbaş',
      email: 'mert.oz@icloud.com',
      phoneDigits: '5325550140',
      gender: 'male',
    },
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function safeReadStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage quota/security errors
  }
}

function safeRemoveStorage(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLocaleLowerCase('en-US');
}

interface TrustedSupabaseIdentity {
  role: MobileAuthAccountRole;
  fullName?: string;
}

async function resolveTrustedSupabaseIdentity(authUser: {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): Promise<TrustedSupabaseIdentity> {
  const appMetadata = (authUser.app_metadata || {}) as Record<string, unknown>;
  const userMetadata = (authUser.user_metadata || {}) as Record<string, unknown>;
  const { data: profile, error } = await supabase
    .from('users_profile')
    .select('id, tenant_id, name, role, active')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!error && profile) {
    const isTrustedOwner =
      profile.active === true &&
      profile.role === 'tenant_owner' &&
      typeof profile.tenant_id === 'string' &&
      profile.tenant_id.trim().length > 0;
    return {
      role: isTrustedOwner ? 'tenant_owner' : 'customer',
      fullName: typeof profile.name === 'string' ? profile.name : undefined,
    };
  }

  const appRole = appMetadata.role;
  const appTenantId = appMetadata.tenant_id;
  const isTrustedAppOwner =
    appRole === 'tenant_owner' &&
    typeof appTenantId === 'string' &&
    appTenantId.trim().length > 0;
  return {
    role: isTrustedAppOwner ? 'tenant_owner' : 'customer',
    fullName:
      typeof appMetadata.full_name === 'string'
        ? appMetadata.full_name
        : typeof userMetadata.full_name === 'string'
          ? userMetadata.full_name
          : undefined,
  };
}

function deriveNameFromEmail(email: string): string {
  const local = normalizeEmail(email).split('@')[0] || 'lari.uye';
  const parts = local
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1));
  return parts.length >= 2 ? parts.join(' ') : `${parts[0] || 'LARİ'} Üyesi`;
}

async function hashLocalPassword(password: string, email: string): Promise<string> {
  const payload = `lari-mobile-v1:${normalizeEmail(email)}:${password}`;
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
      const encoded = new TextEncoder().encode(payload);
      const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fallback below
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b);
  }
  return `fnv_${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}`;
}

function loadStoredAccounts(): MobileStoredAccount[] {
  const raw = safeReadStorage(MOBILE_AUTH_STORAGE_KEYS.ACCOUNTS);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MobileStoredAccount =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as MobileStoredAccount).user?.email === 'string' &&
        typeof (item as MobileStoredAccount).profile?.fullName === 'string'
    );
  } catch {
    return [];
  }
}

function saveStoredAccounts(accounts: MobileStoredAccount[]): void {
  safeWriteStorage(MOBILE_AUTH_STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

function getBuiltinAccounts(): MobileStoredAccount[] {
  const now = new Date().toISOString();
  const demoCustomer: MobileStoredAccount = {
    user: {
      userId: 'usr-lari-mert',
      email: DEFAULT_USER_PROFILE.email,
      fullName: DEFAULT_USER_PROFILE.fullName,
      provider: 'email',
      role: 'customer',
      kvkkAccepted: true,
      createdAtIso: now,
      lastLoginAtIso: now,
    },
    profile: { ...DEFAULT_USER_PROFILE },
  };
  const demoPartner: MobileStoredAccount = {
    user: {
      userId: 'usr-lari-partner',
      email: 'partner@randevulari.com',
      fullName: 'Merve Yılmaz',
      provider: 'email',
      role: 'tenant_owner',
      tenantId: 'ten-atelier-nisantasi',
      defaultPlanId: 'baslangic',
      kvkkAccepted: true,
      createdAtIso: now,
      lastLoginAtIso: now,
    },
    profile: {
      ...DEFAULT_USER_PROFILE,
      fullName: 'Merve Yılmaz',
      email: 'partner@randevulari.com',
      gender: 'female',
      phoneDigits: '5334440199',
    },
  };
  const demoClinicPartner: MobileStoredAccount = {
    user: {
      userId: 'usr-lari-clinic-partner',
      email: 'klinik@randevulari.com',
      fullName: 'Dr. Ece Aksoy',
      provider: 'email',
      role: 'tenant_owner',
      tenantId: 'ten-dent-kadikoy',
      defaultPlanId: 'kurumsal',
      kvkkAccepted: true,
      createdAtIso: now,
      lastLoginAtIso: now,
    },
    profile: {
      ...DEFAULT_USER_PROFILE,
      fullName: 'Dr. Ece Aksoy',
      email: 'klinik@randevulari.com',
      gender: 'female',
      district: 'Kadıköy',
      phoneDigits: '5327770210',
      interestedSectors: ['dental_clinic', 'aesthetic_clinic'],
    },
  };
  const demoAutoPartner: MobileStoredAccount = {
    user: {
      userId: 'usr-lari-auto-partner',
      email: 'otoservis@randevulari.com',
      fullName: 'Kemal Usta',
      provider: 'email',
      role: 'tenant_owner',
      tenantId: 'ten-auto-maslak',
      defaultPlanId: 'profesyonel',
      kvkkAccepted: true,
      createdAtIso: now,
      lastLoginAtIso: now,
    },
    profile: {
      ...DEFAULT_USER_PROFILE,
      fullName: 'Kemal Usta',
      email: 'otoservis@randevulari.com',
      gender: 'male',
      district: 'Nişantaşı',
      phoneDigits: '5328880340',
      interestedSectors: ['auto_service'],
    },
  };
  return [demoCustomer, demoPartner, demoClinicPartner, demoAutoPartner];
}

function seedBuiltinAccountsIfMissing(): MobileStoredAccount[] {
  const existing = loadStoredAccounts();
  const builtins = getBuiltinAccounts();
  if (existing.length === 0) return builtins;
  const existingEmails = new Set(existing.map((acc) => normalizeEmail(acc.user.email)));
  return [
    ...existing,
    ...builtins.filter((acc) => !existingEmails.has(normalizeEmail(acc.user.email))),
  ];
}

export function getActiveMobileAuthUser(): MobileAuthUser | null {
  const raw = safeReadStorage(MOBILE_AUTH_STORAGE_KEYS.ACTIVE_USER);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MobileAuthUser;
    if (parsed && typeof parsed.userId === 'string' && typeof parsed.email === 'string') {
      try {
        return getDataSourceMode() === 'supabase'
          ? { ...parsed, role: 'customer' }
          : parsed;
      } catch {
        return { ...parsed, role: 'customer' };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function isMobileExplicitlySignedOut(): boolean {
  return safeReadStorage(MOBILE_AUTH_STORAGE_KEYS.SIGNED_OUT) === 'true';
}

function persistActiveAuthSession(user: MobileAuthUser, profile: MobileUserProfile): void {
  safeWriteStorage(MOBILE_AUTH_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
  safeWriteStorage(MOBILE_AUTH_STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  safeRemoveStorage(MOBILE_AUTH_STORAGE_KEYS.SIGNED_OUT);
}

export function validateMobileRegistrationPayload(
  payload: MobileRegistrationPayload
): { valid: boolean; errors: Record<string, string> } {
  const profileResult = validateMobileUserProfile(payload.profile);
  const errors: Record<string, string> = { ...profileResult.errors };

  if (payload.provider === 'email') {
    const password = payload.password || '';
    const confirm = payload.passwordConfirm ?? password;
    if (password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalıdır.';
    }
    if (password !== confirm) {
      errors.passwordConfirm = 'Şifreler birbiriyle eşleşmiyor.';
    }
  }

  if (!payload.kvkkAccepted) {
    errors.kvkkAccepted = 'Devam etmek için KVKK ve üyelik koşullarını onaylamalısınız.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateMobileLoginPayload(input: {
  email: string;
  password: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Geçerli bir e-posta adresi girin (örn: ad@gmail.com).';
  }
  if (!input.password || input.password.length < 6) {
    errors.password = 'Şifrenizi girin (en az 6 karakter).';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export async function registerMobileAccount(
  payload: MobileRegistrationPayload
): Promise<MobileAuthActionResult> {
  const validation = validateMobileRegistrationPayload(payload);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      errorMessage: 'Lütfen kırmızı ile işaretlenen zorunlu alanları doldurun.',
    };
  }

  const normalizedEmail = normalizeEmail(payload.profile.email);
  const accounts = loadStoredAccounts();
  const existing = accounts.find((acc) => normalizeEmail(acc.user.email) === normalizedEmail);
  if (existing && payload.provider === 'email') {
    return {
      success: false,
      errors: { email: 'Bu e-posta adresi ile zaten bir LARİ hesabı bulunuyor.' },
      errorMessage: 'Bu e-posta adresi zaten kayıtlı. Giriş Yap sekmesini kullanabilirsiniz.',
    };
  }

  let dataMode: 'local' | 'supabase' = 'local';
  try {
    dataMode = getDataSourceMode();
  } catch {
    dataMode = 'local';
  }

  if (dataMode === 'supabase' && payload.provider === 'email' && payload.password) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: payload.password,
      options: {
        data: {
          full_name: payload.profile.fullName.trim(),
          phone: payload.profile.phoneDigits,
          city: payload.profile.city,
          district: payload.profile.district,
          country_code: payload.profile.countryCode,
        },
      },
    });
    if (error) {
      return {
        success: false,
        errorMessage: error.message || 'Üyelik oluşturulamadı.',
      };
    }
    const nowIso = new Date().toISOString();
    const user: MobileAuthUser = {
      userId: data.user?.id || `usr-${Date.now().toString(36)}`,
      email: normalizedEmail,
      fullName: payload.profile.fullName.trim(),
      provider: 'email',
      role: 'customer',
      kvkkAccepted: payload.kvkkAccepted,
      createdAtIso: nowIso,
      lastLoginAtIso: nowIso,
    };
    const cleanProfile: MobileUserProfile = {
      ...payload.profile,
      fullName: payload.profile.fullName.trim(),
      email: normalizedEmail,
    };
    persistActiveAuthSession(user, cleanProfile);
    return { success: true, user, profile: cleanProfile };
  }

  const nowIso = new Date().toISOString();
  const passwordDigest =
    payload.provider === 'email' && payload.password
      ? await hashLocalPassword(payload.password, normalizedEmail)
      : existing?.passwordDigest;

  const cleanProfile: MobileUserProfile = {
    ...payload.profile,
    fullName: payload.profile.fullName.trim(),
    email: normalizedEmail,
  };

  const user: MobileAuthUser = {
    userId: existing?.user.userId || `usr-${Date.now().toString(36)}`,
    email: normalizedEmail,
    fullName: cleanProfile.fullName,
    provider: payload.provider,
    role: existing?.user.role === 'tenant_owner' ? 'tenant_owner' : 'customer',
    kvkkAccepted: true,
    createdAtIso: existing?.user.createdAtIso || nowIso,
    lastLoginAtIso: nowIso,
  };

  const nextAccounts = [
    { user, passwordDigest, profile: cleanProfile },
    ...accounts.filter((acc) => normalizeEmail(acc.user.email) !== normalizedEmail),
  ];
  saveStoredAccounts(nextAccounts);
  persistActiveAuthSession(user, cleanProfile);

  return {
    success: true,
    user,
    profile: cleanProfile,
  };
}

export async function loginMobileWithEmail(input: {
  email: string;
  password: string;
}): Promise<MobileAuthActionResult> {
  const validation = validateMobileLoginPayload(input);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      errorMessage: 'Lütfen geçerli bir e-posta ve en az 6 karakterli şifre girin.',
    };
  }

  const normalizedEmail = normalizeEmail(input.email);
  let dataMode: 'local' | 'supabase' = 'local';
  try {
    dataMode = getDataSourceMode();
  } catch {
    dataMode = 'local';
  }

  if (dataMode === 'supabase') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: input.password,
    });
    if (error || !data.user) {
      return {
        success: false,
        errorMessage: 'E-posta veya şifre hatalı.',
      };
    }
    const meta = (data.user.user_metadata || {}) as Record<string, string>;
    const trustedIdentity = await resolveTrustedSupabaseIdentity(data.user);
    const nowIso = new Date().toISOString();
    const user: MobileAuthUser = {
      userId: data.user.id,
      email: normalizedEmail,
      fullName:
        trustedIdentity.fullName || meta.full_name || deriveNameFromEmail(normalizedEmail),
      provider: 'email',
      role: trustedIdentity.role,
      kvkkAccepted: true,
      createdAtIso: nowIso,
      lastLoginAtIso: nowIso,
    };
    const profile: MobileUserProfile = {
      ...DEFAULT_USER_PROFILE,
      fullName: user.fullName,
      email: normalizedEmail,
      phoneDigits: meta.phone || DEFAULT_USER_PROFILE.phoneDigits,
      city: meta.city || DEFAULT_USER_PROFILE.city,
      district: meta.district || DEFAULT_USER_PROFILE.district,
    };
    persistActiveAuthSession(user, profile);
    return { success: true, user, profile };
  }

  const stored = loadStoredAccounts();
  const matched = stored.find((acc) => normalizeEmail(acc.user.email) === normalizedEmail);
  if (matched) {
    if (matched.passwordDigest) {
      const attemptDigest = await hashLocalPassword(input.password, normalizedEmail);
      if (attemptDigest !== matched.passwordDigest) {
        return {
          success: false,
          errors: { password: 'Girilen şifre hatalı.' },
          errorMessage: 'E-posta veya şifre hatalı.',
        };
      }
    }
    const updatedUser: MobileAuthUser = {
      ...matched.user,
      lastLoginAtIso: new Date().toISOString(),
    };
    saveStoredAccounts(
      stored.map((acc) =>
        normalizeEmail(acc.user.email) === normalizedEmail
          ? { ...acc, user: updatedUser }
          : acc
      )
    );
    persistActiveAuthSession(updatedUser, matched.profile);
    return {
      success: true,
      user: updatedUser,
      profile: matched.profile,
    };
  }

  const builtins = seedBuiltinAccountsIfMissing();
  const builtinMatch = builtins.find(
    (acc) => normalizeEmail(acc.user.email) === normalizedEmail
  );
  const ACCEPTED_BUILTIN_PASSWORDS = new Set([
    'Lari2026!',
    'lari2026!',
    'lari2026',
    'lari123',
    'admin123',
  ]);
  if (builtinMatch && ACCEPTED_BUILTIN_PASSWORDS.has(input.password.trim())) {
    const updatedUser: MobileAuthUser = {
      ...builtinMatch.user,
      lastLoginAtIso: new Date().toISOString(),
    };
    persistActiveAuthSession(updatedUser, builtinMatch.profile);
    return {
      success: true,
      user: updatedUser,
      profile: builtinMatch.profile,
    };
  }

  return {
    success: false,
    errorMessage:
      'Bu e-posta ile kayıtlı hesap bulunamadı. Üye Ol sekmesinden bilgilerinizi girerek 30 saniyede kayıt olabilirsiniz.',
  };
}

export async function continueMobileWithSocialProvider(input: {
  provider: 'google' | 'apple';
  email: string;
  fullName?: string;
  instantOAuthConnect?: boolean;
}): Promise<MobileAuthActionResult> {
  const normalizedEmail = normalizeEmail(input.email);
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return {
      success: false,
      errors: {
        socialEmail: 'Geçerli bir e-posta adresi seçin veya girin.',
      },
      errorMessage: 'Lütfen geçerli bir hesap seçin.',
    };
  }

  let dataMode: 'local' | 'supabase' = 'local';
  try {
    dataMode = getDataSourceMode();
  } catch {
    dataMode = 'local';
  }

  if (dataMode === 'supabase') {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/#/m` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: input.provider,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) {
      return {
        success: false,
        errorMessage: error.message || 'Sosyal giriş başlatılamadı.',
      };
    }
    return {
      success: false,
      errorMessage: 'Güvenli sosyal giriş yönlendirmesi başlatıldı.',
    };
  } else {
    const isLocalHost =
      typeof window !== 'undefined' &&
      (['localhost', '127.0.0.1'].includes(window.location.hostname) ||
        Boolean((window as any).Capacitor?.isNativePlatform?.()));
    if (!isLocalHost) {
      return {
        success: false,
        errorMessage:
          'Uzak sunucuda sosyal giriş için doğrulanmış OAuth oturumu gereklidir.',
      };
    }
  }

  const stored = loadStoredAccounts();
  const existing = stored.find((acc) => normalizeEmail(acc.user.email) === normalizedEmail);
  if (existing && validateMobileUserProfile(existing.profile).valid) {
    const updatedUser: MobileAuthUser = {
      ...existing.user,
      provider: input.provider,
      lastLoginAtIso: new Date().toISOString(),
    };
    saveStoredAccounts(
      stored.map((acc) =>
        normalizeEmail(acc.user.email) === normalizedEmail
          ? { ...acc, user: updatedUser }
          : acc
      )
    );
    persistActiveAuthSession(updatedUser, existing.profile);
    return {
      success: true,
      user: updatedUser,
      profile: existing.profile,
    };
  }

  const presetMatch = SOCIAL_QUICK_PRESETS.find(
    (item) =>
      item.provider === input.provider && normalizeEmail(item.email) === normalizedEmail
  );
  if (input.instantOAuthConnect || presetMatch) {
    const nowIso = new Date().toISOString();
    const resolvedFullName =
      (input.fullName || '').trim() ||
      presetMatch?.fullName ||
      deriveNameFromEmail(normalizedEmail);
    const resolvedProfile: MobileUserProfile = presetMatch
      ? {
          ...presetMatch.profile,
          fullName: resolvedFullName,
          email: normalizedEmail,
        }
      : {
          ...DEFAULT_USER_PROFILE,
          fullName: resolvedFullName,
          email: normalizedEmail,
        };
    const isBuiltinCustomer = normalizedEmail === normalizeEmail(DEFAULT_USER_PROFILE.email);
    const oauthUser: MobileAuthUser = {
      userId: isBuiltinCustomer
        ? 'usr-lari-mert'
        : `usr-oauth-${input.provider}-${Date.now().toString(36)}`,
      email: normalizedEmail,
      fullName: resolvedFullName,
      provider: input.provider,
      role: 'customer',
      kvkkAccepted: true,
      createdAtIso: nowIso,
      lastLoginAtIso: nowIso,
    };
    const nextAccounts = [
      { user: oauthUser, profile: resolvedProfile },
      ...stored.filter((acc) => normalizeEmail(acc.user.email) !== normalizedEmail),
    ];
    saveStoredAccounts(nextAccounts);
    persistActiveAuthSession(oauthUser, resolvedProfile);
    return {
      success: true,
      user: oauthUser,
      profile: resolvedProfile,
    };
  }

  return {
    success: false,
    needsProfileCompletion: true,
    prefill: {
      provider: input.provider,
      email: normalizedEmail,
      fullName: (input.fullName || '').trim() || deriveNameFromEmail(normalizedEmail),
    },
  };
}

export async function logoutMobileAccount(): Promise<void> {
  let dataMode: 'local' | 'supabase' = 'local';
  try {
    dataMode = getDataSourceMode();
  } catch {
    dataMode = 'local';
  }

  if (dataMode === 'supabase') {
    try {
      await supabase.auth.signOut();
    } catch {
      // continue local cleanup
    }
  }

  safeRemoveStorage(MOBILE_AUTH_STORAGE_KEYS.ACTIVE_USER);
  safeWriteStorage(MOBILE_AUTH_STORAGE_KEYS.SIGNED_OUT, 'true');
}

export function updateMobileAuthUserRole(role: MobileAuthAccountRole): MobileAuthUser | null {
  try {
    if (getDataSourceMode() === 'supabase' && role === 'tenant_owner') {
      return null;
    }
  } catch {
    return null;
  }
  const current = getActiveMobileAuthUser();
  if (!current) return null;
  const updated: MobileAuthUser = { ...current, role };
  safeWriteStorage(MOBILE_AUTH_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(updated));

  const accounts = loadStoredAccounts();
  if (accounts.some((acc) => normalizeEmail(acc.user.email) === normalizeEmail(current.email))) {
    saveStoredAccounts(
      accounts.map((acc) =>
        normalizeEmail(acc.user.email) === normalizeEmail(current.email)
          ? { ...acc, user: updated }
          : acc
      )
    );
  }
  return updated;
}

export async function refreshMobileAuthUserFromTrustedSource(): Promise<MobileAuthUser | null> {
  if (getDataSourceMode() !== 'supabase') return getActiveMobileAuthUser();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const trustedIdentity = await resolveTrustedSupabaseIdentity(data.user);
  const current = getActiveMobileAuthUser();
  const email = normalizeEmail(data.user.email || current?.email || '');
  const nowIso = new Date().toISOString();
  const refreshed: MobileAuthUser = {
    userId: data.user.id,
    email,
    fullName:
      trustedIdentity.fullName || current?.fullName || deriveNameFromEmail(email),
    provider: current?.provider || 'email',
    role: trustedIdentity.role,
    kvkkAccepted: current?.kvkkAccepted ?? true,
    createdAtIso: current?.createdAtIso || nowIso,
    lastLoginAtIso: nowIso,
  };
  safeWriteStorage(MOBILE_AUTH_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(refreshed));
  return refreshed;
}

export async function purgeDeletedMobileAccountStorage(userId: string): Promise<void> {
  try {
    if (getDataSourceMode() === 'supabase') {
      await supabase.auth.signOut();
    }
  } catch {
    // Local cleanup must still complete if remote sign-out fails.
  }

  const accounts = loadStoredAccounts().filter((account) => account.user.userId !== userId);
  if (accounts.length > 0) {
    saveStoredAccounts(accounts);
  } else {
    safeRemoveStorage(MOBILE_AUTH_STORAGE_KEYS.ACCOUNTS);
  }

  try {
    if (typeof window === 'undefined') return;
    const removablePrefixes = [
      'lari_mobile_',
      'lari_partner_',
      'lari_storefront_',
      'lari:pwa-offline-vault:',
    ];
    const keys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index)
    ).filter((key): key is string => Boolean(key));
    keys
      .filter((key) => removablePrefixes.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Best-effort storage cleanup; in-memory session is reset by the context.
  }
}
