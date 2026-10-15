import type { Locale } from '../../i18n';
import { capaDogs } from '../../data/capaDogs';

export const dogProfileCount = capaDogs.length;
const adoptedCount = capaDogs.filter((dog) => dog.is_adopted).length;

export type CaesHeroContent = {
  eyebrow: string;
  heading: string;
  leadLineOne: string;
  leadLineTwo: string;
  primaryCta: string;
  secondaryCta: string;
  imageAlt: string;
  imageCaption: string;
  chips: string[];
};

export const caesHeroContent: Record<Locale, CaesHeroContent> = {
  pt: {
    eyebrow: 'Prontos para adoção',
    heading: 'Os Nossos Cães',
    leadLineOne: 'Cada um deles tem uma história, uma personalidade única e muito amor para dar.',
    leadLineTwo: 'Poderá o próximo lar ser o teu?',
    primaryCta: 'Ver cães',
    secondaryCta: 'Filtrar por nome',
    imageAlt: 'Colagem de cães do CAPA Póvoa de Lanhoso disponíveis para adoção',
    imageCaption: 'Percorra os perfis, conheça a personalidade de cada patudo e fale connosco quando encontrar uma ligação.',
    chips: [`${dogProfileCount} perfis`, `${adoptedCount} adotados visíveis`, 'Tamanho e sexo', 'Pesquisa por nome'],
  },
  en: {
    eyebrow: 'Ready for adoption',
    heading: 'Our Dogs',
    leadLineOne: 'Every one of them has a story, a unique personality, and so much love to give.',
    leadLineTwo: 'Could the next home be yours?',
    primaryCta: 'View dogs',
    secondaryCta: 'Filter by name',
    imageAlt: 'Collage of CAPA Póvoa de Lanhoso dogs available for adoption',
    imageCaption: 'Browse the profiles, get to know each dog’s personality, and contact us when one of them feels right.',
    chips: [`${dogProfileCount} profiles`, `${adoptedCount} adopted visible`, 'Size and sex', 'Search by name'],
  },
};
