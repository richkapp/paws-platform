import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { pawsApi } from '../lib/pawsApi';
import { demoDogs } from '../data/demoDogs';
import { getTranslations, type Locale } from '../i18n';
import type { Dog } from '../lib/pawsApi';
import VisitSchedule from './VisitSchedule';
import { submitFormSubmission } from '../lib/formSubmission';
import { demoDogText } from '../i18n/demoDogText';
import { parseDescription } from '../lib/dogDescription';
import { shelter, demoNotice } from '../config/shelter';
import { adoptTitle, adoptedDesc, adoptedLabel, formatAge, formatShelterSince, fosterNote, sizeLabel as labelForSize, yearFrom } from '../lib/dogFacts';

const SIZE_BADGE_CLASSES: Record<string, string> = {
  small: 'bg-playful-peach text-playful-orange-dark border border-playful-orange/20',
  'small-medium': 'bg-playful-peach text-playful-orange-dark border border-playful-orange/20',
  'medium-large': 'bg-playful-cream text-playful-orange-dark border border-playful-line',
  medium: 'bg-white text-playful-orange-dark border border-playful-line',
  large: 'bg-playful-cream text-playful-orange-dark border border-playful-line',
};

/* ── Localize parsed description fields ── */
/* Descriptions are stored in PT. These helpers translate parsed labels/values to the target locale. */
function localizeField(label: string, value: string, locale: Locale): { label: string; value: string } {
  if (locale === 'pt') return { label, value };
  const ptT = getTranslations('pt').admin;
  const enT = getTranslations(locale).admin;
  const ptSizes = getTranslations('pt').sizes;
  const enSizes = getTranslations(locale).sizes;

  const labelMap: Record<string, string> = {
    [ptT.descSex]: enT.descSex,
    [ptT.descAge]: enT.descAge,
    [ptT.descEntryDate]: enT.descEntryDate,
    [ptT.descBreed]: enT.descBreed,
    [ptT.descSize]: enT.descSize,
    [ptT.descPersonality]: enT.descPersonality,
    [ptT.descStory]: enT.descStory,
    'No abrigo desde': 'At the shelter since',
  };
  const valueMap: Record<string, string> = {
    [ptT.descSexMale]: enT.descSexMale,
    [ptT.descSexFemale]: enT.descSexFemale,
    [ptSizes.small]: enSizes.small,
    [ptSizes.medium]: enSizes.medium,
    [ptSizes.large]: enSizes.large,
  };
  return {
    label: labelMap[label] ?? label,
    value: valueMap[value] ?? demoDogText(value, locale),
  };
}

function localizeTag(text: string, locale: Locale): string {
  if (locale === 'pt') return text;
  const ptT = getTranslations('pt').admin;
  const enT = getTranslations(locale).admin;
  const tagMap: Record<string, string> = {
    [ptT.descGoodWithPeople]: enT.descGoodWithPeople,
    [ptT.descNotGoodWithPeople]: enT.descNotGoodWithPeople,
    [ptT.descUnknownPeople]: enT.descUnknownPeople,
    [ptT.descGoodWithMales]: enT.descGoodWithMales,
    [ptT.descNotGoodWithMales]: enT.descNotGoodWithMales,
    [ptT.descUnknownMales]: enT.descUnknownMales,
    [ptT.descGoodWithFemales]: enT.descGoodWithFemales,
    [ptT.descNotGoodWithFemales]: enT.descNotGoodWithFemales,
    [ptT.descUnknownFemales]: enT.descUnknownFemales,
    [ptT.descGoodWithCats]: enT.descGoodWithCats,
    [ptT.descNotGoodWithCats]: enT.descNotGoodWithCats,
    [ptT.descUnknownCats]: enT.descUnknownCats,
    [ptT.descChipped]: enT.descChipped,
    [ptT.descVaccinated]: enT.descVaccinated,
    [ptT.descSterilized]: enT.descSterilized,
  };
  // Handle combined medical lines like "Chipado, Vacinado" (also feminine and "Castrado")
  const neutral: Record<string, string> = { Chipada: ptT.descChipped, Vacinada: ptT.descVaccinated, Esterilizada: ptT.descSterilized, Castrado: ptT.descSterilized, Castrada: ptT.descSterilized };
  const parts = text.split(',').map(s => s.trim()).map(p => neutral[p] ?? p);
  if (parts.length > 1 && parts.every(p => tagMap[p])) {
    return parts.map(p => tagMap[p]).join(', ');
  }
  return tagMap[neutral[text] ?? text] ?? text;
}

