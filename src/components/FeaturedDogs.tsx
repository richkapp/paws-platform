import { useState, useEffect } from 'react';
import { capaApi } from '../lib/capaApi';
import { capaDogs } from '../data/capaDogs';
import { getTranslations, localizeDescription, type Locale } from '../i18n';
import { adoptedLabel, shortAge, sizeGroup, yearFrom } from '../lib/dogFacts';
import type { Dog } from '../lib/capaApi';

type SizeFilter = 'all' | 'small' | 'medium' | 'large';

const SIZE_BADGE_CLASSES: Record<string, string> = {
  small: 'bg-nature-100 text-nature-700 border border-nature-200',
  medium: 'bg-primary-100 text-primary-700 border border-primary-200',
  large: 'bg-warm-100 text-warm-700 border border-warm-200',
};

function getCardDescription(description: string, locale: Locale): string {
  const normalized = description.replace(/\\n/g, '\n');
  const personality = normalized.match(/^Personalidade:\s*(.+)$/m)?.[1]?.trim();
  const story = normalized.match(/^História:\s*([\s\S]+)/m)?.[1]?.trim();
  const summary = [personality, story].filter(Boolean).join('. ');

  return localizeDescription(summary || normalized, locale);
}

function DogCard({ dog, locale }: { dog: Dog; locale: Locale }) {
  const t = getTranslations(locale);
  const badgeClasses = SIZE_BADGE_CLASSES[dog.size] ?? 'bg-warm-100 text-warm-700 border border-warm-200';

  const sizeLabels: Record<string, string> = t.sizes;
  const sizeLabel = sizeLabels[dog.size] ?? dog.size;

  const dogPath = locale === 'pt' ? `/cao?id=${dog.id}` : `/en/dog?id=${dog.id}`;

  return (
    <a href={dogPath} className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-warm-200 transition-all duration-200 group cursor-pointer">
      {/* Photo */}
      <div className="relative aspect-square overflow-hidden bg-warm-100">
        {dog.photo_url ? (
          <img
            src={dog.photo_url}
            alt={`${t.featuredDogs.photoAlt} ${dog.name}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-warm-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16" aria-hidden="true">
              <path d="M12 2C10.9 2 10 2.9 10 4s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-4 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm8 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-4 4c-2.2 0-4 1.5-4 3.3 0 .8.3 1.6.9 2.3L7 15c-.6.6-1 1.5-1 2.4C6 19.4 7.6 21 9.6 21h4.8c2 0 3.6-1.6 3.6-3.6 0-.9-.4-1.8-1-2.4l-.9-1.4c.6-.7.9-1.5.9-2.3C17 9.5 15.2 8 13 8h-1z"/>
            </svg>
          </div>
        )}
        {/* Size badge overlay */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClasses}`}>
          {sizeLabel}
        </span>
        {dog.is_adopted && (
          <span className="absolute inset-x-0 bottom-0 bg-primary-500/95 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-white shadow-md">
            {adoptedLabel(dog.sex, locale)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-warm-900">{dog.name}</h3>
          {shortAge(yearFrom(dog.age), locale) && (
            <span className="text-xs text-warm-500 font-medium bg-warm-50 px-2 py-1 rounded-lg border border-warm-200 flex-shrink-0 ml-2">
              {shortAge(yearFrom(dog.age), locale)}
            </span>
          )}
        </div>
        <p className="text-warm-600 text-sm leading-relaxed line-clamp-3">
          {getCardDescription(dog.description ?? '', locale)}
        </p>
      </div>
    </a>
  );
}

export default function FeaturedDogs({ locale = 'pt' }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [filter, setFilter] = useState<SizeFilter>('all');
  const [loading, setLoading] = useState(true);

  const filterTabs: { id: SizeFilter; label: string }[] = [
    { id: 'all', label: t.featuredDogs.filterAll },
    { id: 'small', label: t.featuredDogs.filterSmall },
    { id: 'medium', label: t.featuredDogs.filterMedium },
    { id: 'large', label: t.featuredDogs.filterLarge },
  ];

  const dogsPath = locale === 'pt' ? '/caes' : '/en/dogs';

  useEffect(() => {
    async function fetchDogs() {
      const localDogs = capaDogs.filter((d) => !d.is_adopted);
      setDogs(localDogs);
      setLoading(false);

      if (!capaApi) {
        return;
      }

      try {
        const data = await capaApi.getDogs(false);
        if (data.length > 0) setDogs(data);
      } catch {
        // Keep the committed dataset if the Hetzner API is temporarily unavailable.
      }
    }

    fetchDogs();
  }, []);

  const filteredDogs = (() => {
    let result = dogs;
    if (filter !== 'all') {
      result = dogs.filter((d) => sizeGroup(d.size) === filter);
    }
    return result.slice(0, 6);
  })();

  return (
    <section className="bg-warm-50 py-20" aria-labelledby="featured-dogs-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-primary-600 text-sm font-semibold tracking-wider uppercase mb-3">
            {t.featuredDogs.eyebrow}
          </span>
          <h2 id="featured-dogs-heading" className="text-3xl sm:text-4xl font-bold text-warm-900 mb-4">
            {t.featuredDogs.heading}
          </h2>
          <p className="text-warm-600 text-lg max-w-2xl mx-auto">
            {t.featuredDogs.subheading}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10" role="tablist" aria-label={t.featuredDogs.filterBySize}>
          {filterTabs.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filter === id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-warm-700 border border-warm-200 hover:bg-warm-100 hover:border-warm-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-warm-200 animate-pulse">
                <div className="aspect-square bg-warm-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-warm-200 rounded-lg w-2/3" />
                  <div className="h-4 bg-warm-100 rounded-lg w-full" />
                  <div className="h-4 bg-warm-100 rounded-lg w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dogs grid */}
        {!loading && filteredDogs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDogs.map((dog) => (
              <DogCard key={dog.id} dog={dog} locale={locale} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredDogs.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🐾</div>
            <p className="text-warm-600 text-lg font-medium">
              {t.featuredDogs.emptyState}
            </p>
            <button
              onClick={() => setFilter('all')}
              className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-semibold underline underline-offset-2"
            >
              {t.featuredDogs.viewAll}
            </button>
          </div>
        )}

        {/* CTA */}
        {!loading && (
          <div className="text-center mt-12">
            <a
              href={dogsPath}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold text-lg rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
            >
              {t.featuredDogs.viewAll}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        )}

      </div>
    </section>
  );
}
