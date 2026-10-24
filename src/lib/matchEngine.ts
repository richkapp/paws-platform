/**
 * Adoption match engine for /match.
 * Scoring preserved from the original adoption questionnaire.
 * Pure functions, no DOM: questions, scoring and the summary message.
 */
import type { Dog } from './pawsApi';
import { fosterStatus, yearFrom } from './dogFacts';

export type Social = 'sim' | 'nao' | 'desconhecido';
export type Porte = 'pequeno' | 'pequeno-medio' | 'medio' | 'medio-grande' | 'grande';

export type MatchDog = {
  id: string;
  nome: string;
  sexo: 'M' | 'F';
  nasc: number | null;
  desde: number | null;
  raca: string;
  porte: Porte;
  personalidade: string;
  energia: 1 | 2 | 3;
  receio: 0 | 1 | 2 | 3;
  carente: boolean;
  humanos: Social;
  machos: Social;
  femeas: Social;
  gatos: Social;
  aves?: 'sim' | 'nao';
  fuga?: boolean;
  padrinho?: boolean;
  saude: string;
  nota: string;
  acolhimento: string | null;
  historia: string;
  foto: string;
};

const PORTE: Record<string, Porte> = {
  small: 'pequeno',
  'small-medium': 'pequeno-medio',
  medium: 'medio',
  'medium-large': 'medio-grande',
  large: 'grande',
};

function field(desc: string, label: string): string {
  return desc.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
}

function social(desc: string, who: string): Social {
  if (new RegExp(`^Não sociável com ${who}$`, 'm').test(desc)) return 'nao';
  if (new RegExp(`^Sociável com ${who}$`, 'm').test(desc)) return 'sim';
  return 'desconhecido';
}

/** Turns a site dog into a quiz record. Returns null if the dog cannot be matched yet. */
export function toMatchDog(dog: Dog): MatchDog | null {
  const t = dog.traits;
  if (dog.is_adopted || !t || t.energia == null || t.receio == null || !dog.sex) return null;
  const desc = (dog.description ?? '').replace(/\\n/g, '\n');
  return {
    id: dog.id,
    nome: dog.name,
    sexo: dog.sex === 'female' ? 'F' : 'M',
    nasc: yearFrom(dog.age) ?? yearFrom(field(desc, 'Idade')),
    desde: yearFrom(field(desc, 'Data de entrada') || field(desc, 'Deu entrada')),
    raca: field(desc, 'Raça'),
    porte: PORTE[dog.size] ?? 'medio',
    personalidade: field(desc, 'Personalidade'),
    energia: t.energia,
    receio: t.receio,
    carente: Boolean(t.carente),
    humanos: social(desc, 'humanos'),
    machos: social(desc, 'machos'),
    femeas: social(desc, 'fêmeas'),
    gatos: social(desc, 'gatos'),
    aves: t.aves,
    fuga: t.fuga,
    padrinho: t.padrinho,
    saude: desc.split('\n').find((line) => /^(Chipad|Vacinad)/.test(line.trim()))?.trim() ?? '',
    nota: field(desc, 'Nota'),
    acolhimento: fosterStatus(desc),
    historia: desc.match(/^História:\s*([\s\S]+)/m)?.[1]?.trim() ?? '',
    foto: dog.photo_url ?? '',
  };
}

/* ───────── Questions ───────── */

export type Option = { value: string; label: string; sub?: string };
export type Question = {
  id: keyof Answers;
  title: string;
  help?: string;
  inline?: boolean;
  multi?: boolean;
  text?: boolean;
  placeholder?: string;
  options?: Option[];
};
export type Step = { title: string; sub: string; questions: Question[] };

export type Answers = {
  casa?: string;
  jardim?: string;
  pessoas?: string;
  criancas?: string;
  trabalho?: string;
  passeios?: string;
  animais?: string[];
  descCao?: string;
  exp?: string;
  prefEnergia?: string;
  prefCarencia?: string;
  porte?: string;
  prefSexo?: string;
  idade?: string;
};

const o = (value: string, label: string, sub?: string): Option => ({ value, label, sub });