/* ── Sociability & medical tags ── */
/* Tag text is always Portuguese (from stored description), so we check Portuguese strings */
function TagBadge({ text, locale }: { text: string; locale: Locale }) {
  const displayText = localizeTag(text, locale);
  const isPositive = text.startsWith('Sociável') || /^(Chipad|Vacinad|Esterilizad|Castrad)/.test(text);
  const isUnknown = text.startsWith('Não sabemos');
  const isNegative = text.startsWith('Não sociável');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold ${
        isPositive
          ? 'border border-playful-orange/20 bg-playful-peach text-playful-orange-dark'
          : isNegative
          ? 'border border-amber-300 bg-amber-50 text-amber-900'
          : isUnknown
          ? 'border border-playful-line bg-white/80 text-playful-muted'
          : 'border border-playful-line bg-playful-cream text-playful-muted'
      }`}
    >
      {isPositive && '✓'}{isNegative && '✕'} {displayText}
    </span>
  );
}

/* ── Photo Gallery ── */
function PhotoGallery({ photos, name, locale, adoptedLabel }: { photos: string[]; name: string; locale: Locale; adoptedLabel?: string }) {
  const t = getTranslations(locale);
  const [selected, setSelected] = useState(0);

  if (photos.length === 0) return null;

  const goToPreviousPhoto = () => setSelected((selected - 1 + photos.length) % photos.length);
  const goToNextPhoto = () => setSelected((selected + 1) % photos.length);

  return (
    <div className="min-w-0 max-w-full space-y-4" data-dog-profile-gallery>
      <div className="relative aspect-[4/3] min-w-0 max-w-full overflow-hidden rounded-[2.4rem] border-[10px] border-white bg-playful-cream shadow-pillowy-lg lg:rotate-1" data-dog-profile-gallery-frame>
        <img
          src={photos[selected]}
          alt={`${t.dogProfile.breadcrumbDogs} ${name}`}
          className="block h-full w-full max-w-full object-contain object-center"
        />
        {adoptedLabel && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-playful-orange px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-squish" data-dog-profile-adopted-badge>
            {adoptedLabel}
          </span>
        )}
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPreviousPhoto}
              className="playful-focus absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-playful-orange-dark shadow-pillowy transition-transform hover:scale-105 md:flex"
              aria-label={t.dogProfile.prevPhoto}
              data-gallery-prev="desktop"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={goToNextPhoto}
              className="playful-focus absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-playful-orange-dark shadow-pillowy transition-transform hover:scale-105 md:flex"
              aria-label={t.dogProfile.nextPhoto}
              data-gallery-next="desktop"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="absolute bottom-4 right-4 hidden rounded-full bg-playful-orange-dark/82 px-4 py-2 text-sm font-extrabold text-white shadow-sm backdrop-blur-sm md:block">
              {selected + 1} / {photos.length}
            </div>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-4 md:hidden" data-gallery-mobile-controls>
          <button
            onClick={goToPreviousPhoto}
            className="playful-focus flex h-11 w-11 items-center justify-center rounded-full bg-white text-playful-orange-dark shadow-pillowy transition-transform active:scale-95"
            aria-label={t.dogProfile.prevPhoto}
            data-gallery-prev="mobile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="rounded-full bg-playful-orange-dark/88 px-4 py-2 text-sm font-extrabold text-white shadow-sm" data-gallery-mobile-count>
            {selected + 1} / {photos.length}
          </span>
          <button
            onClick={goToNextPhoto}
            className="playful-focus flex h-11 w-11 items-center justify-center rounded-full bg-white text-playful-orange-dark shadow-pillowy transition-transform active:scale-95"
            aria-label={t.dogProfile.nextPhoto}
            data-gallery-next="mobile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {photos.length > 1 && (
        <div className="flex max-w-full gap-3 overflow-x-auto pb-2">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`playful-focus h-20 w-20 flex-shrink-0 overflow-hidden rounded-[1.3rem] border-3 transition-all md:h-24 md:w-24 ${
                i === selected
                  ? 'border-playful-orange shadow-pillowy ring-4 ring-playful-peach'
                  : 'border-white opacity-75 shadow-sm hover:opacity-100'
              }`}
              aria-label={`${t.dogProfile.viewPhoto} ${i + 1} ${name}`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



/* ── Loading skeleton ── */
function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-8" data-dog-profile-loading>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="aspect-[4/3] rounded-[2.4rem] bg-playful-peach" />
        <div className="space-y-5 pt-8">
          <div className="h-12 w-56 rounded-full bg-playful-peach" />
          <div className="h-20 rounded-[2rem] bg-playful-peach/80" />
          <div className="h-40 rounded-[2rem] bg-white" />
        </div>
      </div>
    </div>
  );
}

/* ── 404 ── */
function NotFound({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const dogsPath = locale === 'pt' ? '/caes' : '/en/dogs';

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-playful-line bg-white/88 px-6 py-16 text-center shadow-pillowy-lg sm:px-10" data-dog-profile-not-found>
      <div className="mx-auto mb-6 flex h-24 w-24 -rotate-6 items-center justify-center rounded-full bg-playful-peach text-5xl shadow-pillowy">🐾</div>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{shelter.name}</p>
      <h1 className="font-playful-display text-4xl font-extrabold tracking-[-0.05em] text-playful-orange-dark sm:text-5xl">{t.dogProfile.notFoundTitle}</h1>
      <p className="mx-auto mt-5 max-w-xl text-lg font-medium leading-8 text-playful-muted">{t.dogProfile.notFoundDesc}</p>
      <a
        href={dogsPath}
        className="squishy playful-focus mt-8 inline-flex items-center gap-2 rounded-full bg-playful-orange px-7 py-4 font-playful-display font-extrabold text-white shadow-squish"
      >
        {t.dogProfile.viewAllDogs}
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

/* ── Adoption interest modal ── */
function AdoptionInterest({ dogName, locale }: { dogName: string; locale: Locale }) {
  const t = getTranslations(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'sent' | 'fallback' | 'disabled' | 'dry-run'>('idle');

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const openModal = () => {

    setSubmitState('idle');
    setIsOpen(true);
  };
  const closeModal = () => setIsOpen(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shelter.forms.enabled) { setSubmitState('disabled'); return; }
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const get = (name: string) => String(data.get(name) ?? '').trim();
    const phone = get('adoption_phone') || t.dogProfile.visitNotProvided;
    const message = get('adoption_message') || t.dogProfile.visitNotProvided;

    setSubmitState('submitting');

    const result = await submitFormSubmission({
      kind: 'adoption_interest',
      locale,
      source: 'dog-adoption-modal',
      pageUrl: window.location.href,
      contextLabel: t.dogProfile.visitDogLabel,
      contextValue: dogName,
      name: get('adoption_name'),
      email: get('adoption_email'),
      phone,
      message,
      website: get('website'),
    }, { skipBackend: form.dataset.skipBackend === 'true' });

    if (result.status === 'disabled') { setSubmitState('disabled'); return; }
    if (result.status === 'sent') {
      setSubmitState(result.dryRun ? 'dry-run' : 'sent');
      form.reset();
      return;
    }

    setSubmitState('fallback');


  };

  const modal: ReactNode = (
    <div
      data-adoption-modal
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-playful-ink/55 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adoption-modal-title"
      aria-describedby="adoption-modal-intro"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div data-adoption-modal-panel className="relative w-full max-w-2xl overflow-y-auto rounded-[2rem] border-2 border-playful-line bg-playful-canvas p-5 text-left text-playful-ink shadow-pillowy-lg sm:max-h-[calc(100svh-2rem)] sm:p-7" style={{ maxHeight: 'calc(100svh - 2rem)' }}>
        <button
          data-adoption-close
          type="button"
          onClick={closeModal}
          className="playful-focus absolute right-4 top-4 rounded-full border border-playful-line bg-white px-3 py-2 text-sm font-extrabold text-playful-orange-dark shadow-sm"
          aria-label={t.dogProfile.visitClose}
        >
          ×
        </button>
        <span className="text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{dogName}</span>
        <h2 id="adoption-modal-title" className="mt-2 pr-10 font-playful-display text-3xl font-extrabold tracking-[-0.03em] text-playful-orange-dark">
          {t.dogProfile.adoptionFormTitle}
        </h2>
        <p id="adoption-modal-intro" className="mt-3 text-sm font-semibold leading-7 text-playful-muted sm:text-base">
          {t.dogProfile.adoptionFormIntro}
        </p>

        <form data-adoption-form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {!shelter.forms.enabled && <p data-form-disabled role="status" className="rounded-2xl border border-playful-line bg-playful-peach p-4 text-sm font-bold leading-6">{demoNotice(locale)}</p>}
          <fieldset disabled={!shelter.forms.enabled} className="space-y-5">
          <label className="hidden" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-extrabold text-playful-orange-dark">
              {t.dogProfile.visitNameLabel}
              <input name="adoption_name" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="name" />
            </label>
            <label className="block text-sm font-extrabold text-playful-orange-dark">
              {t.dogProfile.visitEmailLabel}
              <input name="adoption_email" type="email" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="email" />
            </label>
            <label className="block text-sm font-extrabold text-playful-orange-dark sm:col-span-2">
              {t.dogProfile.visitPhoneLabel}
              <input name="adoption_phone" type="tel" className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="tel" placeholder={t.dogProfile.visitPhonePlaceholder} />
            </label>
          </div>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.dogProfile.visitMessageLabel}
            <textarea name="adoption_message" rows={4} className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" placeholder={t.dogProfile.adoptionMessagePlaceholder} />
          </label>

          {submitState === 'dry-run' && <p data-form-dry-run role="status" className="rounded-2xl border border-playful-line bg-playful-peach p-4 text-sm font-bold">{locale === 'pt' ? 'Teste local concluído. Nenhum email foi enviado (modo dry-run).' : 'Local test complete. No email was sent (dry-run mode).'}</p>}

          {submitState === 'sent' && (
            <p data-adoption-success className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-800" aria-live="polite">
              {t.dogProfile.adoptionSent}
            </p>
          )}

          {submitState === 'fallback' && <p role="alert" className="rounded-2xl bg-playful-peach p-4 text-sm font-bold">{locale === 'pt' ? 'Não foi possível enviar. Tenta novamente mais tarde.' : 'Could not send. Please try again later.'}</p>}

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button data-adoption-close type="button" onClick={closeModal} className="playful-focus w-full rounded-full border-2 border-playful-orange bg-white px-6 py-3 font-playful-display text-sm font-extrabold text-playful-orange-dark shadow-pillowy sm:w-auto">
              {t.dogProfile.visitClose}
            </button>
            <button type="submit" disabled={!shelter.forms.enabled || submitState === 'submitting'} className="squishy playful-focus w-full rounded-full bg-playful-orange px-6 py-3 font-playful-display text-sm font-extrabold text-white shadow-squish disabled:cursor-wait disabled:opacity-70 sm:w-auto">
              {submitState === 'submitting' ? t.dogProfile.adoptionSubmitting : t.dogProfile.adoptionSubmit}
            </button>
          </div>
        </fieldset>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        data-adoption-open
        onClick={openModal}
        className="squishy playful-focus inline-flex w-full items-center justify-center gap-2 rounded-full bg-playful-orange px-7 py-4 font-playful-display font-extrabold text-white shadow-squish sm:w-auto"
        aria-haspopup="dialog"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
          <path d="M19 8.839l-7.616 3.808a2.75 2.75 0 01-2.768 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
        </svg>
        {t.dogProfile.sendEmail}
      </button>
      {isOpen && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
    </>
  );
}

/* ── Main Profile Component ── */
/** Public reads must distinguish an authoritative missing dog from an unavailable API.
 * pawsApi.getDog currently converts both to null, so this profile checks HTTP status itself.
 */
export async function loadProfileDog(dogId: string, apiBaseUrl = pawsApi?.baseUrl): Promise<Dog | null> {
  const fallback = demoDogs.find(dog => dog.id === dogId) ?? null;
  if (!apiBaseUrl) return fallback;
  try {
    const response = await fetch(`${apiBaseUrl}/dogs/${encodeURIComponent(dogId)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Profile API unavailable');
    const body: { dog?: Dog | null } = await response.json();
    if (body.dog === undefined) throw new Error('Invalid profile response');
    return body.dog;
  } catch {
    return fallback;
  }
}

