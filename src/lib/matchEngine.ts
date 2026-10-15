/**
 * Adoption match engine for /match.
 * Ported from CAPA's "Encontra o Teu Patudo" prototype (October 2026).
 * Pure functions, no DOM: questions, scoring and the summary message.
 */
import type { Dog } from './capaApi';
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
const PESO_PORTE: Record<Porte, number> = { pequeno: -1, 'pequeno-medio': -0.5, medio: 0, 'medio-grande': 0.6, grande: 1 };

export const ageOf = (d: MatchDog, year: number) => (d.nasc ? year - d.nasc : null);
export const yearsWaiting = (d: MatchDog, year: number) => (d.desde ? year - d.desde : null);

export type MatchResult = { d: MatchDog; score: number; good: string[]; warn: string[] };

export function evaluate(d: MatchDog, r: Answers, year: number): MatchResult | null {
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
    if (d.energia === 1) { s += 9; good.push('Calmo, dá-se bem em apartamento'); }
    if (d.energia === 3) s -= 8;
    if (small) good.push('Porte contido, fácil num apartamento');
  }
  if (r.jardim !== 'nao' && d.energia === 3) { s += 9; good.push('Tem energia para aproveitar o quintal'); }
  if (d.fuga) {
    if (r.jardim === 'baixa') { s -= 18; warn.push('Já fugiu de casas antes: com grades baixas, foge outra vez'); }
    else if (r.jardim === 'alta') { s += 6; good.push('Precisa de espaço bem vedado, e o seu é'); }
  }

  // Walks and energy
  if (d.energia === 3) {
    if (walks === 1) { s -= 13; warn.push('Cão ativo: um passeio por dia não lhe chega'); }
    else if (walks === 3) { s += 14; good.push('Muito ativo, vai adorar os seus passeios'); }
    else s += 6;
  } else if (d.energia === 1) {
    if (walks === 1) { s += 11; good.push('Calmo: um passeio tranquilo por dia basta-lhe'); }
    else s += 4;
  } else s += 7;

  if (r.prefEnergia && r.prefEnergia !== 'indiferente') {
    const target = { calmo: 1, equilibrado: 2, ativo: 3 }[r.prefEnergia as 'calmo' | 'equilibrado' | 'ativo'];
    const diff = Math.abs(target - d.energia);
    if (diff === 0) { s += 17; good.push('A energia que pediu'); }
    else if (diff === 2) s -= 14;
  }

  // Hours alone
  if (hours >= 10) {
    if (d.carente) { s -= 22; warn.push('É muito carente: sofre com tantas horas sozinho'); }
    else if (d.receio >= 2) { s += 8; good.push('Independente, não exige companhia constante'); }
  } else if (hours === 0) {
    if (d.carente) { s += 16; good.push('Muito carente, vai aproveitar a sua companhia'); }
    else s += 4;
  } else if (hours <= 4 && d.carente) s += 8;
  else if (hours === 8 && d.carente) s -= 8;

  // Busy or quiet house
  if ((r.pessoas === '3-4' || r.pessoas === '5+') && d.receio >= 2) {
    s -= 8; warn.push('Casa movimentada pode ser demais nas primeiras semanas');
  }
  if (r.pessoas === '1' && d.carente) s += 6;

  // Children
  if (r.criancas !== 'nenhuma' && years !== null && years >= 12) {
    s -= 6; warn.push('Já é um cão idoso: precisa de calma e de crianças que saibam respeitá-lo');
  }
  if (r.criancas === 'pequenas') {
    if (d.receio >= 2) { s -= 20; warn.push('Precisa de tempo e calma para confiar: a equipa avalia se encaixa com crianças pequenas'); }
    else if (d.receio === 1) s -= 5;
    if (d.energia === 2) { s += 8; good.push('Nem agitado nem apático: bom ritmo para uma casa com crianças'); }
    else if (d.energia === 1) { s += 5; good.push('Cão calmo junto de crianças'); }
    if (big) s -= 6;
    if (d.energia === 3 && big) s -= 7;
  } else if (r.criancas === 'grandes') {
    if (d.receio >= 2) s -= 8;
    if (d.energia === 3) { s += 6; good.push('Brincalhão, bom companheiro para jovens'); }
  } else if (d.receio >= 2) s += 6;

  // Experience
  if (r.exp === 'nenhuma') {
    if (d.receio === 0) { s += 15; good.push('Confiante com pessoas desde o início'); }
    else if (d.receio >= 2) { s -= 20; warn.push('Primeiro cão: este precisa de alguém com rodagem'); }
  } else if (r.exp === 'alguma') {
    if (d.receio === 0) s += 7; else if (d.receio === 1) s += 9; else s -= 4;
  } else {
    if (d.receio === 1) { s += 9; good.push('Receoso no início: a sua experiência conta aqui'); }
    if (d.receio >= 2) { s += 18; good.push('Precisa de uma casa experiente, e é o seu caso'); }
  }

  // Other animals
  if (hasCat) {
    if (d.gatos === 'sim') { s += 18; good.push('Já se sabe que se dá bem com gatos'); }
    else { s -= 6; warn.push('Não sabemos se aceita gatos: a equipa pode testar'); }
  }
  if (hasMale && d.machos === 'sim') { s += 8; good.push('Sociável com outros machos'); }
  if (hasFemale && d.femeas === 'sim') { s += 8; good.push('Sociável com outras fêmeas'); }
  if (hasFarm) {
    if (d.aves === 'sim') { s += 16; good.push('Já se sabe que respeita aves de quintal e gado'); }
    else { s -= 14; warn.push('Não sabemos se respeita aves e gado: tem de ser testado com a equipa antes de ir para casa'); }
  }

  // Requested affection
  if (r.prefCarencia === 'mimado') {
    if (d.carente) { s += 15; good.push('Pede colo, como queria'); } else s -= 7;
  } else if (r.prefCarencia === 'independente') {
    if (d.carente) s -= 13;
    else if (d.receio >= 2) { s += 14; good.push('Gosta da sua independência'); }
    else s += 5;
  }

  // Sex, size, age
  if (r.prefSexo && r.prefSexo !== 'indiferente') {
    const sx = d.sexo === 'F' ? 'femea' : 'macho';
    if (sx === r.prefSexo) { s += 12; good.push(d.sexo === 'F' ? 'É fêmea, como preferia' : 'É macho, como preferia'); }
    else s -= 12;
  }
  if (r.porte && r.porte !== 'indiferente') good.push(`Porte ${PORTE_TXT[d.porte].toLowerCase()}, como procura`);
  if (years !== null && r.idade && r.idade !== 'indiferente') {
    const band = years <= 3 ? 'jovem' : years <= 8 ? 'adulto' : 'senior';
    if (band === r.idade) { s += 18; good.push(`${years} anos, a faixa que procura`); }
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
export const levelFor = (score: number) => LEVELS.find((l) => score >= l[0])!;

export function rankDogs(dogs: MatchDog[], r: Answers, year: number) {
  const all = dogs.map((d) => evaluate(d, r, year)).filter((x): x is MatchResult => x !== null).sort((a, b) => b.score - a.score);
  const top = all.filter((x) => x.score >= 55).slice(0, 4);
  return { all, shown: top.length ? top : all.slice(0, 3) };
}

export function conflicts(r: Answers): string[] {
  const out: string[] = [];
  if (r.prefEnergia === 'ativo' && r.passeios === '1') {
    out.push('Pediu um cão energético mas só consegue um passeio por dia. Mostramos os mais equilibrados: um cão ativo com um só passeio fica frustrado e é aí que começam os estragos em casa.');
  }
  if (r.prefCarencia === 'mimado' && r.trabalho === 'fora-mais8') {
    out.push('Pediu um cão mimado mas está fora mais de 8 horas. Deixámos de fora os mais carentes, que sofrem muito sozinhos.');
  }
  if (r.jardim === 'baixa') {
    out.push('Com grades baixas, confirme a altura com a equipa antes de decidir: muitos destes cães saltam mais do que parece.');
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
  return `Olá, equipa da CAPA.

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
