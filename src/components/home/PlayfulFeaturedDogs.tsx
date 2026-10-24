import { useEffect, useState } from 'react';
import { pawsApi } from '../../lib/pawsApi';
import { demoDogs } from '../../data/demoDogs';
import { getTranslations, localizeDescription, type Locale } from '../../i18n';
import { adoptedLabel, shortAge, sizeGroup, yearFrom } from '../../lib/dogFacts';
import type { Dog } from '../../lib/pawsApi';

type SizeFilter = 'all' | 'small' | 'medium' | 'large';

const SIZE_BADGE_CLASSES: Record<string, string> = {
  small: 'bg-playful-peach text-playful-orange-dark border border-playful-line',
  medium: 'bg-playful-orange text-white border border-playful-orange-dark/20',
  large: 'bg-playful-watermelon-dark text-white border border-playful-watermelon-dark/20',
};

const CARD_ROTATIONS = ['md:-rotate-1', 'md:rotate-1', 'md:rotate-2', 'md:-rotate-2', 'md:translate-y-4'];

function getCardDescription(description: string, locale: Locale): string {
  const normalized = description.replace(/\\n/g, '\n');
  const personality = normalized.match(/^Personalidade:\s*(.+)$/m)?.[1]?.trim();
  const story = normalized.match(/^História:\s*([\s\S]+)/m)?.[1]?.trim();
  const summary = [personality, story].filter(Boolean).join('. ');

  return localizeDescription(summary || normalized, locale);
}

