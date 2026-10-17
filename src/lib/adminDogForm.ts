/**
 * Admin form <-> dog record conversion.
 * The dog description is a line-based Portuguese text that the profile page and /match parse,
 * so parse() must read every existing record and build() must write the same formats back.
 */
import type { Dog } from './capaApi';
import { DOG_SIZES, yearFrom, type DogSize, type DogTraits } from './dogFacts';

export type Social = 'yes' | 'no' | 'unknown';
export const SOCIAL_KEYS = ['humanos', 'machos', 'fêmeas', 'gatos'] as const;
export type SocialKey = typeof SOCIAL_KEYS[number];

export type DogForm = {
  name: string;
  sex: 'male' | 'female' | '';
  size: DogSize;
  birthYear: string;
  entryYear: string;
  breed: string;
  personality: string;
  story: string;
  foster: string;
  note: string;
  social: Record<SocialKey, Social>;
  chipped: boolean;
  vaccinated: boolean;
  sterilized: boolean;
  /** Keeps "Castrado" where the records use it instead of "Esterilizado". */
  sterilizedWord: 'Esterilizad' | 'Castrad';
  isAdopted: boolean;
  energia: 1 | 2 | 3 | null;
  receio: 0 | 1 | 2 | 3 | null;
  carente: boolean;
  padrinho: boolean;
  fuga: boolean;
  aves: 'sim' | 'nao' | '';
  /** Lines the form does not understand; written back unchanged so nothing is lost. */
  extraLines: string[];
  /** Trait keys the form does not edit (kept as they are). */
  otherTraits: Record<string, unknown>;
};

export const SIZE_LABELS: Record<DogSize, string> = {
  small: 'Pequeno',
  'small-medium': 'Pequeno/Médio',
  medium: 'Médio',
  'medium-large': 'Médio/Grande',
  large: 'Grande',
};

export function emptyForm(): DogForm {
  return {
    name: '',
    sex: '',
    size: 'medium',
    birthYear: '',
    entryYear: String(new Date().getFullYear()),
    breed: '',
    personality: '',
    story: '',
    foster: '',
    note: '',
    social: { humanos: 'unknown', machos: 'unknown', 'fêmeas': 'unknown', gatos: 'unknown' },
    chipped: false,
    vaccinated: false,
    sterilized: false,
    sterilizedWord: 'Esterilizad',
    isAdopted: false,
    energia: null,
    receio: null,
    carente: false,
    padrinho: false,
    fuga: false,
    aves: '',
    extraLines: [],
    otherTraits: {},
  };
}

const KEYED = /^([^:]{2,30}):\s*(.*)$/;
const SOCIAL_LINE = /^(Não sociável|Sociável|Não sabemos se é sociável) com (humanos|machos|fêmeas|gatos)$/;
const MEDICAL_LINE = /^(Chipad|Vacinad|Esterilizad|Castrad)/;
const KNOWN_KEYS = new Set(['sexo', 'idade', 'data de entrada', 'deu entrada', 'raça', 'porte', 'personalidade', 'acolhimento', 'nota', 'história']);

export function parseDog(dog: Dog): DogForm {
  const form = emptyForm();
  form.name = dog.name;
  form.sex = dog.sex ?? '';
  form.size = (DOG_SIZES as readonly string[]).includes(dog.size) ? dog.size : 'medium';
  form.isAdopted = dog.is_adopted;
  form.entryYear = '';

  const lines = (dog.description ?? '').replace(/\\n/g, '\n').split('\n');
  let inStory = false;
  const story: string[] = [];
  let idadeLine = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (inStory) { story.push(raw); continue; }
    if (!line) continue;
    const social = line.match(SOCIAL_LINE);
    if (social) {
      const value: Social = social[1] === 'Sociável' ? 'yes' : social[1] === 'Não sociável' ? 'no' : 'unknown';
      form.social[social[2] as SocialKey] = value;
      continue;
    }
    if (MEDICAL_LINE.test(line)) {
      form.chipped = /Chipad/.test(line);
      form.vaccinated = /Vacinad/.test(line);
      form.sterilized = /Esterilizad|Castrad/.test(line);
      if (/Castrad/.test(line)) form.sterilizedWord = 'Castrad';
      continue;
    }
    const kv = line.match(KEYED);
    const key = kv?.[1].trim().toLowerCase();
    if (kv && key && KNOWN_KEYS.has(key)) {
      const value = kv[2].trim();
      if (key === 'idade') idadeLine = value;
      else if (key === 'data de entrada' || key === 'deu entrada') form.entryYear = String(yearFrom(value) ?? value);
      else if (key === 'raça') form.breed = value;
      else if (key === 'personalidade') form.personality = value;
      else if (key === 'acolhimento') form.foster = value;
      else if (key === 'nota') form.note = value;
      else if (key === 'história') { inStory = true; story.push(value); }
      // sexo / porte come from their own columns
      continue;
    }
    form.extraLines.push(line);
  }

  form.story = story.join('\n').trim();
  const birth = yearFrom(dog.age) ?? yearFrom(idadeLine);
  form.birthYear = birth ? String(birth) : '';

  const { energia, receio, carente, padrinho, fuga, aves, ...rest } = (dog.traits ?? {}) as DogTraits & Record<string, unknown>;
  form.energia = energia ?? null;
  form.receio = receio ?? null;
  form.carente = Boolean(carente);
  form.padrinho = Boolean(padrinho);
  form.fuga = Boolean(fuga);
  form.aves = aves ?? '';
  form.otherTraits = rest;
  return form;
}

