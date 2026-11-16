export type MobileAppMode = 'b2c_customer' | 'b2b_partner';
export type MobilePersonaId = 'salon_customer' | 'clinic_patient' | 'ht_patient' | 'salon_partner' | 'clinic_practitioner' | 'ht_coordinator';
export type MobilePermissionType = 'geolocation' | 'camera' | 'notifications' | 'biometrics';
export type MobilePermissionStatus = 'granted' | 'denied' | 'prompt';
export type GeoCoordinates = { latitude: number; longitude: number; accuracyMeters?: number };
export type CapturedMediaPayload = { dataUrl: string; mimeType: 'image/jpeg' | 'image/png'; width: number; height: number; capturedAt: string; source: 'camera' | 'gallery' | 'fallback' };
export type ScannedCodePayload = { rawValue: string; format: 'qr_code' | 'ean_13' | 'code_128' | 'manual'; scannedAt: string };
export type BiometricAuthScope = 'clinic_phi_access' | 'customer_360_pii' | 'partner_pos_refund' | 'account_deletion';
export type BiometricVerifyResult = { verified: boolean; method: 'face_id' | 'touch_id' | 'device_pin' | 'session_reauth'; verifiedAt: string; expiresAt: string; reasonCode?: string };
export type DeepLinkResolution = {
  valid: boolean; targetMode: MobileAppMode; routePath: string; tenantSlug?: string; branchSlug?: string;
  whiteLabelStorefrontLock: boolean; selfServiceToken?: string; htJourneyId?: string;
  rejectedReason?: 'EMPTY_URL' | 'MALICIOUS_SCHEME' | 'UNTRUSTED_EXTERNAL_HOST' | 'PATH_TRAVERSAL' | 'INVALID_SLUG';
};