export const STEPS: Step[] = [
  {
    title: 'A sua casa',
    sub: 'Onde é que o cão vai viver, e com quem.',
    questions: [
      { id: 'casa', title: 'Que tipo de casa tem?', options: [o('apartamento', 'Apartamento'), o('vivenda', 'Vivenda ou casa térrea')] },
      {
        id: 'jardim',
        title: 'Tem jardim ou quintal?',
        help: 'A altura da vedação importa: alguns destes cães já fugiram de casas antes.',
        options: [o('nao', 'Não tenho'), o('baixa', 'Sim, com muro ou grades baixas', 'Até cerca de um metro'), o('alta', 'Sim, bem vedado', 'Muro ou grades altas')],
      },
      { id: 'pessoas', title: 'Quantas pessoas vivem em casa?', inline: true, options: [o('1', '1'), o('2', '2'), o('3-4', '3 ou 4'), o('5+', '5 ou mais')] },
      {
        id: 'criancas',
        title: 'Há crianças em casa?',
        help: 'Com crianças, o temperamento conta mais do que o porte.',
        options: [o('nenhuma', 'Não', 'Só adultos'), o('pequenas', 'Sim, até aos 10 anos'), o('grandes', 'Sim, com mais de 10 anos')],
      },
    ],
  },
  {
    title: 'O seu dia a dia',
    sub: 'Quanto tempo o cão fica sozinho, e quanto sai à rua.',
    questions: [
      {
        id: 'trabalho',
        title: 'Trabalha em casa ou fora?',
        help: 'Vários destes cães são muito dependentes de companhia humana.',
        options: [o('casa', 'Em casa', 'Quase sempre há alguém'), o('fora-ate4', 'Fora, até 4 horas por dia'), o('fora-4a8', 'Fora, entre 4 e 8 horas'), o('fora-mais8', 'Fora, mais de 8 horas')],
      },
      {
        id: 'passeios',
        title: 'Quantos passeios por dia consegue dar?',
        help: 'Seja realista: é esta resposta que decide a energia do cão certo.',
        inline: true,
        options: [o('1', '1 passeio'), o('2', '2 passeios'), o('3+', '3 ou mais')],
      },
    ],
  },
  {
    title: 'Quem já vive com vocês',
    sub: 'Os animais que já tem, e a sua experiência.',
    questions: [
      {
        id: 'animais',
        title: 'Já tem animais em casa?',
        help: 'Pode escolher mais do que uma opção.',
        multi: true,
        options: [o('nenhum', 'Nenhum'), o('macho', 'Cão macho'), o('femea', 'Cão fêmea'), o('gato', 'Gato'), o('quinta', 'Galinhas, patos ou gado', 'Animais de quintal ou de quinta')],
      },
      {
        id: 'descCao',
        title: 'Se já tem cão, como é ele?',
        text: true,
        help: 'Em duas linhas: idade, porte, se é territorial, se já viveu com outros cães. A equipa lê isto.',
        placeholder: 'Ex.: cadela de 5 anos, média, muito brincalhona, já viveu com outro cão.',
      },
      {
        id: 'exp',
        title: 'Que experiência tem com cães?',
        help: 'Vários destes cães vêm de maus tratos e precisam de mãos com paciência.',
        options: [o('nenhuma', 'É o meu primeiro cão', 'Quero um cão fácil de integrar'), o('alguma', 'Já tive cães', 'Sei o básico do dia a dia'), o('muita', 'Muita experiência', 'Já lidei com cães medrosos ou traumatizados')],
      },
    ],
  },
  {
    title: 'O que procura',
    sub: 'O cão que imagina em casa.',
    questions: [
      {
        id: 'prefEnergia',
        title: 'Prefere um cão calmo ou energético?',
        options: [o('calmo', 'Mais calmo', 'Companhia tranquila'), o('equilibrado', 'Pelo meio', 'Brinca, mas também descansa'), o('ativo', 'Mais energético', 'Para passear e brincar muito'), o('indiferente', 'Indiferente')],
      },
      {
        id: 'prefCarencia',
        title: 'Mais independente ou mais mimado?',
        options: [o('independente', 'Independente', 'Está bem sozinho, não exige colo'), o('mimado', 'Mimado', 'Quer estar sempre junto de nós'), o('indiferente', 'Indiferente')],
      },
      { id: 'porte', title: 'Que porte procura?', inline: true, options: [o('indiferente', 'Indiferente'), o('pequeno', 'Pequeno'), o('medio', 'Médio'), o('grande', 'Grande')] },
      { id: 'prefSexo', title: 'Prefere macho ou fêmea?', inline: true, options: [o('indiferente', 'Indiferente'), o('macho', 'Macho'), o('femea', 'Fêmea')] },
      {
        id: 'idade',
        title: 'E que idade?',
        help: 'Os mais velhos esperam há anos e são, muitas vezes, os mais calmos.',
        options: [o('indiferente', 'Indiferente'), o('jovem', 'Jovem', 'Até aos 3 anos'), o('adulto', 'Adulto', 'Entre os 4 e os 8 anos'), o('senior', 'Sénior', 'Mais de 8 anos, e com muito para dar')],
      },
    ],
  },
];


