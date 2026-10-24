export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 8;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_ACCEPT = PHOTO_MIME_TYPES.join(',');

type PhotoFile = { name: string; size: number; type: string };
type DogPhotos = { photos?: string[]; photo_url: string };

/** Match API serialization: real uploads first, then the stored fallback reference. */
export function resolveDogPhotos(dog: DogPhotos | null | undefined): string[] {
  if (dog?.photos?.length) return [...dog.photos];
  return dog?.photo_url ? [dog.photo_url] : [];
}

/** Only server-listed upload paths may use the file-deletion endpoint. */
export function photoRemovalAction(url: string, dog: DogPhotos): { kind: 'clear-reference' } | { kind: 'delete-upload'; filename: string } | null {
  if (!dog.photos?.length && dog.photo_url === url) return { kind: 'clear-reference' };
  if (!dog.photos?.includes(url)) return null;
  try {
    const pathname = new URL(url, 'https://local.invalid').pathname;
    const match = pathname.match(/^\/images\/dogs\/[a-z0-9-]+\/(photo-\d+\.(?:jpe?g|png|webp))$/i);
    return match ? { kind: 'delete-upload', filename: match[1] } : null;
  } catch {
    return null;
  }
}

function fileError(file: PhotoFile): string | null {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: formato não suportado (use JPG, PNG ou WebP).`;
  }
  if (file.size > MAX_PHOTO_BYTES) return `${file.name}: maior que 5 MiB.`;
  return null;
}

/** Validate again at save time, before creating or updating a dog. */
export function validatePhotoQueue(files: readonly PhotoFile[]): string[] {
  const errors = files.map(fileError).filter((error): error is string => error !== null);
  if (files.length > MAX_PHOTOS_PER_UPLOAD) errors.push('Pode guardar no máximo 8 novas fotos de cada vez.');
  return errors;
}

/** The limit applies to the pending queue, not already uploaded photos. */
export function selectPhotoFiles<T extends PhotoFile>(files: readonly T[], queuedCount = 0): { accepted: T[]; errors: string[] } {
  const accepted: T[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const error = fileError(file);
    if (error) errors.push(error);
    else if (queuedCount + accepted.length >= MAX_PHOTOS_PER_UPLOAD) {
      errors.push(`${file.name}: pode guardar no máximo 8 novas fotos de cada vez.`);
    }
    else accepted.push(file);
  }
  return { accepted, errors };
}
