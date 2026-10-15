import type { Locale } from '../i18n';

export const DOG_SIZES = ['small', 'small-medium', 'medium', 'medium-large', 'large'] as const;
export type DogSize = typeof DOG_SIZES[number];

/** Size labels follow CAPA's records, which use five sizes. */
export const SIZE_LABELS: Record<Locale, Record<DogSize, string>> = {
  pt: { small: 'Pequeno', 'small-medium': 'Pequeno/Médio', medium: 'Médio', 'medium-large': 'Médio/Grande', large: 'Grande' },
  en: { small: 'Small', 'small-medium': 'Small/Medium', medium: 'Medium', 'medium-large': 'Medium/Large', large: 'Large' },
};

export function sizeLabel(size: string, locale: Locale): string {
  return SIZE_LABELS[locale][size as DogSize] ?? size;
}

export type DogTraits = {
  energia?: 1 | 2 | 3;
  receio?: 0 | 1 | 2 | 3;
  carente?: boolean;
  aves?: 'sim' | 'nao';
  criancas?: 'sim' | 'nao';
  fuga?: boolean;
  padrinho?: boolean;
};

type Sex = 'male' | 'female' | null | undefined;

/** "o Bailey" / "a Bailey"; returns the bare name when sex is unknown. */
export function withArticle(name: string, sex: Sex): string {
  if (sex === 'female') return `a ${name}`;
  if (sex === 'male') return `o ${name}`;
  return name;
}

export function adoptedLabel(sex: Sex, locale: Locale): string {
  if (locale === 'en') return 'Adopted!';
  return sex === 'female' ? 'Adotada!' : 'Adotado!';
}

export function adoptTitle(name: string, sex: Sex, locale: Locale): string {
  if (locale === 'en') return `Want to adopt ${name}?`;
  return `Queres adotar ${withArticle(name, sex)}?`;
}

export function adoptedDesc(sex: Sex, locale: Locale): string {
  if (locale === 'en') return 'This dog has already been adopted. Thank you for helping our dogs get seen.';
  return sex === 'female'
    ? 'Esta cadela já foi adotada. Obrigado por ajudares a dar visibilidade aos nossos patudos.'
    : 'Este cão já foi adotado. Obrigado por ajudares a dar visibilidade aos nossos patudos.';
}

const YEAR = /(19|20)\d{2}/;

export function yearFrom(value: string | undefined | null): number | null {
  const match = value?.match(YEAR);
  return match ? Number(match[0]) : null;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "cerca de 12 anos (nasceu em 2014)" */
export function formatAge(birthYear: number | null, locale: Locale, now = new Date()): string | null {
  if (!birthYear) return null;
  const years = now.getFullYear() - birthYear;
  if (locale === 'en') {
    if (years < 1) return `under a year old (born in ${birthYear})`;
    return `about ${plural(years, 'year', 'years')} old (born in ${birthYear})`;
  }
  if (years < 1) return `menos de um ano (nasceu em ${birthYear})`;
  return `cerca de ${plural(years, 'ano', 'anos')} (nasceu em ${birthYear})`;
}

/** "2016, há 10 anos" */
export function formatShelterSince(entryYear: number | null, locale: Locale, now = new Date()): string | null {
  if (!entryYear) return null;
  const years = now.getFullYear() - entryYear;
  if (locale === 'en') {
    if (years < 1) return `${entryYear}, this year`;
    return `${entryYear}, ${plural(years, 'year', 'years')} ago`;
  }
  if (years < 1) return `${entryYear}, este ano`;
  return `${entryYear}, há ${plural(years, 'ano', 'anos')}`;
}

/** Short age for cards: "12 anos". */
export function shortAge(birthYear: number | null, locale: Locale, now = new Date()): string | null {
  if (!birthYear) return null;
  const years = now.getFullYear() - birthYear;
  if (years < 1) return locale === 'en' ? '< 1 year' : '< 1 ano';
  return locale === 'en' ? plural(years, 'year', 'years') : plural(years, 'ano', 'anos');
}

/** Foster status is stored in the description as "Acolhimento: ...". */
export function fosterStatus(description: string | undefined | null): string | null {
  const match = description?.replace(/\\n/g, '\n').match(/^Acolhimento:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

export function fosterLabel(status: string, sex: Sex, locale: Locale): string {
  const hotel = /hotel/i.test(status);
  if (locale === 'en') return hotel ? 'In a foster hotel' : 'In a foster home';
  return hotel ? 'Em hotel de acolhimento' : 'Em família de acolhimento';
}

export function fosterNote(status: string, name: string, sex: Sex, locale: Locale): string {
  const hotel = /hotel/i.test(status);
  if (locale === 'en') {
    return `${name} is ${hotel ? 'staying at a foster hotel' : 'living with a temporary foster family'}, not at the shelter, and is still waiting for a forever home. Visits are arranged with the team.`;
  }
  const subject = sex === 'female' ? 'A' : sex === 'male' ? 'O' : '';
  const who = subject ? `${subject} ${name}` : name;
  const where = hotel ? 'num hotel de acolhimento' : 'numa família de acolhimento temporário';
  return `${who} está ${where}, não nas boxes do abrigo, e continua à espera de uma família definitiva. A visita combina-se com a equipa.`;
}