export const STEPS_EN: Step[] = [
  {
    title: 'Your home',
    sub: 'Where the dog will live, and with whom.',
    questions: [
      { id: 'casa', title: 'What kind of home do you have?', options: [o('apartamento', 'Apartment'), o('vivenda', 'House')] },
      {
        id: 'jardim',
        title: 'Do you have a garden or yard?',
        help: 'Fence height matters: some of these dogs have escaped from homes before.',
        options: [o('nao', 'No'), o('baixa', 'Yes, with a low wall or fence', 'Up to about one metre'), o('alta', 'Yes, well fenced', 'High wall or fence')],
      },
      { id: 'pessoas', title: 'How many people live at home?', inline: true, options: [o('1', '1'), o('2', '2'), o('3-4', '3 or 4'), o('5+', '5 or more')] },
      {
        id: 'criancas',
        title: 'Are there children at home?',
        help: 'With children, temperament matters more than size.',
        options: [o('nenhuma', 'No', 'Adults only'), o('pequenas', 'Yes, up to 10 years old'), o('grandes', 'Yes, older than 10')],
      },
    ],
  },
  {
    title: 'Your daily routine',
    sub: 'How long the dog is alone, and how often it goes out.',
    questions: [
      {
        id: 'trabalho',
        title: 'Do you work from home or away?',
        help: 'Several of these dogs depend a lot on human company.',
        options: [o('casa', 'From home', 'Someone is almost always there'), o('fora-ate4', 'Away, up to 4 hours a day'), o('fora-4a8', 'Away, 4 to 8 hours'), o('fora-mais8', 'Away, more than 8 hours')],
      },
      {
        id: 'passeios',
        title: 'How many walks a day can you manage?',
        help: 'Be realistic: this answer decides the right energy level.',
        inline: true,
        options: [o('1', '1 walk'), o('2', '2 walks'), o('3+', '3 or more')],
      },
    ],
  },
  {
    title: 'Who already lives with you',
    sub: 'The animals you already have, and your experience.',
    questions: [
      {
        id: 'animais',
        title: 'Do you already have animals at home?',
        help: 'You can choose more than one option.',
        multi: true,
        options: [o('nenhum', 'None'), o('macho', 'Male dog'), o('femea', 'Female dog'), o('gato', 'Cat'), o('quinta', 'Chickens, ducks or livestock', 'Yard or farm animals')],
      },
      {
        id: 'descCao',
        title: 'If you already have a dog, what is it like?',
        text: true,
        help: 'In two lines: age, size, whether it is territorial, whether it has lived with other dogs. The team reads this.',
        placeholder: 'E.g.: 5-year-old female, medium, very playful, has lived with another dog.',
      },
      {
        id: 'exp',
        title: 'How much experience do you have with dogs?',
        help: 'Several of these dogs come from abuse and need patient hands.',
        options: [o('nenhuma', 'This is my first dog', 'I want a dog that settles in easily'), o('alguma', 'I have had dogs', 'I know the day-to-day basics'), o('muita', 'A lot of experience', 'I have handled fearful or traumatised dogs')],
      },
    ],
  },
  {
    title: 'What you are looking for',
    sub: 'The dog you picture at home.',
    questions: [
      {
        id: 'prefEnergia',
        title: 'Do you prefer a calm or an energetic dog?',
        options: [o('calmo', 'Calmer', 'Quiet company'), o('equilibrado', 'In between', 'Plays, but also rests'), o('ativo', 'More energetic', 'For lots of walks and play'), o('indiferente', 'No preference')],
      },
      {
        id: 'prefCarencia',
        title: 'More independent or more affectionate?',
        options: [o('independente', 'Independent', 'Fine alone, does not demand cuddles'), o('mimado', 'Affectionate', 'Wants to be with us all the time'), o('indiferente', 'No preference')],
      },
      { id: 'porte', title: 'What size are you looking for?', inline: true, options: [o('indiferente', 'No preference'), o('pequeno', 'Small'), o('medio', 'Medium'), o('grande', 'Large')] },
      { id: 'prefSexo', title: 'Male or female?', inline: true, options: [o('indiferente', 'No preference'), o('macho', 'Male'), o('femea', 'Female')] },
      {
        id: 'idade',
        title: 'And what age?',
        help: 'The older dogs have waited for years and are often the calmest.',
        options: [o('indiferente', 'No preference'), o('jovem', 'Young', 'Up to 3 years'), o('adulto', 'Adult', 'Between 4 and 8 years'), o('senior', 'Senior', 'Over 8 years, with plenty to give')],
      },
    ],
  },
];

