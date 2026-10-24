import { getTranslations, type Locale } from '../../i18n';
import type { Dog } from '../../lib/pawsApi';
import { DOG_CARD_ROTATIONS, SEX_BADGE_CLASSES, SIZE_BADGE_CLASSES, getCardDescription } from './dogCardHelpers';
import { adoptedLabel, fosterLabel, fosterStatus, shortAge, sizeLabel as labelForSize, yearFrom } from '../../lib/dogFacts';

export default function PlayfulDogCard({ dog, locale, index }: { dog: Dog; locale: Locale; index: number }) {
  const t = getTranslations(locale);
  const sexLabels: Record<string, string> = {
    male: t.sexes.male,
    female: t.sexes.female,
  };
  const sizeLabel = labelForSize(dog.size, locale);
  const adopted = adoptedLabel(dog.sex, locale);
  const foster = !dog.is_adopted ? fosterStatus(dog.description) : null;
  const age = shortAge(yearFrom(dog.age), locale);
  const sexLabel = dog.sex ? sexLabels[dog.sex] ?? dog.sex : '';
  const badgeClasses = SIZE_BADGE_CLASSES[dog.size] ?? 'bg-white text-playful-muted border border-playful-line';
  const sexBadgeClasses = dog.sex ? SEX_BADGE_CLASSES[dog.sex] ?? SEX_BADGE_CLASSES.male : '';
  const rotation = DOG_CARD_ROTATIONS[index % DOG_CARD_ROTATIONS.length];
  const dogPath = locale === 'pt' ? `/cao?id=${dog.id}` : `/en/dog?id=${dog.id}`;
  const photoAlt = locale === 'pt' ? `Imagem de ${dog.name}` : `Image of ${dog.name}`;
  const cardLabel = [dog.name, dog.is_adopted ? adopted : '', foster ? fosterLabel(foster, dog.sex, locale) : '', sizeLabel, sexLabel, age].filter(Boolean).join(', ');

  return (
    <a
      href={dogPath}
      data-dog-card
      aria-label={cardLabel}
      className={`group block rounded-[1.85rem] border border-playful-line/80 bg-white p-3 shadow-pillowy transition-transform duration-300 hover:-translate-y-2 hover:rotate-0 hover:shadow-pillowy-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-playful-orange/35 ${rotation}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-[1.45rem] border-4 border-playful-cream bg-playful-cream shadow-inner">
        {dog.photo_url ? (
          <img
            src={dog.photo_url}
            alt={photoAlt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl text-playful-line" aria-hidden="true">🐾</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold shadow-sm ${badgeClasses}`}>
            {sizeLabel}
          </span>
          {sexLabel && (
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold shadow-sm ${sexBadgeClasses}`}>
              {sexLabel}
            </span>
          )}
        </div>
        {dog.is_adopted && (
          <span className="absolute bottom-3 right-3 rounded-full bg-playful-orange px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-pillowy">
            {adopted}
          </span>
        )}
        {foster && (
          <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-playful-orange-dark shadow-pillowy" data-dog-card-foster>
            {fosterLabel(foster, dog.sex, locale)}
          </span>
        )}
      </div>

      <div className="px-2 pb-3 pt-5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h3 className="font-playful-display text-2xl font-extrabold tracking-[-0.03em] text-playful-ink">{dog.name}</h3>
          {age && (
            <span className="rounded-full bg-playful-cream px-2.5 py-1 text-xs font-bold text-playful-muted">
              {age}
            </span>
          )}
        </div>
        <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-playful-muted">
          {getCardDescription(dog.description ?? '', locale)}
        </p>
        <span className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-playful-orange px-5 py-2 text-sm font-extrabold text-white shadow-sm transition-transform group-hover:scale-105">
          🐾 {locale === 'pt' ? 'Conhecer perfil' : 'View profile'}
        </span>
      </div>
    </a>
  );
}
