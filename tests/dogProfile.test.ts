import { describe, expect, spyOn, test } from 'bun:test';
import type { Dog } from '../src/lib/pawsApi';
import { demoDogs } from '../src/data/demoDogs';
import { parseDescription } from '../src/lib/dogDescription';
import { buildDescription, emptyForm } from '../src/lib/adminDogForm';

// Bun loads the React module; the separate server TS project does not compile JSX.
const { loadProfileDog, profileDescription }: {
  loadProfileDog: (id: string, apiBaseUrl?: string) => Promise<Dog | null>;
  profileDescription: (dog: Dog, locale: 'pt' | 'en') => ReturnType<typeof parseDescription>;
} = await import(new URL('../src/components/DogProfile.tsx', import.meta.url).href);

describe('configured public profile data', () => {
  test('backend-free demo reads do not fetch, and an unknown ID stays missing', async () => {
    const fetch = spyOn(globalThis, 'fetch');
    try {
      expect(await loadProfileDog('demo-miso', '')).toEqual(demoDogs[0]);
      expect(await loadProfileDog('unknown', '')).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });

  test.each([404, 200])('authoritative missing dog (%s) does not restore a seeded dog', async status => {
    const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(
      status === 404 ? { error: 'Dog not found' } : { dog: null },
    ), { status }));
    try {
      expect(await loadProfileDog('demo-miso', 'http://127.0.0.1:54321')).toBeNull();
    } finally {
      fetch.mockRestore();
    }
  });

  test.each([503, 500])('unavailable backend (%s) retains the fictional fallback', async status => {
    const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status }));
    try {
      expect(await loadProfileDog('demo-miso', 'http://127.0.0.1:54321')).toEqual(demoDogs[0]);
      expect(await loadProfileDog('unknown', 'http://127.0.0.1:54321')).toBeNull();
    } finally {
      fetch.mockRestore();
    }
  });

  test('network failure retains the fallback, but never invents an unknown dog', async () => {
    const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network unavailable'));
    try {
      expect(await loadProfileDog('demo-miso', 'http://127.0.0.1:54321')).toEqual(demoDogs[0]);
      expect(await loadProfileDog('unknown', 'http://127.0.0.1:54321')).toBeNull();
    } finally {
      fetch.mockRestore();
    }
  });

  test('populated API photos and a single photo_url remain authoritative', async () => {
    const remote = { ...demoDogs[0], photos: ['/local-first.jpg', '/local-second.jpg'], photo_url: '/local-first.jpg' };
    const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ dog: remote })));
    try {
      expect((await loadProfileDog('demo-miso', 'http://127.0.0.1:54321'))?.photos).toEqual(['/local-first.jpg', '/local-second.jpg']);
      fetch.mockResolvedValue(new Response(JSON.stringify({ dog: { ...remote, photos: [], photo_url: '/single.jpg' } })));
      expect((await loadProfileDog('demo-miso', 'http://127.0.0.1:54321'))?.photo_url).toBe('/single.jpg');
    } finally {
      fetch.mockRestore();
    }
  });
  test('an authoritative empty gallery replaces the seeded demo record', async () => {
    const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      dog: { ...demoDogs[0], name: 'Miso editado', photos: [], photo_url: '' },
    })));
    try {
      const dog = await loadProfileDog('demo-miso', 'http://127.0.0.1:54321');
      expect(dog?.name).toBe('Miso editado');
      expect(dog?.photos).toEqual([]);
      expect(dog?.photo_url).toBe('');
      expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:54321/dogs/demo-miso');
    } finally {
      fetch.mockRestore();
    }
  });
});

