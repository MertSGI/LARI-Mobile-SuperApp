import type { DeepLinkResolution } from '../../types/mobileContracts';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN = /^[A-Za-z0-9_-]+$/;
const reject = (rejectedReason: NonNullable<DeepLinkResolution['rejectedReason']>): DeepLinkResolution => ({ valid: false, targetMode: 'b2c_customer', routePath: '', whiteLabelStorefrontLock: false, rejectedReason });
const accept = (routePath: string, extras: Partial<DeepLinkResolution> = {}): DeepLinkResolution => ({ valid: true, targetMode: 'b2c_customer', routePath, whiteLabelStorefrontLock: false, ...extras });
function hasTraversal(input: string): boolean {
  let value = input;
  for (let i = 0; i < 3; i += 1) {
    if (/(^|[\\/])\.\.([\\/]|$)/.test(value) || value.includes('\\')) return true;
    try { const decoded = decodeURIComponent(value); if (decoded === value) break; value = decoded; } catch { return true; }
  }
  return false;
}
function resolvePath(rawPath: string): DeepLinkResolution {
  const path = `/${rawPath.replace(/^\/+|\/+$/g, '')}`;
  if (hasTraversal(path)) return reject('PATH_TRAVERSAL');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'partner' && parts.length === 1) return accept('/m/partner', { targetMode: 'b2b_partner' });
  if ((parts[0] === 's' || parts[0] === 'booking') && parts.length >= 2) {
    const tenantSlug = parts[1]; const branchSlug = parts[0] === 'booking' ? parts[2] : undefined;
    const expected = parts[0] === 'booking' && branchSlug ? 3 : 2;
    if (parts.length !== expected || !SLUG.test(tenantSlug) || (branchSlug && !SLUG.test(branchSlug))) return reject('INVALID_SLUG');
    return accept(`/m/storefront/${tenantSlug}${branchSlug ? `/${branchSlug}` : ''}`, { tenantSlug, branchSlug, whiteLabelStorefrontLock: true });
  }
  if (parts[0] === 'appointment' && parts[1] === 'manage' && parts.length === 3 && TOKEN.test(parts[2])) return accept(`/m/wallet/manage/${parts[2]}`, { selfServiceToken: parts[2] });
  if (parts[0] === 'ht' && parts[1] === 'journey' && parts.length === 3 && TOKEN.test(parts[2])) return accept(`/m/concierge/${parts[2]}`, { htJourneyId: parts[2] });
  return reject('INVALID_SLUG');
}
export function resolveMobileDeepLink(rawUrl: string): DeepLinkResolution {
  const input = rawUrl?.trim();
  if (!input) return reject('EMPTY_URL');
  if (hasTraversal(input)) return reject('PATH_TRAVERSAL');
  if (/^(javascript|data|vbscript|file):/i.test(input)) return reject('MALICIOUS_SCHEME');
  let url: URL; try { url = new URL(input); } catch { return reject('MALICIOUS_SCHEME'); }
  if (url.protocol === 'randevulari:') return resolvePath(`/${url.hostname}${url.pathname}`);
  if (url.protocol !== 'https:') return reject('MALICIOUS_SCHEME');
  const host = url.hostname.toLowerCase();
  if (host !== 'randevulari.com' && !host.endsWith('.randevulari.com')) return reject('UNTRUSTED_EXTERNAL_HOST');
  if (host !== 'randevulari.com') {
    const tenantSlug = host.slice(0, -('.randevulari.com'.length));
    if (tenantSlug.includes('.') || !SLUG.test(tenantSlug) || url.pathname !== '/' || url.search || url.hash) return reject('INVALID_SLUG');
    return accept(`/m/storefront/${tenantSlug}`, { tenantSlug, whiteLabelStorefrontLock: true });
  }
  return resolvePath(url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname);
}
