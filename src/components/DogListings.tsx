import { useEffect, useMemo, useState } from 'react';
import { demoDogs } from '../data/demoDogs';
import { pawsApi } from '../lib/pawsApi';
import { getTranslations, type Locale } from '../i18n';
import type { Dog } from '../lib/pawsApi';
import PlayfulDogCard from './dogs/PlayfulDogCard';
import { sizeGroup } from '../lib/dogFacts';

type SizeFilter = 'all' | 'small' | 'medium' | 'large';
type SexFilter = 'all' | 'male' | 'female';

const FILTER_BUTTON_BASE = 'playful-focus min-h-11 rounded-full px-5 py-2.5 text-sm font-extrabold transition-all';

export default function DogListings({ locale = 'pt' }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const [dogs, setDogs] = useState<Dog[]>(demoDogs);
  const [filter, setFilter] = useState<SizeFilter>('all');
  const [sexFilter, setSexFilter] = useState<SexFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filterTabs: { id: SizeFilter; label: string }[] = [
    { id: 'all', label: t.dogListings.filterAll },
    { id: 'small', label: t.dogListings.filterSmall },
    { id: 'medium', label: t.dogListings.filterMedium },
    { id: 'large', label: t.dogListings.filterLarge },
  ];

  const sexFilterTabs: { id: SexFilter; label: string }[] = [
    { id: 'all', label: t.dogListings.filterAll },
    { id: 'female', label: t.dogListings.filterFemale },
    { id: 'male', label: t.dogListings.filterMale },
  ];

  useEffect(() => {
    async function fetchDogs() {
      const localDogs = demoDogs;
      setDogs(localDogs);
      setLoading(false);

      if (!pawsApi) {
        return;
      }

      try {
        const data = await pawsApi.getDogs(true);
        setDogs(data);
      } catch {
        // Keep the committed dataset if the backend API is temporarily unavailable.
      }
    }

    fetchDogs();
  }, []);

  const filteredDogs = useMemo(() => {
    let result = dogs;
    if (filter !== 'all') {
      result = result.filter((dog) => sizeGroup(dog.size) === filter);
    }
    if (sexFilter !== 'all') {
      result = result.filter((dog) => dog.sex === sexFilter);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((dog) => dog.name.toLowerCase().includes(term));
    }
    return result;
  }, [dogs, filter, search, sexFilter]);

  function resetFilters() {
    setFilter('all');
    setSexFilter('all');
    setSearch('');
  }

  const resultsText = filteredDogs.length === 1
    ? t.dogListings.resultsOne
    : `${filteredDogs.length} ${t.dogListings.resultsMany}`;

  const sizeLabelId = locale === 'pt' ? 'caes-size-filter-label' : 'dogs-size-filter-label';
  const sexLabelId = locale === 'pt' ? 'caes-sex-filter-label' : 'dogs-sex-filter-label';

  return (
    <section id="lista-caes" className="relative overflow-hidden px-5 py-14 sm:px-8 lg:py-20" aria-label={t.dogListings.sectionLabel}>
      <div className="ambient-blob left-1/2 top-10 h-80 w-80 -translate-x-1/2 bg-playful-peach/70" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div data-reveal="rise" className="mb-10 rounded-[2rem] border border-playful-line/80 bg-white/82 p-5 shadow-pillowy backdrop-blur sm:p-6 lg:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label htmlFor="dog-search" className="mb-3 block text-xs font-extrabold uppercase tracking-[0.22em] text-playful-orange-dark">
                {t.dogListings.searchLabel}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-playful-orange-dark" aria-hidden="true">
                  ⌕
                </div>
                <input
                  id="dog-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.dogListings.searchPlaceholder}
                  aria-label={t.dogListings.searchLabel}
                  className="playful-focus min-h-14 w-full rounded-full border-2 border-playful-line bg-playful-canvas py-3 pl-12 pr-5 text-base font-bold text-playful-ink placeholder:text-playful-muted/55 shadow-inner transition-colors focus:border-playful-orange"
                />
              </div>
            </div>

            {!loading && (
              <p className="rounded-full bg-playful-peach px-5 py-3 text-center text-sm font-extrabold text-playful-orange-dark shadow-sm" aria-live="polite">
                {resultsText}
              </p>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div>
              <p id={sizeLabelId} className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-playful-muted/80">
                {t.dogListings.filterBySize}
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby={sizeLabelId}>
                {filterTabs.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                    className={`${FILTER_BUTTON_BASE} ${filter === id ? 'bg-playful-orange text-white shadow-squish' : 'border border-playful-line bg-white text-playful-muted shadow-sm hover:bg-playful-peach hover:text-playful-orange-dark'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p id={sexLabelId} className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-playful-muted/80">
                {t.dogListings.filterBySex}
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby={sexLabelId}>
                {sexFilterTabs.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={sexFilter === id}
                    onClick={() => setSexFilter(id)}
                    className={`${FILTER_BUTTON_BASE} ${sexFilter === id ? 'bg-playful-orange-dark text-white shadow-squish' : 'border border-playful-line bg-white text-playful-muted shadow-sm hover:bg-playful-peach hover:text-playful-orange-dark'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div data-reveal-stagger="70" className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} data-reveal="pop" className="rounded-[1.85rem] border border-playful-line bg-white p-3 shadow-pillowy">
                <div className="aspect-square animate-pulse rounded-[1.45rem] bg-playful-cream" />
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
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDogs.map((dog, index) => (
              <PlayfulDogCard key={dog.id} dog={dog} locale={locale} index={index} />
            ))}
          </div>
        )}

        {!loading && filteredDogs.length === 0 && (
          <div data-reveal="pop" className="rounded-playful border border-playful-line bg-white px-6 py-16 text-center shadow-pillowy">
            <div className="mb-4 text-6xl" aria-hidden="true">🐾</div>
            <p className="text-xl font-extrabold text-playful-orange-dark">
              {t.dogListings.emptyTitle}
            </p>
            <p className="mt-2 text-sm font-bold text-playful-muted">
              {t.dogListings.emptyDesc}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="playful-focus squishy mt-6 inline-flex items-center justify-center rounded-full bg-playful-orange px-6 py-3 text-sm font-extrabold text-white shadow-squish"
            >
              {t.dogListings.clearFilters}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
