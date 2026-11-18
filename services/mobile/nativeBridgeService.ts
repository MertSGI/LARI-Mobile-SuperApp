import type { BiometricAuthScope, BiometricVerifyResult, CapturedMediaPayload, GeoCoordinates, MobilePermissionStatus, MobilePermissionType, ScannedCodePayload } from '../../types/mobileContracts';
type Plugin = Record<string, (...args: any[]) => any>;
type Session = { verifiedAtMs: number; expiresAtMs: number };
const sessions = new Map<string, Session>();
function plugins(): Record<string, Plugin> { return (globalThis as any).Capacitor?.Plugins ?? {}; }
function requireTrigger(value: string): void { if (!value?.trim()) throw new Error('CONTEXTUAL_USER_TRIGGER_REQUIRED'); }
export async function requestContextualPermission(type: MobilePermissionType, userActionTrigger: string): Promise<MobilePermissionStatus> {
  requireTrigger(userActionTrigger); const native = plugins();
  try {
    if (type === 'geolocation' && native.Geolocation?.requestPermissions) { const r = await native.Geolocation.requestPermissions(); return r.location === 'granted' || r.coarseLocation === 'granted' ? 'granted' : r.location === 'denied' ? 'denied' : 'prompt'; }
    if (type === 'camera' && native.Camera?.requestPermissions) { const r = await native.Camera.requestPermissions({ permissions: ['camera'] }); return r.camera === 'granted' ? 'granted' : r.camera === 'denied' ? 'denied' : 'prompt'; }
    if (type === 'notifications' && native.PushNotifications?.requestPermissions) { const r = await native.PushNotifications.requestPermissions(); return r.receive === 'granted' ? 'granted' : r.receive === 'denied' ? 'denied' : 'prompt'; }
    if (type === 'biometrics' && (native.NativeBiometric || native.Biometrics)) return 'granted';
  } catch { return 'denied'; }
  return 'prompt';
}
export function calculateHaversineDistanceKm(a: GeoCoordinates, b: GeoCoordinates): number {
  const rad = (v: number) => v * Math.PI / 180; const dLat = rad(b.latitude - a.latitude); const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Number((2 * 6371.0088 * Math.asin(Math.sqrt(h))).toFixed(2));
}
export function estimateTravelMinutes(distanceKm: number, mode: 'walking' | 'driving' = 'driving'): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('INVALID_DISTANCE');
  return Math.ceil(distanceKm / (mode === 'walking' ? 5 : 30) * 60);
}
export async function getCurrentPosition(options: { userActionTrigger: string; fallbackCoords?: GeoCoordinates }): Promise<GeoCoordinates> {
  requireTrigger(options.userActionTrigger); const geo = plugins().Geolocation;
  if (geo?.getCurrentPosition) { await requestContextualPermission('geolocation', options.userActionTrigger); const r = await geo.getCurrentPosition({ enableHighAccuracy: true }); return { latitude: r.coords.latitude, longitude: r.coords.longitude, accuracyMeters: r.coords.accuracy }; }
  if (options.fallbackCoords) return { ...options.fallbackCoords }; throw new Error('GEOLOCATION_UNAVAILABLE');
}
export async function capturePhoto(options: { userActionTrigger: string; purpose: 'ai_style' | 'ht_medical_intake' | 'clinic_encounter'; maxDimensionPx?: number }): Promise<CapturedMediaPayload> {
  requireTrigger(options.userActionTrigger); const camera = plugins().Camera;
  if (camera?.getPhoto) { await requestContextualPermission('camera', options.userActionTrigger); const r = await camera.getPhoto({ quality: 90, resultType: 'dataUrl', source: 'camera', width: options.maxDimensionPx ?? 2048, correctOrientation: true }); const dataUrl = String(r.dataUrl ?? ''); return { dataUrl, mimeType: dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg', width: Number(r.width ?? options.maxDimensionPx ?? 2048), height: Number(r.height ?? options.maxDimensionPx ?? 2048), capturedAt: new Date().toISOString(), source: 'camera' }; }
  const size = options.maxDimensionPx ?? 1; return { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', mimeType: 'image/png', width: size, height: size, capturedAt: new Date().toISOString(), source: 'fallback' };
}
export async function scanQrOrBarcode(options: { userActionTrigger: string; simulatedRawValue?: string; expectedFormat?: 'qr_code' | 'ean_13' | 'any' }): Promise<ScannedCodePayload> {
  requireTrigger(options.userActionTrigger); const scanner = plugins().BarcodeScanner;
  if (scanner?.scan) { await requestContextualPermission('camera', options.userActionTrigger); const r = await scanner.scan({ formats: options.expectedFormat === 'any' ? undefined : [options.expectedFormat] }); return { rawValue: String(r.rawValue ?? r.content ?? ''), format: r.format === 'EAN_13' ? 'ean_13' : r.format === 'CODE_128' ? 'code_128' : 'qr_code', scannedAt: new Date().toISOString() }; }
  if (!options.simulatedRawValue?.trim()) throw new Error('SCANNER_UNAVAILABLE'); return { rawValue: options.simulatedRawValue, format: options.expectedFormat === 'ean_13' ? 'ean_13' : options.expectedFormat === 'qr_code' ? 'qr_code' : 'manual', scannedAt: new Date().toISOString() };
}
function sessionKey(tenant: string, user: string, scope: BiometricAuthScope): string { return JSON.stringify([tenant, user, scope]); }
export async function requireBiometricReauth(params: { tenantId: string; staffOrUserId: string; scope: BiometricAuthScope; pinOrBiometricToken?: string; ttlSeconds?: number }): Promise<BiometricVerifyResult> {
  const now = Date.now(); const key = sessionKey(params.tenantId, params.staffOrUserId, params.scope); const cached = sessions.get(key);
  if (cached && cached.expiresAtMs > now) return { verified: true, method: 'session_reauth', verifiedAt: new Date(cached.verifiedAtMs).toISOString(), expiresAt: new Date(cached.expiresAtMs).toISOString() };
  if (cached) sessions.delete(key);
  let verified = false; let method: BiometricVerifyResult['method'] = 'device_pin'; const biometric = plugins().NativeBiometric ?? plugins().Biometrics;
  if (biometric?.verifyIdentity) { try { const r = await biometric.verifyIdentity({ reason: params.scope, title: 'Kimlik doğrulama' }); verified = r?.verified === true; method = r?.method === 'face_id' || r?.method === 'touch_id' ? r.method : 'device_pin'; } catch { verified = false; } }
  else {
    const token = params.pinOrBiometricToken?.trim() ?? '';
    verified = token.length >= 4;
  }
  const ttl = params.ttlSeconds ?? 300; const expiry = now + Math.max(0, ttl) * 1000;
  if (!verified || ttl <= 0) return { verified: false, method, verifiedAt: new Date(now).toISOString(), expiresAt: new Date(now).toISOString(), reasonCode: 'BIOMETRIC_REAUTH_REQUIRED' };
  sessions.set(key, { verifiedAtMs: now, expiresAtMs: expiry }); return { verified: true, method, verifiedAt: new Date(now).toISOString(), expiresAt: new Date(expiry).toISOString() };
}
function escapeIcs(value: string): string { return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function icsDate(value: string): string { const date = new Date(value); if (Number.isNaN(date.getTime())) throw new Error('INVALID_APPOINTMENT_START'); return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
export function buildAppointmentIcsContent(params: { appointmentId: string; title: string; businessName: string; address?: string; startIso: string; durationMinutes: number }): string {
  if (!Number.isFinite(params.durationMinutes) || params.durationMinutes <= 0) throw new Error('INVALID_APPOINTMENT_DURATION'); const start = new Date(params.startIso); if (Number.isNaN(start.getTime())) throw new Error('INVALID_APPOINTMENT_START'); const end = new Date(start.getTime() + params.durationMinutes * 60000);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Randevulari//Mobile Appointment//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${escapeIcs(params.appointmentId)}@randevulari.com`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${icsDate(start.toISOString())}`, `DTEND:${icsDate(end.toISOString())}`, `SUMMARY:${escapeIcs(params.title)}`, `DESCRIPTION:${escapeIcs(params.businessName)}`]; if (params.address) lines.push(`LOCATION:${escapeIcs(params.address)}`); lines.push('END:VEVENT', 'END:VCALENDAR', ''); return lines.join('\r\n');
}
export function triggerHaptic(style: 'light' | 'medium' | 'success' | 'warning' | 'error'): void { const h = plugins().Haptics; if (!h) return; try { if (style === 'light' || style === 'medium') void h.impact?.({ style: style.toUpperCase() }); else void h.notification?.({ type: style.toUpperCase() }); } catch { /* best effort */ } }