export type MatchLocale = 'pt' | 'en';
export const stepsFor = (locale: MatchLocale) => (locale === 'en' ? STEPS_EN : STEPS);

/* ───────── Scoring ───────── */

const GRUPO_PORTE: Record<string, Porte[]> = {
  pequeno: ['pequeno', 'pequeno-medio'],
  medio: ['pequeno-medio', 'medio', 'medio-grande'],
  grande: ['medio-grande', 'grande'],
};
export const PORTE_TXT: Record<Porte, string> = {
  pequeno: 'Pequeno',
  'pequeno-medio': 'Pequeno/médio',
  medio: 'Médio',
  'medio-grande': 'Médio/grande',
  grande: 'Grande',
};

export const PORTE_TXT_EN: Record<Porte, string> = {
  pequeno: 'Small',
  'pequeno-medio': 'Small/medium',
  medio: 'Medium',
  'medio-grande': 'Medium/large',
  grande: 'Large',
};

const REASONS = {
  pt: {
    aptCalm: 'Calmo, dá-se bem em apartamento',
    aptSmall: 'Porte contido, fácil num apartamento',
    yard: 'Tem energia para aproveitar o quintal',
    fugaLow: 'Já fugiu de casas antes: com grades baixas, foge outra vez',
    fugaHigh: 'Precisa de espaço bem vedado, e o seu é',
    active1: 'Cão ativo: um passeio por dia não lhe chega',
    active3: 'Muito ativo, vai adorar os seus passeios',
    calm1: 'Calmo: um passeio tranquilo por dia basta-lhe',
    energy: 'A energia que pediu',
    needyAlone: 'É muito carente: sofre com tantas horas sozinho',
    indepAlone: 'Independente, não exige companhia constante',
    needyHome: 'Muito carente, vai aproveitar a sua companhia',
    busy: 'Casa movimentada pode ser demais nas primeiras semanas',
    oldKids: 'Já é um cão idoso: precisa de calma e de crianças que saibam respeitá-lo',
    fearKids: 'Precisa de tempo e calma para confiar: a equipa avalia se encaixa com crianças pequenas',
    kidsPace: 'Nem agitado nem apático: bom ritmo para uma casa com crianças',
    kidsCalm: 'Cão calmo junto de crianças',
    teens: 'Brincalhão, bom companheiro para jovens',
    confident: 'Confiante com pessoas desde o início',
    firstFear: 'Primeiro cão: este precisa de alguém com rodagem',
    expShy: 'Receoso no início: a sua experiência conta aqui',
    expFear: 'Precisa de uma casa experiente, e é o seu caso',
    catsYes: 'Já se sabe que se dá bem com gatos',
    catsUnknown: 'Não sabemos se aceita gatos: a equipa pode testar',
    males: 'Sociável com outros machos',
    females: 'Sociável com outras fêmeas',
    farmYes: 'Já se sabe que respeita aves de quintal e gado',
    farmUnknown: 'Não sabemos se respeita aves e gado: tem de ser testado com a equipa antes de ir para casa',
    cuddly: 'Pede colo, como queria',
    indep: 'Gosta da sua independência',
    isF: 'É fêmea, como preferia',
    isM: 'É macho, como preferia',
    sizeAsked: (p: Porte) => `Porte ${PORTE_TXT[p].toLowerCase()}, como procura`,
    ageAsked: (y: number) => `${y} anos, a faixa que procura`,
  },
  en: {
    aptCalm: 'Calm, does well in an apartment',
    aptSmall: 'Compact size, easy in an apartment',
    yard: 'Has the energy to enjoy the yard',
    fugaLow: 'Has escaped from homes before: with a low fence, it will escape again',
    fugaHigh: 'Needs a well-fenced space, and yours is',
    active1: 'Active dog: one walk a day is not enough',
    active3: 'Very active, will love your walks',
    calm1: 'Calm: one quiet walk a day is enough',
    energy: 'The energy you asked for',
    needyAlone: 'Very needy: suffers with so many hours alone',
    indepAlone: 'Independent, does not need constant company',
    needyHome: 'Very affectionate, will enjoy your company',
    busy: 'A busy home may be too much in the first weeks',
    oldKids: 'An older dog: needs calm and children who know how to respect it',
    fearKids: 'Needs time and calm to trust: the team will judge whether it suits young children',
    kidsPace: 'Neither hyper nor sluggish: a good pace for a home with children',
    kidsCalm: 'A calm dog around children',
    teens: 'Playful, a good companion for older kids',
    confident: 'Confident with people from the start',
    firstFear: 'First dog: this one needs someone experienced',
    expShy: 'Shy at first: your experience counts here',
    expFear: 'Needs an experienced home, and yours is one',
    catsYes: 'Known to get on with cats',
    catsUnknown: "We don't know if it accepts cats: the team can test",
    males: 'Sociable with other males',
    females: 'Sociable with other females',
    farmYes: 'Known to respect poultry and livestock',
    farmUnknown: "We don't know if it respects poultry and livestock: it must be tested with the team before going home",
    cuddly: 'Loves cuddles, as you wanted',
    indep: 'Enjoys its independence',
    isF: 'Female, as you preferred',
    isM: 'Male, as you preferred',
    sizeAsked: (p: Porte) => `${PORTE_TXT_EN[p]} size, as you're looking for`,
    ageAsked: (y: number) => `${y} years old, the age range you want`,
  },
};

