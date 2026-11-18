import { getDataSourceMode } from './dataSourceConfig';
import { supabase } from './supabaseClient';

export interface MediaItem {
  url: string;
  id?: string;
  file?: File;
}

const PUBLIC_MEDIA_BUCKET = 'lari-public-media';
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

type MediaFolder = 'logos' | 'covers' | 'gallery' | 'staff' | 'services';

function validateImage(file: File): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error('UNSUPPORTED_IMAGE_MIME_TYPE');
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error('IMAGE_TOO_LARGE');
  }
}

function readLocalImage(file: File): Promise<string> {
  validateImage(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('IMAGE_READ_FAILED'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('IMAGE_READ_FAILED'));
    reader.readAsDataURL(file);
  });
}

function safePathSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  if (!normalized) throw new Error('MEDIA_OWNER_ID_REQUIRED');
  return normalized;
}

function resolveExtension(file: File): string {
  const byMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return byMime[file.type] || 'bin';
}

async function uploadImage(
  tenantId: string,
  folder: MediaFolder,
  file: File,
  entityId?: string
): Promise<string> {
  validateImage(file);
  if (getDataSourceMode() !== 'supabase') {
    return readLocalImage(file);
  }

  const uniquePart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const entityPath = entityId ? `${safePathSegment(entityId)}/` : '';
  const objectPath = `${safePathSegment(tenantId)}/${folder}/${entityPath}${uniquePart}.${resolveExtension(file)}`;
  const { error } = await supabase.storage.from(PUBLIC_MEDIA_BUCKET).upload(objectPath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`MEDIA_UPLOAD_FAILED: ${error.message}`);

  const { data } = supabase.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(objectPath);
  if (!data.publicUrl) throw new Error('MEDIA_PUBLIC_URL_FAILED');
  return data.publicUrl;
}

export const mediaUploadService = {
  async uploadTenantLogo(tenantId: string, file: File): Promise<string> {
    return uploadImage(tenantId, 'logos', file);
  },

  async uploadCoverImage(tenantId: string, file: File): Promise<string> {
    return uploadImage(tenantId, 'covers', file);
  },

  async uploadGalleryImage(tenantId: string, file: File): Promise<string> {
    return uploadImage(tenantId, 'gallery', file);
  },

  async uploadStaffPhoto(tenantId: string, staffId: string, file: File): Promise<string> {
    return uploadImage(tenantId, 'staff', file, staffId);
  },

  async uploadServiceImage(tenantId: string, serviceId: string, file: File): Promise<string> {
    return uploadImage(tenantId, 'services', file, serviceId);
  },

  async deleteMedia(pathOrUrl: string): Promise<boolean> {
     // In mock mode, we just return true.
     return true;
  }
};
