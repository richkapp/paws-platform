import { describe, expect, test } from 'bun:test';
import { photoRemovalAction, resolveDogPhotos, selectPhotoFiles, validatePhotoQueue } from '../src/lib/photoUploadRules';

const photo = (name = 'dog.png', size = 1024, type = 'image/png') => ({ name, size, type });

describe('admin photo upload contract', () => {
  test('uses uploaded photos before the fallback, including the authoritative empty state', () => {
    expect(resolveDogPhotos({ photos: ['https://api.example.invalid/images/dogs/miso/photo-01.jpg'], photo_url: '/illustrations/miso-portrait.svg' }))
      .toEqual(['https://api.example.invalid/images/dogs/miso/photo-01.jpg']);
    expect(resolveDogPhotos({ photos: [], photo_url: '/illustrations/miso-portrait.svg' })).toEqual(['/illustrations/miso-portrait.svg']);
    expect(resolveDogPhotos({ photos: [], photo_url: '' })).toEqual([]);
    expect(resolveDogPhotos(null)).toEqual([]);
  });

  test('clears fallback references without deleting immutable illustration or arbitrary assets', () => {
    expect(photoRemovalAction('/illustrations/miso-portrait.svg', { photos: [], photo_url: '/illustrations/miso-portrait.svg' }))
      .toEqual({ kind: 'clear-reference' });
    expect(photoRemovalAction('/images/dogs/miso/photo-01.jpg', { photos: [], photo_url: '/images/dogs/miso/photo-01.jpg' }))
      .toEqual({ kind: 'clear-reference' });
    expect(photoRemovalAction('/images/custom.png', { photos: [], photo_url: '/images/custom.png' }))
      .toEqual({ kind: 'clear-reference' });
    expect(photoRemovalAction('/images/dogs/miso/photo-01.jpg', { photos: ['/images/dogs/miso/photo-01.jpg'], photo_url: '/images/dogs/miso/photo-01.jpg' }))
      .toEqual({ kind: 'delete-upload', filename: 'photo-01.jpg' });
    expect(photoRemovalAction('https://api.example.invalid/images/dogs/miso/photo-02.jpg', { photos: ['https://api.example.invalid/images/dogs/miso/photo-02.jpg'], photo_url: '' }))
      .toEqual({ kind: 'delete-upload', filename: 'photo-02.jpg' });
    for (const url of ['/illustrations/photo-01.svg', '/illustrations/photo-01.jpg', '/images/dogs/miso/%2e%2e.jpg', '/images/dogs/miso/bad%ZZ.jpg']) {
      expect(photoRemovalAction(url, { photos: [url], photo_url: url })).toBeNull();
    }
    expect(photoRemovalAction('/images/dogs/miso/photo-02.jpg', { photos: ['/images/dogs/miso/photo-01.jpg'], photo_url: '' })).toBeNull();
  });
  test('accepts JPEG, PNG and WebP at the exact 5 MiB boundary', () => {
    const files = [
      photo('dog.jpg', 5_242_880, 'image/jpeg'),
      photo('dog.png', 5_242_880, 'image/png'),
      photo('dog.webp', 5_242_880, 'image/webp'),
    ];
    expect(selectPhotoFiles(files)).toEqual({ accepted: files, errors: [] });
    expect(validatePhotoQueue(files)).toEqual([]);
  });

  test('accepts eight files but rejects the ninth across repeated selections', () => {
    const eight = Array.from({ length: 8 }, (_, i) => photo(`dog-${i}.png`));
    expect(selectPhotoFiles(eight)).toEqual({ accepted: eight, errors: [] });
    expect(validatePhotoQueue(eight)).toEqual([]);
    const ninth = photo('ninth.png');
    expect(selectPhotoFiles([ninth], 8)).toEqual({
      accepted: [], errors: ['ninth.png: pode guardar no máximo 8 novas fotos de cada vez.'],
    });
    expect(selectPhotoFiles(eight.slice(6), 6).accepted).toHaveLength(2);
    expect(selectPhotoFiles([...eight, ninth]).accepted).toHaveLength(8);
    expect(validatePhotoQueue([...eight, ninth])).toContain('Pode guardar no máximo 8 novas fotos de cada vez.');
  });

  test('rejects other image MIME types, empty types and misleading file extensions', () => {
    for (const type of ['image/gif', 'image/svg+xml', 'image/heic', 'image/heif', '', 'text/plain', 'image/jpg']) {
      const files = [photo('looks-valid.png', 1024, type)];
      expect(selectPhotoFiles(files)).toEqual({
        accepted: [], errors: ['looks-valid.png: formato não suportado (use JPG, PNG ou WebP).'],
      });
      expect(validatePhotoQueue(files)).toHaveLength(1);
    }
    const valid = photo('valid.webp', 100, 'image/webp');
    expect(selectPhotoFiles([photo('bad.gif', 100, 'image/gif'), valid]).accepted).toEqual([valid]);
  });

  test('rejects one byte over 5 MiB before queuing or saving', () => {
    const files = [photo('large.png', 5_242_881)];
    expect(selectPhotoFiles(files)).toEqual({
      accepted: [], errors: ['large.png: maior que 5 MiB.'],
    });
    expect(validatePhotoQueue(files)).toEqual(['large.png: maior que 5 MiB.']);
  });
});