export function profileDescription(dog: Dog, locale: Locale) {
  const parsed = parseDescription(dog.description);
  const originalDog = demoDogs.find(original => original.id === dog.id);
  const original = originalDog ? parseDescription(originalDog.description) : null;
  const prose = (key: 'personality' | 'story' | 'note') =>
    original && parsed[key] === original[key] ? demoDogText(parsed[key], locale) : parsed[key];
  return { ...parsed, personality: prose('personality'), story: prose('story'), note: prose('note') };
}

export default function DogProfile({ locale = 'pt' }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const homePath = locale === 'pt' ? '/' : '/en/';
  const dogsPath = locale === 'pt' ? '/caes' : '/en/dogs';
  const adoptPath = locale === 'pt' ? '/adocao' : '/en/adopt';

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const dogId = params.get('id');

      if (!dogId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const data = await loadProfileDog(dogId);
      setDog(data);
      setNotFound(!data);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (notFound || !dog) return <NotFound locale={locale} />;

  const photos = dog.photos?.length ? dog.photos : dog.photo_url ? [dog.photo_url] : [];
  const sizeLabel = labelForSize(dog.size, locale);
  const adopted = adoptedLabel(dog.sex, locale);
  const badgeClasses = SIZE_BADGE_CLASSES[dog.size] ?? 'bg-white text-playful-orange-dark border border-playful-line';
  const parsed = dog.description ? parseDescription(dog.description) : null;
  const prose = profileDescription(dog, locale);

  const infoFields = (parsed?.fields.filter(f => f.label !== '✓' && f.label !== '🏥') ?? []).map((f) => {
    const key = f.label.trim().toLowerCase();
    if (key === 'idade') {
      return { label: f.label, value: formatAge(yearFrom(f.value), 'pt') ?? f.value, display: formatAge(yearFrom(f.value), locale) };
    }
    if (key === 'data de entrada' || key === 'deu entrada') {
      const since = formatShelterSince(yearFrom(f.value), locale);
      return { label: 'No abrigo desde', value: f.value, display: since };
    }
    if (key === 'porte') {
      return { label: f.label, value: f.value, display: sizeLabel };
    }
    return { ...f, display: null as string | null };
  });
  const foster = !dog.is_adopted && parsed?.foster ? fosterNote(parsed.foster, dog.name, dog.sex, locale) : null;
  const note = parsed?.note ?? '';
  const tags = parsed?.fields.filter(f => f.label === '✓' || f.label === '🏥') ?? [];

  return (
    <div className="relative mx-auto max-w-7xl" data-dog-profile>
      <div className="ambient-blob -left-32 top-24 h-96 w-96 bg-playful-peach/70" aria-hidden="true" />
      <div className="ambient-blob -right-28 top-0 h-96 w-96 bg-playful-orange/25" aria-hidden="true" />

      <nav className="relative z-10 mb-8 flex flex-wrap items-center gap-2 text-sm font-extrabold text-playful-muted" aria-label="Breadcrumb">
        <a href={homePath} className="playful-focus rounded-full bg-white/70 px-3 py-2 hover:text-playful-orange-dark">{t.dogProfile.breadcrumbHome}</a>
        <span aria-hidden="true">/</span>
        <a href={dogsPath} className="playful-focus rounded-full bg-white/70 px-3 py-2 hover:text-playful-orange-dark">{t.dogProfile.breadcrumbDogs}</a>
        <span aria-hidden="true">/</span>
        <span className="rounded-full bg-playful-peach px-3 py-2 text-playful-orange-dark">{dog.name}</span>
      </nav>

      <section className="relative z-10 grid min-w-0 items-start gap-10 lg:grid-cols-[1.04fr_0.96fr]" aria-labelledby="dog-profile-heading">
        <div className="min-w-0 space-y-5" data-dog-profile-gallery-column>
          <PhotoGallery photos={photos} name={dog.name} locale={locale} adoptedLabel={dog.is_adopted ? adopted : undefined} />
          {!dog.is_adopted && <VisitSchedule dogName={dog.name} locale={locale} source="dog" />}
        </div>

        <div className="min-w-0 space-y-7">
          <div className="rounded-[2.3rem] border border-playful-line bg-white/88 p-6 shadow-pillowy-lg sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-4 py-2 text-sm font-extrabold shadow-sm ${badgeClasses}`}>{sizeLabel}</span>
              {dog.is_adopted && <span className="rounded-full bg-playful-orange px-4 py-2 text-sm font-extrabold uppercase text-white shadow-sm">{adopted}</span>}
            </div>
            <h1 id="dog-profile-heading" className="font-playful-display text-5xl font-extrabold tracking-[-0.065em] text-playful-orange-dark sm:text-6xl">{dog.name}</h1>
            {parsed?.personality && (
              <p className="mt-4 whitespace-pre-wrap break-words rounded-[1.5rem] bg-playful-peach/70 px-5 py-4 text-lg font-extrabold leading-8 text-playful-orange-dark">“{prose.personality}”</p>
            )}
          </div>

          {foster && (
            <p className="rounded-[1.6rem] border border-playful-orange/25 bg-white/90 px-5 py-4 text-base font-bold leading-7 text-playful-orange-dark shadow-pillowy" data-dog-profile-foster>
              🏡 {foster}
            </p>
          )}

          {parsed?.story && (
            <section className="rounded-[2rem] border border-playful-line bg-playful-peach/70 p-6 shadow-pillowy sm:p-8" aria-labelledby="dog-story-heading">
              <h2 id="dog-story-heading" className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{t.dogProfile.storyHeading}</h2>
              <p className="whitespace-pre-wrap break-words text-base font-medium leading-8 text-playful-muted">{prose.story}</p>
            </section>
          )}

          {note && (
            <section className="rounded-[2rem] border border-playful-line bg-white/88 p-6 shadow-pillowy sm:p-8" aria-labelledby="dog-note-heading" data-dog-profile-note>
              <h2 id="dog-note-heading" className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{locale === 'pt' ? 'A saber antes de adotar' : 'Good to know'}</h2>
              <p className="whitespace-pre-wrap break-words text-base font-medium leading-8 text-playful-muted">{prose.note}</p>
            </section>
          )}
        </div>
      </section>

      <div className="relative z-10 mt-10 grid min-w-0 gap-8 lg:grid-cols-[1fr_0.92fr]">
        {infoFields.length > 0 && (
          <section className="rounded-[2rem] border border-playful-line bg-white/88 p-6 shadow-pillowy sm:p-8" aria-labelledby="dog-about-heading">
            <h2 id="dog-about-heading" className="mb-5 font-playful-display text-2xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">{t.dogProfile.aboutHeading}</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {infoFields.map((f, i) => {
                const localized = localizeField(f.label, f.value, locale);
                if (f.display) localized.value = f.display;
                return (
                  <div key={i} className="rounded-[1.5rem] border border-playful-line bg-playful-canvas/80 p-4">
                    <dt className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-playful-muted/75">{localized.label}</dt>
                    <dd className="font-extrabold text-playful-orange-dark">{localized.value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {tags.length > 0 && (
          <section className="rounded-[2rem] border border-playful-line bg-white/88 p-6 shadow-pillowy sm:p-8" aria-labelledby="dog-compat-heading">
            <h2 id="dog-compat-heading" className="mb-5 font-playful-display text-2xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">{t.dogProfile.compatibilityHeading}</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tg, i) => <TagBadge key={i} text={tg.value} locale={locale} />)}
            </div>
          </section>
        )}
      </div>

      {dog.is_adopted ? (
        <section className="relative z-10 mt-10 rounded-[2.2rem] border border-playful-line bg-white/88 p-7 shadow-pillowy-lg sm:p-9" aria-labelledby="dog-adopted-heading">
          <h2 id="dog-adopted-heading" className="font-playful-display text-3xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">{t.dogProfile.adoptedTitle}</h2>
          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-playful-muted">{adoptedDesc(dog.sex, locale)}</p>
        </section>
      ) : (
        <section className="relative z-10 mt-10 rounded-[2.2rem] border border-playful-orange/15 bg-playful-orange-dark p-7 text-white shadow-pillowy-lg sm:p-9" aria-labelledby="dog-adopt-heading">
          <h2 id="dog-adopt-heading" className="font-playful-display text-3xl font-extrabold tracking-[-0.04em]">{adoptTitle(dog.name, dog.sex, locale)}</h2>
          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-white/82">{t.dogProfile.adoptDesc}</p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <AdoptionInterest dogName={dog.name} locale={locale} />
            <a href={adoptPath} className="squishy playful-focus inline-flex w-full items-center justify-center rounded-full bg-white px-7 py-4 text-center font-playful-display font-extrabold text-playful-orange-dark shadow-pillowy sm:w-auto">
              {t.dogProfile.adoptionProcess}
            </a>
          </div>
        </section>
      )}

      <div className="relative z-10 mt-9 border-t border-playful-line pt-7">
        <a href={dogsPath} className="playful-focus inline-flex items-center gap-2 rounded-full bg-white/80 px-5 py-3 font-extrabold text-playful-orange-dark shadow-sm hover:bg-playful-peach">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {t.dogProfile.viewAllDogs}
        </a>
      </div>
    </div>
  );
}
