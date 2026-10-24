import { localizeDescription, type Locale } from '../../i18n';

export const DOG_CARD_ROTATIONS = ['md:-rotate-1', 'md:rotate-1', 'md:rotate-2', 'md:-rotate-2', 'md:translate-y-3'] as const;

export const SIZE_BADGE_CLASSES: Record<string, string> = {
  small: 'bg-playful-peach text-playful-orange-dark border border-playful-line',
  'small-medium': 'bg-playful-peach text-playful-orange-dark border border-playful-line',
  'medium-large': 'bg-playful-orange-dark text-white border border-playful-orange-dark/20',
  medium: 'bg-playful-orange text-white border border-playful-orange-dark/20',
  large: 'bg-playful-watermelon-dark text-white border border-playful-watermelon-dark/20',
};

export const SEX_BADGE_CLASSES: Record<string, string> = {
  female: 'bg-white text-playful-watermelon-dark border border-playful-watermelon/40',
  male: 'bg-playful-cream text-playful-orange-dark border border-playful-line',
};

export function getCardDescription(description: string, locale: Locale): string {
  const normalized = description.replace(/\\n/g, '\n');
  const personality = normalized.match(/^Personalidade:\s*(.+)$/m)?.[1]?.trim();
  const story = normalized.match(/^História:\s*([\s\S]+)/m)?.[1]?.trim();
  const summary = [personality, story].filter(Boolean).join('. ');

  return localizeDescription(summary || normalized, locale);
}