const PESO_PORTE: Record<Porte, number> = { pequeno: -1, 'pequeno-medio': -0.5, medio: 0, 'medio-grande': 0.6, grande: 1 };

export const ageOf = (d: MatchDog, year: number) => (d.nasc ? year - d.nasc : null);
export const yearsWaiting = (d: MatchDog, year: number) => (d.desde ? year - d.desde : null);

export type MatchResult = { d: MatchDog; score: number; good: string[]; warn: string[] };

export function evaluate(d: MatchDog, r: Answers, year: number, locale: MatchLocale = 'pt'): MatchResult | null {
  const T = REASONS[locale];
  const good: string[] = [];
  const warn: string[] = [];
  let s = 0;
  const an = r.animais ?? [];
  const hasCat = an.includes('gato');
  const hasMale = an.includes('macho');
  const hasFemale = an.includes('femea');
  const hasFarm = an.includes('quinta');
  const years = ageOf(d, year);
  const hours = r.trabalho === 'casa' ? 0 : r.trabalho === 'fora-ate4' ? 4 : r.trabalho === 'fora-4a8' ? 8 : 10;
  const walks = r.passeios === '1' ? 1 : r.passeios === '2' ? 2 : 3;
  const small = d.porte === 'pequeno' || d.porte === 'pequeno-medio';
  const big = d.porte === 'grande' || d.porte === 'medio-grande';

  // Exclusions
  if (d.humanos === 'nao') return null;
  if (hasCat && d.gatos === 'nao') return null;
  if (hasMale && d.machos === 'nao') return null;
  if (hasFemale && d.femeas === 'nao') return null;
  if (hasFarm && d.aves === 'nao') return null;
  if (r.porte && r.porte !== 'indiferente' && !GRUPO_PORTE[r.porte].includes(d.porte)) return null;

  // Space and fencing
  const space = r.casa === 'apartamento' ? -1 : r.jardim === 'nao' ? -0.4 : 0.6;
  s += space * PESO_PORTE[d.porte] * 14;
  if (r.casa === 'apartamento') {
    if (d.energia === 1) { s += 9; good.push(T.aptCalm); }
    if (d.energia === 3) s -= 8;
    if (small) good.push(T.aptSmall);
  }
  if (r.jardim !== 'nao' && d.energia === 3) { s += 9; good.push(T.yard); }
  if (d.fuga) {
    if (r.jardim === 'baixa') { s -= 18; warn.push(T.fugaLow); }
    else if (r.jardim === 'alta') { s += 6; good.push(T.fugaHigh); }
  }

  // Walks and energy
  if (d.energia === 3) {
    if (walks === 1) { s -= 13; warn.push(T.active1); }
    else if (walks === 3) { s += 14; good.push(T.active3); }
    else s += 6;
  } else if (d.energia === 1) {
    if (walks === 1) { s += 11; good.push(T.calm1); }
    else s += 4;
  } else s += 7;

  if (r.prefEnergia && r.prefEnergia !== 'indiferente') {
    const target = { calmo: 1, equilibrado: 2, ativo: 3 }[r.prefEnergia as 'calmo' | 'equilibrado' | 'ativo'];
    const diff = Math.abs(target - d.energia);
    if (diff === 0) { s += 17; good.push(T.energy); }
    else if (diff === 2) s -= 14;
  }

  // Hours alone
  if (hours >= 10) {
    if (d.carente) { s -= 22; warn.push(T.needyAlone); }
    else if (d.receio >= 2) { s += 8; good.push(T.indepAlone); }
  } else if (hours === 0) {
    if (d.carente) { s += 16; good.push(T.needyHome); }
    else s += 4;
  } else if (hours <= 4 && d.carente) s += 8;
  else if (hours === 8 && d.carente) s -= 8;

  // Busy or quiet house
  if ((r.pessoas === '3-4' || r.pessoas === '5+') && d.receio >= 2) {
    s -= 8; warn.push(T.busy);
  }
  if (r.pessoas === '1' && d.carente) s += 6;

  // Children
  if (r.criancas !== 'nenhuma' && years !== null && years >= 12) {
    s -= 6; warn.push(T.oldKids);
  }
  if (r.criancas === 'pequenas') {
    if (d.receio >= 2) { s -= 20; warn.push(T.fearKids); }
    else if (d.receio === 1) s -= 5;
    if (d.energia === 2) { s += 8; good.push(T.kidsPace); }
    else if (d.energia === 1) { s += 5; good.push(T.kidsCalm); }
    if (big) s -= 6;
    if (d.energia === 3 && big) s -= 7;
  } else if (r.criancas === 'grandes') {
    if (d.receio >= 2) s -= 8;
    if (d.energia === 3) { s += 6; good.push(T.teens); }
  } else if (d.receio >= 2) s += 6;

  // Experience
  if (r.exp === 'nenhuma') {
    if (d.receio === 0) { s += 15; good.push(T.confident); }
    else if (d.receio >= 2) { s -= 20; warn.push(T.firstFear); }
  } else if (r.exp === 'alguma') {
    if (d.receio === 0) s += 7; else if (d.receio === 1) s += 9; else s -= 4;
  } else {
    if (d.receio === 1) { s += 9; good.push(T.expShy); }
    if (d.receio >= 2) { s += 18; good.push(T.expFear); }
  }

  // Other animals
  if (hasCat) {
    if (d.gatos === 'sim') { s += 18; good.push(T.catsYes); }
    else { s -= 6; warn.push(T.catsUnknown); }
  }
  if (hasMale && d.machos === 'sim') { s += 8; good.push(T.males); }
  if (hasFemale && d.femeas === 'sim') { s += 8; good.push(T.females); }
  if (hasFarm) {
    if (d.aves === 'sim') { s += 16; good.push(T.farmYes); }
    else { s -= 14; warn.push(T.farmUnknown); }
  }

  // Requested affection
  if (r.prefCarencia === 'mimado') {
    if (d.carente) { s += 15; good.push(T.cuddly); } else s -= 7;
  } else if (r.prefCarencia === 'independente') {
    if (d.carente) s -= 13;
    else if (d.receio >= 2) { s += 14; good.push(T.indep); }
    else s += 5;
  }

  // Sex, size, age
  if (r.prefSexo && r.prefSexo !== 'indiferente') {
    const sx = d.sexo === 'F' ? 'femea' : 'macho';
    if (sx === r.prefSexo) { s += 12; good.push(d.sexo === 'F' ? T.isF : T.isM); }
    else s -= 12;
  }
  if (r.porte && r.porte !== 'indiferente') good.push(T.sizeAsked(d.porte));
  if (years !== null && r.idade && r.idade !== 'indiferente') {
    const band = years <= 3 ? 'jovem' : years <= 8 ? 'adulto' : 'senior';
    if (band === r.idade) { s += 18; good.push(T.ageAsked(years)); }
    else s -= 11;
  }

  if (d.desde && year - d.desde >= 8) s += 5;
  if (d.nota) warn.push(d.nota);

  const seen = new Set<string>();
  const uniq = (a: string[]) => a.filter((x) => !seen.has(x) && Boolean(seen.add(x)));
  return {
    d,
    score: Math.max(0, Math.min(100, Math.round(50 + s * 0.45))),
    good: uniq(good).slice(0, 5),
    warn: uniq(warn).slice(0, 3),
  };
}