export function socialLine(key: SocialKey, value: Social): string {
  if (value === 'yes') return `Sociável com ${key}`;
  if (value === 'no') return `Não sociável com ${key}`;
  return `Não sabemos se é sociável com ${key}`;
}

export function medicalLine(form: Pick<DogForm, 'sex' | 'chipped' | 'vaccinated' | 'sterilized' | 'sterilizedWord'>): string {
  const end = form.sex === 'female' ? 'a' : 'o';
  const parts: string[] = [];
  if (form.chipped) parts.push(`Chipad${end}`);
  if (form.vaccinated) parts.push(`Vacinad${end}`);
  if (form.sterilized) parts.push(`${form.sterilizedWord}${end}`);
  return parts.join(', ');
}

export function buildDescription(form: DogForm): string {
  const lines: string[] = [];
  if (form.sex) lines.push(`Sexo: ${form.sex === 'female' ? 'Feminino' : 'Masculino'}`);
  if (form.birthYear.trim()) lines.push(`Idade: Nasceu em ${form.birthYear.trim()}`);
  if (form.entryYear.trim()) lines.push(`Data de entrada: ${form.entryYear.trim()}`);
  if (form.breed.trim()) lines.push(`Raça: ${form.breed.trim()}`);
  lines.push(`Porte: ${SIZE_LABELS[form.size]}`);
  if (form.personality.trim()) lines.push(`Personalidade: ${form.personality.trim()}`);
  for (const key of SOCIAL_KEYS) lines.push(socialLine(key, form.social[key]));
  const medical = medicalLine(form);
  if (medical) lines.push(medical);
  if (form.foster.trim()) lines.push(`Acolhimento: ${form.foster.trim()}`);
  if (form.note.trim()) lines.push(`Nota: ${form.note.trim()}`);
  lines.push(...form.extraLines);
  if (form.story.trim()) lines.push(`História: ${form.story.trim()}`);
  return lines.join('\n');
}

export function buildTraits(form: DogForm): DogTraits & Record<string, unknown> {
  const traits: DogTraits & Record<string, unknown> = { ...form.otherTraits };
  if (form.energia != null) traits.energia = form.energia;
  if (form.receio != null) traits.receio = form.receio;
  traits.carente = form.carente;
  if (form.padrinho) traits.padrinho = true;
  if (form.fuga) traits.fuga = true;
  if (form.aves) traits.aves = form.aves;
  return traits;
}

export function buildPayload(form: DogForm) {
  return {
    name: form.name.trim(),
    sex: form.sex || null,
    size: form.size,
    age: form.birthYear.trim() ? `Nasceu em ${form.birthYear.trim()}` : '',
    description: buildDescription(form),
    is_adopted: form.isAdopted,
    traits: buildTraits(form),
  };
}

/** Why a dog will not show in /match, or null when it will. */
export function matchGap(dog: Dog): string | null {
  if (dog.is_adopted) return null;
  if (!dog.sex) return 'falta o sexo';
  if (dog.traits?.energia == null || dog.traits?.receio == null) return 'falta energia/receio';
  return null;
}

/** Accent- and case-insensitive text for search. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
