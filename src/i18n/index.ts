import { demoDogText } from './demoDogText';
import pt from './pt';
import en from './en';

export type Locale = 'pt' | 'en';
export type Translations = typeof pt;

const translations: Record<Locale, Translations> = { pt, en };

/** Get full translation object for a locale */
export function getTranslations(locale: Locale): Translations {
  return translations[locale] ?? translations.pt;
}

/** Shorthand: get a nested translation value */
export function t(locale: Locale, section: keyof Translations): Translations[keyof Translations] {
  return getTranslations(locale)[section];
}

/** Extract locale from URL path. Default: 'pt' */
export function getLocaleFromUrl(url: URL): Locale {
  const firstSegment = url.pathname.split('/').filter(Boolean)[0];
  if (firstSegment === 'en') return 'en';
  return 'pt';
}

/** Route mappings: PT path ↔ EN path */
export const routeMap: Record<string, string> = {
  '/': '/en/',
  '/caes': '/en/dogs',
  '/cao': '/en/dog',
  '/adocao': '/en/adopt',
  '/ajudar': '/en/help',
  '/ajudar/formulario-voluntariado': '/en/help/volunteer-form',
  '/ajudar/formulario-donativos-em-especie': '/en/help/supply-donation-form',
  '/ajudar/formulario-familia-acolhimento': '/en/help/foster-home-form',
  '/sobre-nos': '/en/about',
  '/admin': '/en/admin',
  '/match': '/en/match',
};

const reverseRouteMap: Record<string, string> = Object.fromEntries(
  Object.entries(routeMap).map(([pt, en]) => [en, pt])
);

/** Get the equivalent page path in the other locale */
export function getAlternatePath(currentPath: string, targetLocale: Locale): string {
  const hashIndex = currentPath.indexOf('#');
  const pathAndQuery = hashIndex === -1 ? currentPath : currentPath.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : currentPath.slice(hashIndex);
  const queryIndex = pathAndQuery.indexOf('?');
  const rawPath = queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : pathAndQuery.slice(queryIndex);
  const normalizedPath = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');

  const alternatePath = targetLocale === 'en'
    ? routeMap[normalizedPath] ?? '/en/'
    : reverseRouteMap[normalizedPath] ?? '/';

  return `${alternatePath}${query}${hash}`;
}

/** Available locales with display info */
export const locales = [
  { code: 'pt' as Locale, label: 'Português', flag: '🇵🇹' },
  { code: 'en' as Locale, label: 'English', flag: '🇬🇧' },
] as const;

/**
 * Translate a dog description from stored Portuguese to the target locale.
 * Descriptions are always stored in PT by AdminPanel. This function parses
 * the PT labels and re-renders them in the target locale.
 * If locale is 'pt', returns the original unchanged.
 */
export function localizeDescription(rawPt: string, locale: Locale): string {
  if (locale === 'pt' || !rawPt) return rawPt;

  const ptT = translations.pt.admin;
  const targetT = translations[locale].admin;

  // Build label map: PT label → target label
  const labelMap: Record<string, string> = {
    [ptT.descSex]: targetT.descSex,
    [ptT.descAge]: targetT.descAge,
    [ptT.descEntryDate]: targetT.descEntryDate,
    [ptT.descBreed]: targetT.descBreed,
    [ptT.descSize]: targetT.descSize,
    [ptT.descPersonality]: targetT.descPersonality,
    [ptT.descStory]: targetT.descStory,
  };

  // Build value map for sex and size
  const valueMap: Record<string, string> = {
    [ptT.descSexMale]: targetT.descSexMale,
    [ptT.descSexFemale]: targetT.descSexFemale,
    [translations.pt.sizes.small]: translations[locale].sizes.small,
    [translations.pt.sizes.medium]: translations[locale].sizes.medium,
    [translations.pt.sizes.large]: translations[locale].sizes.large,
  };

  // Build full-line map for sociability and medical tags
  const lineMap: Record<string, string> = {
    [ptT.descGoodWithPeople]: targetT.descGoodWithPeople,
    [ptT.descNotGoodWithPeople]: targetT.descNotGoodWithPeople,
    [ptT.descUnknownPeople]: targetT.descUnknownPeople,
    [ptT.descGoodWithMales]: targetT.descGoodWithMales,
    [ptT.descNotGoodWithMales]: targetT.descNotGoodWithMales,
    [ptT.descUnknownMales]: targetT.descUnknownMales,
    [ptT.descGoodWithFemales]: targetT.descGoodWithFemales,
    [ptT.descNotGoodWithFemales]: targetT.descNotGoodWithFemales,
    [ptT.descUnknownFemales]: targetT.descUnknownFemales,
    [ptT.descGoodWithCats]: targetT.descGoodWithCats,
    [ptT.descNotGoodWithCats]: targetT.descNotGoodWithCats,
    [ptT.descUnknownCats]: targetT.descUnknownCats,
  };

  // Medical terms (can appear combined: "Chipado, Vacinado, Esterilizado")
  const medicalMap: Record<string, string> = {
    [ptT.descChipped]: targetT.descChipped,
    [ptT.descVaccinated]: targetT.descVaccinated,
    [ptT.descSterilized]: targetT.descSterilized,
  };

  const lines = rawPt.split('\n').filter(Boolean);
  const translated: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check full-line matches (sociability tags)
    if (lineMap[trimmed]) {
      translated.push(lineMap[trimmed]);
      continue;
    }

    // Check medical combined line
    const medicalParts = trimmed.split(',').map(s => s.trim());
    if (medicalParts.every(p => medicalMap[p])) {
      translated.push(medicalParts.map(p => medicalMap[p]).join(', '));
      continue;
    }

    // Check key:value pairs
    const kv = trimmed.match(/^([^:]+):\s*(.+)$/);
    if (kv) {
      const [, label, value] = kv;
      const translatedLabel = labelMap[label.trim()] ?? label.trim();
      // Translate known values (sex, size)
      const translatedValue = valueMap[value.trim()] ?? value.trim();
      translated.push(`${translatedLabel}: ${translatedValue}`);
      continue;
    }

    // Fallback: keep as-is
    translated.push(trimmed);
  }

  return demoDogText(translated.join('\n'), locale);
}