function DogCard({ dog, locale, index }: { dog: Dog; locale: Locale; index: number }) {
  const t = getTranslations(locale);
  const badgeClasses = SIZE_BADGE_CLASSES[dog.size] ?? 'bg-white text-playful-muted border border-playful-line';
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];

  const sizeLabels: Record<string, string> = t.sizes;
  const sizeLabel = sizeLabels[dog.size] ?? dog.size;
  const dogPath = locale === 'pt' ? `/cao?id=${dog.id}` : `/en/dog?id=${dog.id}`;

  return (
    <a
      href={dogPath}
      data-featured-dog-card
      data-reveal="tilt"
      className={`group block rounded-[1.75rem] border border-playful-line/80 bg-white p-3 shadow-pillowy transition-transform duration-300 hover:-translate-y-2 hover:rotate-0 hover:shadow-pillowy-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-playful-orange/35 ${rotation}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-[1.35rem] border-4 border-playful-cream bg-playful-cream shadow-inner">
        {dog.photo_url ? (
          <img
            src={dog.photo_url}
            alt={`${t.featuredDogs.photoAlt} ${dog.name}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-106"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl text-playful-line">🐾</div>
        )}
        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold shadow-sm ${badgeClasses}`}>
          {sizeLabel}
        </span>
        {dog.is_adopted && (
          <span className="absolute inset-x-4 bottom-4 rounded-full bg-playful-orange/95 px-3 py-2 text-center text-xs font-extrabold uppercase tracking-wide text-white shadow-pillowy">
            {adoptedLabel(dog.sex, locale)}
          </span>
        )}
      </div>

      <div className="px-2 pb-3 pt-5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h3 className="font-playful-display text-2xl font-extrabold tracking-[-0.03em] text-playful-ink">{dog.name}</h3>
          {shortAge(yearFrom(dog.age), locale) && (
            <span className="rounded-full bg-playful-cream px-2.5 py-1 text-xs font-bold text-playful-muted">
              {shortAge(yearFrom(dog.age), locale)}
            </span>
          )}
        </div>
        <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-playful-muted">
          {getCardDescription(dog.description ?? '', locale)}
        </p>
        <span className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-playful-orange px-5 py-2 text-sm font-extrabold text-white shadow-sm transition-transform group-hover:scale-105">
          🐾 {t.hero.ctaPrimary}
        </span>
      </div>
    </a>
  );
}

export default function PlayfulFeaturedDogs({ locale = 'pt' }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const [dogs, setDogs] = useState<Dog[]>(demoDogs.filter((d) => !d.is_adopted));
  const [filter, setFilter] = useState<SizeFilter>('all');
  const [loading, setLoading] = useState(false);

  const filterTabs: { id: SizeFilter; label: string }[] = [
    { id: 'all', label: t.featuredDogs.filterAll },
    { id: 'small', label: t.featuredDogs.filterSmall },
    { id: 'medium', label: t.featuredDogs.filterMedium },
    { id: 'large', label: t.featuredDogs.filterLarge },
  ];

  const dogsPath = locale === 'pt' ? '/caes' : '/en/dogs';

  useEffect(() => {
    async function fetchDogs() {
      const localDogs = demoDogs.filter((d) => !d.is_adopted);
      setDogs(localDogs);
      setLoading(false);

      if (!pawsApi) return;

      try {
        const data = await pawsApi.getDogs(false);
        setDogs(data);
      } catch {
        // Keep committed dataset if the backend API is temporarily unavailable.
      }
    }

    fetchDogs();
  }, []);

  const filteredDogs = (() => {
    const result = filter === 'all' ? dogs : dogs.filter((d) => sizeGroup(d.size) === filter);
    return result.slice(0, 6);
  })();

  return (
    <section id="caes" className="relative px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="playful-featured-dogs-heading">
      <div className="mx-auto max-w-7xl">
        <div data-reveal="rise" className="mb-10 text-center">
          <span className="mb-3 inline-block text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">
            {t.featuredDogs.eyebrow}
          </span>
          <h2 id="playful-featured-dogs-heading" className="font-playful-display text-4xl font-extrabold tracking-[-0.04em] text-playful-orange-dark sm:text-5xl">
            {t.featuredDogs.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-8 text-playful-muted">
            {t.featuredDogs.subheading}
          </p>
        </div>

        <div data-reveal="pop" className="mb-10 flex flex-wrap justify-center gap-3" role="group" aria-label={t.featuredDogs.filterBySize}>
          {filterTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`rounded-full px-5 py-2.5 text-sm font-extrabold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-playful-orange/35 ${
                filter === id
                  ? 'bg-playful-orange text-white shadow-squish'
                  : 'bg-white text-playful-muted border border-playful-line hover:bg-playful-peach hover:text-playful-orange-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div data-reveal-stagger="80" className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} data-reveal="pop" className="rounded-[1.75rem] border border-playful-line bg-white p-3 shadow-pillowy">
                <div className="aspect-square animate-pulse rounded-[1.35rem] bg-playful-cream" />
                <div className="space-y-3 p-5">
                  <div className="mx-auto h-5 w-2/3 animate-pulse rounded-full bg-playful-line/50" />
                  <div className="h-4 animate-pulse rounded-full bg-playful-line/35" />
                  <div className="mx-auto h-4 w-4/5 animate-pulse rounded-full bg-playful-line/35" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredDogs.length > 0 && (
          <div data-reveal-stagger="80" className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDogs.map((dog, index) => (
              <DogCard key={dog.id} dog={dog} locale={locale} index={index} />
            ))}
          </div>
        )}

        {!loading && filteredDogs.length === 0 && (
          <div data-reveal="pop" className="rounded-playful border border-playful-line bg-white px-6 py-16 text-center shadow-pillowy">
            <div className="mb-4 text-5xl">🐾</div>
            <p className="text-lg font-bold text-playful-muted">{t.featuredDogs.emptyState}</p>
            <button onClick={() => setFilter('all')} className="mt-4 rounded-full bg-playful-peach px-5 py-2 text-sm font-extrabold text-playful-orange-dark">
              {t.featuredDogs.viewAll}
            </button>
          </div>
        )}

        {!loading && (
          <div data-reveal="rise" className="mt-12 text-center">
            <a href={dogsPath} className="squishy inline-flex items-center justify-center rounded-full bg-playful-orange px-8 py-4 font-playful-display font-extrabold text-white shadow-squish focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-playful-orange/35">
              {t.featuredDogs.viewAll}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
