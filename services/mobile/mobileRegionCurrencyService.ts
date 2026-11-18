import { LariBusinessVertical } from './mobileDiscoveryService';

export type SupportedCurrency = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type UserGender = 'female' | 'male' | 'other' | 'prefer_not_to_say';

export interface CountryConfig {
  code: 'TR' | 'DE' | 'GB' | 'US' | 'FR' | 'AE';
  label: string;
  dialCode: string;
  minDigits: number;
  maxDigits: number;
  placeholder: string;
  defaultCurrency: SupportedCurrency;
  cities: Record<string, string[]>;
}

export const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    code: 'TR',
    label: 'Türkiye',
    dialCode: '+90',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '5325550140',
    defaultCurrency: 'TRY',
    cities: {
      İstanbul: ['Nişantaşı', 'Kadıköy', 'Beşiktaş', 'Ataşehir', 'Bakırköy'],
      Ankara: ['Çankaya', 'Kavaklıdere', 'Ümitköy'],
      İzmir: ['Alsancak', 'Bostanlı', 'Urla'],
      Antalya: ['Lara', 'Konyaaltı', 'Muratpaşa'],
    },
  },
  {
    code: 'DE',
    label: 'Almanya',
    dialCode: '+49',
    minDigits: 10,
    maxDigits: 11,
    placeholder: '15123456789',
    defaultCurrency: 'EUR',
    cities: {
      Berlin: ['Mitte', 'Charlottenburg', 'Kreuzberg'],
      München: ['Schwabing', 'Altstadt'],
    },
  },
  {
    code: 'GB',
    label: 'Birleşik Krallık',
    dialCode: '+44',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '7700900123',
    defaultCurrency: 'GBP',
    cities: {
      London: ['Mayfair', 'Soho', 'Kensington'],
      Manchester: ['Deansgate', 'Didsbury'],
    },
  },
  {
    code: 'US',
    label: 'ABD',
    dialCode: '+1',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '2125550199',
    defaultCurrency: 'USD',
    cities: {
      'New York': ['Manhattan', 'SoHo', 'Brooklyn'],
      'Los Angeles': ['Beverly Hills', 'Santa Monica'],
    },
  },
  {
    code: 'FR',
    label: 'Fransa',
    dialCode: '+33',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '612345678',
    defaultCurrency: 'EUR',
    cities: {
      Paris: ['Le Marais', 'Saint-Germain', 'Champs-Élysées'],
      Lyon: ['Presqu’île'],
    },
  },
  {
    code: 'AE',
    label: 'BAE',
    dialCode: '+971',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '501234567',
    defaultCurrency: 'USD',
    cities: {
      Dubai: ['Downtown', 'Marina', 'Jumeirah'],
      'Abu Dhabi': ['Al Maryah'],
    },
  },
];

export const INTERESTED_SECTOR_OPTIONS: Array<{
  id: LariBusinessVertical;
  labelTr: string;
}> = [
  { id: 'beauty_salon', labelTr: 'Kuaför & Güzellik' },
  { id: 'barber', labelTr: 'Berber & Erkek Bakım' },
  { id: 'nail_studio', labelTr: 'Tırnak & Protez' },
  { id: 'spa_wellness', labelTr: 'Spa & Masaj' },
  { id: 'dental_clinic', labelTr: 'Diş & Gülüş Tasarımı' },
  { id: 'aesthetic_clinic', labelTr: 'Medikal Estetik & Klinik' },
  { id: 'auto_service', labelTr: 'Oto Bakım & Sanayi' },
  { id: 'pet_grooming', labelTr: 'Evcil Hayvan Bakımı' },
];

export interface MobileUserProfile {
  fullName: string;
  email: string;
  countryCode: CountryConfig['code'];
  phoneDigits: string;
  age: string;
  gender: UserGender | '';
  country: string;
  city: string;
  district: string;
  interestedSectors: LariBusinessVertical[];
}