export const LEVELS: [number, string, number][] = [
  [85, 'Muito compatível', 4],
  [70, 'Compatível', 3],
  [55, 'Pode funcionar', 2],
  [0, 'Menos provável', 1],
];
const LEVEL_EN: Record<string, string> = { 'Muito compatível': 'Very compatible', Compatível: 'Compatible', 'Pode funcionar': 'Could work', 'Menos provável': 'Less likely' };
export const levelFor = (score: number, locale: MatchLocale = 'pt'): [number, string, number] => {
  const l = LEVELS.find((x) => score >= x[0])!;
  return locale === 'en' ? [l[0], LEVEL_EN[l[1]], l[2]] : l;
};

export function rankDogs(dogs: MatchDog[], r: Answers, year: number, locale: MatchLocale = 'pt') {
  const all = dogs.map((d) => evaluate(d, r, year, locale)).filter((x): x is MatchResult => x !== null).sort((a, b) => b.score - a.score);
  const top = all.filter((x) => x.score >= 55).slice(0, 4);
  return { all, shown: top.length ? top : all.slice(0, 3) };
}

const CONFLICTS_EN = [
  'You asked for an energetic dog but can only manage one walk a day. We show the more balanced ones: an active dog with a single walk gets frustrated, and that is when the damage at home starts.',
  'You asked for an affectionate dog but are away more than 8 hours. We left out the neediest ones, who suffer a lot alone.',
  'With a low fence, check the height with the team before deciding: many of these dogs jump higher than you would think.',
];