describe('public dog description', () => {
  test('general fields, personality, foster, note and social tags remain separate before História', () => {
    const parsed = parseDescription('Sexo: Feminino\nIdade: Nasceu em 2022\nData de entrada: 2025\nRaça: Cruzada\nPorte: Pequeno/Médio\nPersonalidade: Atenta: gosta de aprender\nSociável com humanos\nNão sociável com gatos\nNão sabemos se é sociável com machos\nChipada, Vacinada, Castrada\nAcolhimento: Família temporária\nNota: Precisa de rotina\nOutro campo: valor: com dois pontos\nHistória: Uma nova história.');
    expect(parsed).toEqual({
      fields: [
        { label: 'Sexo', value: 'Feminino' },
        { label: 'Idade', value: 'Nasceu em 2022' },
        { label: 'Data de entrada', value: '2025' },
        { label: 'Raça', value: 'Cruzada' },
        { label: 'Porte', value: 'Pequeno/Médio' },
        { label: '✓', value: 'Sociável com humanos' },
        { label: '✓', value: 'Não sociável com gatos' },
        { label: '✓', value: 'Não sabemos se é sociável com machos' },
        { label: '🏥', value: 'Chipada, Vacinada, Castrada' },
        { label: 'Outro campo', value: 'valor: com dois pontos' },
      ],
      personality: 'Atenta: gosta de aprender',
      foster: 'Família temporária',
      note: 'Precisa de rotina',
      story: 'Uma nova história.',
    });
  });

  test.each(['Chipado, Vacinado, Esterilizado', 'Chipada, Vacinada, Esterilizada', 'Castrado', 'Castrada', 'Chipada'])('gendered medical text %s stays a medical tag', medical => {
    expect(parseDescription(medical).fields).toEqual([{ label: '🏥', value: medical }]);
  });

  test.each(['\n', '\\n', '\r\n'])('actual, escaped and CRLF newlines preserve story paragraphs (%j)', newline => {
    const parsed = parseDescription(['Personalidade: Serena', 'História:', 'Primeira linha.', '', 'Nota: esta é uma frase da história.', 'Última linha.'].join(newline));
    expect(parsed.personality).toBe('Serena');
    expect(parsed.note).toBe('');
    expect(parsed.story).toBe('Primeira linha.\n\nNota: esta é uma frase da história.\nÚltima linha.');
  });

  test('whitespace at the end of a story line is preserved, not collapsed into the next line', () => {
    expect(parseDescription('História: Primeira linha.  \n  Continuação indentada.\n\nÚltimo parágrafo.').story).toBe('Primeira linha.  \n  Continuação indentada.\n\nÚltimo parágrafo.');
  });

  test('legacy unstructured story retains paragraphs, and empty descriptions stay empty', () => {
    expect(parseDescription('Uma linha.\nOutra linha.\n\nOutro parágrafo.').story).toBe('Uma linha.\nOutra linha.\n\nOutro parágrafo.');
    expect(parseDescription('')).toEqual({ fields: [], story: '', personality: '', foster: '', note: '' });
  });

  test('English demo prose translates only unchanged original values, never edited seeded text', () => {
    const original = demoDogs[0];
    const english = profileDescription(original, 'en');
    expect(english.personality).toBe('Calm and curious');
    expect(english.story).toBe('A fictional companion who loves discovering scents in the garden.');
    expect(profileDescription(original, 'pt').personality).toBe('Calmo e curioso');

    const edited = { ...original, description: original.description
      .replace('Personalidade: Calmo e curioso', 'Personalidade: Calmo e curioso, mas agora prefere estar sozinho.')
      .replace('História: Um companheiro fictício que adora descobrir cheiros no jardim.', 'História: Um companheiro fictício que adora descobrir cheiros no jardim.\n\nAtualização real: rotina nova.') };
    expect(profileDescription(edited, 'en').personality).toBe('Calmo e curioso, mas agora prefere estar sozinho.');
    expect(profileDescription(edited, 'en').story).toBe('Um companheiro fictício que adora descobrir cheiros no jardim.\n\nAtualização real: rotina nova.');
    expect(profileDescription({ ...original, id: 'real-record' }, 'en').personality).toBe('Calmo e curioso');
  });
  test('all text after História stays narrative, including colons, keyed labels and tag-like lines', () => {
    const form = emptyForm();
    form.sex = 'female';
    form.personality = 'Meiga e curiosa';
    form.note = 'Nota verdadeira';
    form.foster = 'Família de acolhimento temporário';
    form.story = 'Primeira linha da história fictícia.\nSegunda linha com acentos: adoção e coração.\n\nQuarta linha preservada.\nNota: parte da história, não uma nota nova.\nPersonalidade: também é narrativa.\nAcolhimento: outra frase da história.\nHistória: uma citação.\nSexo: não é um campo.\nSociável com humanos\nChipada, Vacinada\n  Última linha com espaços.  \nFim.';

    const parsed = parseDescription(buildDescription(form));

    expect(parsed.story).toBe('Primeira linha da história fictícia.\nSegunda linha com acentos: adoção e coração.\n\nQuarta linha preservada.\nNota: parte da história, não uma nota nova.\nPersonalidade: também é narrativa.\nAcolhimento: outra frase da história.\nHistória: uma citação.\nSexo: não é um campo.\nSociável com humanos\nChipada, Vacinada\n  Última linha com espaços.  \nFim.');
    expect(parsed.personality).toBe('Meiga e curiosa');
    expect(parsed.note).toBe('Nota verdadeira');
    expect(parsed.foster).toBe('Família de acolhimento temporário');
    expect(parsed.fields.filter(field => field.label === 'Sexo')).toEqual([{ label: 'Sexo', value: 'Feminino' }]);
    expect(parsed.fields.filter(field => field.label === '🏥')).toEqual([]);
    expect(parsed.fields.some(field => field.label === 'Segunda linha com acentos')).toBe(false);
  });
});