export const DEFAULT_USER_PROFILE: MobileUserProfile = {
  fullName: 'Mert Özçelikbaş',
  email: 'mert@randevulari.com',
  countryCode: 'TR',
  phoneDigits: '5325550140',
  age: '31',
  gender: 'male',
  country: 'Türkiye',
  city: 'İstanbul',
  district: 'Nişantaşı',
  interestedSectors: ['beauty_salon', 'dental_clinic'],
};

export function getCountryConfig(
  countryCodeOrName?: string
): CountryConfig {
  const found = COUNTRY_CONFIGS.find(
    (c) =>
      c.code === countryCodeOrName ||
      c.label.toLowerCase() === String(countryCodeOrName || '').toLowerCase()
  );
  return found || COUNTRY_CONFIGS[0];
}

export function resolveDefaultCurrencyForLocation(
  countryCodeOrName?: string,
  _city?: string,
  _district?: string
): SupportedCurrency {
  return getCountryConfig(countryCodeOrName).defaultCurrency;
}

/**
 * Strips all non-numeric characters (symbols, letters, punctuation).
 */
export function sanitizePhoneDigits(raw: string, maxDigits = 11): string {
  return String(raw || '')
    .replace(/\D+/g, '')
    .slice(0, maxDigits);
}

export function formatPhoneDisplay(countryCode: CountryConfig['code'], digits: string): string {
  const cfg = getCountryConfig(countryCode);
  const clean = sanitizePhoneDigits(digits, cfg.maxDigits);
  if (!clean) return cfg.dialCode;
  if (cfg.code === 'TR' && clean.length >= 7) {
    return `${cfg.dialCode} ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`.trim();
  }
  return `${cfg.dialCode} ${clean}`;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateMobileUserProfile(
  profile: MobileUserProfile
): ProfileValidationResult {
  const errors: Record<string, string> = {};
  const cfg = getCountryConfig(profile.countryCode);

  if (!profile.fullName.trim() || profile.fullName.trim().length < 2) {
    errors.fullName = 'Ad Soyad en az 2 karakter olmalıdır.';
  }
  if (!EMAIL_REGEX.test(profile.email.trim())) {
    errors.email = 'Geçerli bir e-posta adresi girin (örn: ad@alanadi.com).';
  }
  const digits = sanitizePhoneDigits(profile.phoneDigits, cfg.maxDigits);
  if (digits.length < cfg.minDigits || digits.length > cfg.maxDigits) {
    errors.phoneDigits = `${cfg.label} için telefon yalnızca ${cfg.minDigits} rakam olmalıdır (${cfg.dialCode}). Sembol veya harf kabul edilmez.`;
  }
  if (cfg.code === 'TR' && !digits.startsWith('5')) {
    errors.phoneDigits = 'Türkiye cep telefonu 5 ile başlayan 10 rakam olmalıdır (örn: 5325550140).';
  }
  const ageNum = Number(profile.age);
  if (!profile.age.trim() || !Number.isInteger(ageNum) || ageNum < 16 || ageNum > 110) {
    errors.age = 'Yaş 16 ile 110 arasında geçerli bir sayı olmalıdır.';
  }
  if (!profile.gender) {
    errors.gender = 'Cinsiyet seçimi zorunludur.';
  }
  if (!profile.country.trim()) {
    errors.country = 'Ülke seçimi zorunludur.';
  }
  if (!profile.city.trim()) {
    errors.city = 'İl seçimi zorunludur.';
  }
  if (!profile.district.trim()) {
    errors.district = 'İlçe seçimi zorunludur.';
  }
  // interestedSectors is explicitly optional

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

const APPROX_RATES_FROM_TRY: Record<SupportedCurrency, number> = {
  TRY: 1,
  USD: 0.029,
  EUR: 0.027,
  GBP: 0.023,
};

export function convertFromTryMajor(
  amountTry: number,
  targetCurrency: SupportedCurrency
): number {
  if (targetCurrency === 'TRY') return Math.round(amountTry);
  const converted = amountTry * APPROX_RATES_FROM_TRY[targetCurrency];
  return Math.max(1, Math.round(converted));
}

export function formatCurrencyLabel(
  amountMajor: number,
  currency: SupportedCurrency = 'TRY'
): string {
  return `${Math.round(amountMajor).toLocaleString('tr-TR')} ${currency}`;
}