export function conflicts(r: Answers, locale: MatchLocale = 'pt'): string[] {
  const out: string[] = [];
  const en = locale === 'en';
  if (r.prefEnergia === 'ativo' && r.passeios === '1') {
    out.push(en ? CONFLICTS_EN[0] : 'Pediu um cão energético mas só consegue um passeio por dia. Mostramos os mais equilibrados: um cão ativo com um só passeio fica frustrado e é aí que começam os estragos em casa.');
  }
  if (r.prefCarencia === 'mimado' && r.trabalho === 'fora-mais8') {
    out.push(en ? CONFLICTS_EN[1] : 'Pediu um cão mimado mas está fora mais de 8 horas. Deixámos de fora os mais carentes, que sofrem muito sozinhos.');
  }
  if (r.jardim === 'baixa') {
    out.push(en ? CONFLICTS_EN[2] : 'Com grades baixas, confirme a altura com a equipa antes de decidir: muitos destes cães saltam mais do que parece.');
  }
  return out;
}

/* ───────── Summary message ───────── */

const SUMMARY: Record<string, Record<string, string>> = {
  casa: { apartamento: 'Apartamento', vivenda: 'Vivenda ou casa térrea' },
  jardim: { nao: 'sem jardim', baixa: 'jardim com vedação baixa', alta: 'jardim bem vedado' },
  pessoas: { '1': '1 pessoa em casa', '2': '2 pessoas em casa', '3-4': '3 ou 4 pessoas em casa', '5+': '5 ou mais pessoas em casa' },
  criancas: { nenhuma: 'sem crianças', pequenas: 'crianças até aos 10 anos', grandes: 'crianças com mais de 10 anos' },
  trabalho: { casa: 'Trabalha em casa', 'fora-ate4': 'Fora até 4 h por dia', 'fora-4a8': 'Fora 4 a 8 h', 'fora-mais8': 'Fora mais de 8 h' },
  passeios: { '1': '1 passeio por dia', '2': '2 passeios por dia', '3+': '3 ou mais passeios por dia' },
  exp: { nenhuma: 'Primeiro cão', alguma: 'Já teve cães', muita: 'Muita experiência' },
  prefEnergia: { calmo: 'Procura um cão calmo', equilibrado: 'Procura um cão equilibrado', ativo: 'Procura um cão energético', indiferente: 'Energia indiferente' },
  prefCarencia: { independente: 'Prefere independente', mimado: 'Prefere mimado', indiferente: 'Indiferente quanto a mimo' },
  porte: { indiferente: 'Porte indiferente', pequeno: 'Porte pequeno', medio: 'Porte médio', grande: 'Porte grande' },
  prefSexo: { indiferente: 'Sexo indiferente', macho: 'Prefere macho', femea: 'Prefere fêmea' },
  idade: { indiferente: 'Idade indiferente', jovem: 'Prefere jovem', adulto: 'Prefere adulto', senior: 'Prefere sénior' },
  animais: { nenhum: 'nenhum', macho: 'cão macho', femea: 'cão fêmea', gato: 'gato', quinta: 'galinhas, patos ou gado' },
};

export type Contact = { nome: string; idade: string; tel: string; email: string; local: string; obs: string };

const pick = (k: string, v?: string) => (v ? SUMMARY[k][v] ?? '' : '');

export function buildMessage(dogRef: string, r: Answers, c: Contact): string {
  const fill = (v: string) => v.trim() || '(preencher)';
  const animals = (r.animais ?? []).map((a) => SUMMARY.animais[a]).filter(Boolean).join(', ');
  const current = (r.descCao ?? '').trim();
  const obs = c.obs.trim();
  return `Olá, equipa do abrigo.

Fiz o questionário no site e gostaria de saber mais sobre ${dogRef}.

Sobre mim
- Nome: ${fill(c.nome)}
- Idade: ${fill(c.idade)}
- Telefone: ${fill(c.tel)}
- Email: ${fill(c.email)}
- Localidade: ${fill(c.local)}

A minha casa
- ${pick('casa', r.casa)}, ${pick('jardim', r.jardim)}
- ${pick('pessoas', r.pessoas)}, ${pick('criancas', r.criancas)}

O meu dia a dia
- ${pick('trabalho', r.trabalho)}
- ${pick('passeios', r.passeios)}

Animais e experiência
- Animais que já tenho: ${animals || '(não indicado)'}
- ${pick('exp', r.exp)}${current ? `\n- O meu cão atual: ${current}` : ''}

O que procuro
- ${pick('prefEnergia', r.prefEnergia)}
- ${pick('prefCarencia', r.prefCarencia)}
- ${pick('porte', r.porte)}, ${pick('prefSexo', r.prefSexo).toLowerCase()}, ${pick('idade', r.idade).toLowerCase()}
${obs ? `\nNota\n${obs}\n` : ''}
Podem dizer-me qual é o próximo passo para conhecer ${dogRef}?

Obrigado.`;
}

const SUMMARY_EN: Record<string, Record<string, string>> = {
  casa: { apartamento: 'Apartment', vivenda: 'House' },
  jardim: { nao: 'no garden', baixa: 'garden with a low fence', alta: 'well-fenced garden' },
  pessoas: { '1': '1 person at home', '2': '2 people at home', '3-4': '3 or 4 people at home', '5+': '5 or more people at home' },
  criancas: { nenhuma: 'no children', pequenas: 'children up to 10', grandes: 'children over 10' },
  trabalho: { casa: 'Works from home', 'fora-ate4': 'Away up to 4 h a day', 'fora-4a8': 'Away 4 to 8 h', 'fora-mais8': 'Away more than 8 h' },
  passeios: { '1': '1 walk a day', '2': '2 walks a day', '3+': '3 or more walks a day' },
  exp: { nenhuma: 'First dog', alguma: 'Has had dogs', muita: 'A lot of experience' },
  prefEnergia: { calmo: 'Looking for a calm dog', equilibrado: 'Looking for a balanced dog', ativo: 'Looking for an energetic dog', indiferente: 'Energy: no preference' },
  prefCarencia: { independente: 'Prefers independent', mimado: 'Prefers affectionate', indiferente: 'Affection: no preference' },
  porte: { indiferente: 'Size: no preference', pequeno: 'Small size', medio: 'Medium size', grande: 'Large size' },
  prefSexo: { indiferente: 'Sex: no preference', macho: 'Prefers male', femea: 'Prefers female' },
  idade: { indiferente: 'Age: no preference', jovem: 'Prefers young', adulto: 'Prefers adult', senior: 'Prefers senior' },
  animais: { nenhum: 'none', macho: 'male dog', femea: 'female dog', gato: 'cat', quinta: 'chickens, ducks or livestock' },
};

export function buildMessageEn(name: string, r: Answers, c: Contact): string {
  const fill = (v: string) => v.trim() || '(to fill in)';
  const pickEn = (k: string, v?: string) => (v ? SUMMARY_EN[k][v] ?? '' : '');
  const animals = (r.animais ?? []).map((a) => SUMMARY_EN.animais[a]).filter(Boolean).join(', ');
  const current = (r.descCao ?? '').trim();
  const obs = c.obs.trim();
  return `Hello shelter team,

I took the quiz on the website and would like to know more about ${name}.

About me
- Name: ${fill(c.nome)}
- Age: ${fill(c.idade)}
- Phone: ${fill(c.tel)}
- Email: ${fill(c.email)}
- Location: ${fill(c.local)}

My home
- ${pickEn('casa', r.casa)}, ${pickEn('jardim', r.jardim)}
- ${pickEn('pessoas', r.pessoas)}, ${pickEn('criancas', r.criancas)}

My routine
- ${pickEn('trabalho', r.trabalho)}
- ${pickEn('passeios', r.passeios)}

Animals and experience
- Animals I already have: ${animals || '(not given)'}
- ${pickEn('exp', r.exp)}${current ? `\n- My current dog: ${current}` : ''}

What I'm looking for
- ${pickEn('prefEnergia', r.prefEnergia)}
- ${pickEn('prefCarencia', r.prefCarencia)}
- ${pickEn('porte', r.porte)}, ${pickEn('prefSexo', r.prefSexo).toLowerCase()}, ${pickEn('idade', r.idade).toLowerCase()}
${obs ? `\nNote\n${obs}\n` : ''}
Could you tell me the next step to meet ${name}?

Thank you.`;
}
