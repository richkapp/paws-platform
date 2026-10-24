import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AdocaoContent } from '../src/components/adocao/adocaoContent';
import type { ShelterConfig } from '../src/config/shelter';

// Load the real content against an isolated configuration, never mutate shared defaults.
async function contentWithFees(fees: ShelterConfig['fees']) {
  const directory = await mkdtemp(path.join(tmpdir(), 'paws-adocao-fees-'));
  try {
    const contentDirectory = path.join(directory, 'src/components/adocao');
    const configDirectory = path.join(directory, 'src/config');
    await mkdir(contentDirectory, { recursive: true });
    await mkdir(configDirectory, { recursive: true });
    const config = await readFile(new URL('../src/config/shelter.ts', import.meta.url), 'utf8');
    const content = await readFile(new URL('../src/components/adocao/adocaoContent.ts', import.meta.url), 'utf8');
    await writeFile(path.join(configDirectory, 'shelter.ts'), `${config}\nObject.assign(shelter.fees, ${JSON.stringify(fees)});\n`);
    const contentPath = path.join(contentDirectory, 'adocaoContent.ts');
    await writeFile(contentPath, content);
    const loaded = await import(contentPath);
    return loaded.adocaoContent as Record<'pt' | 'en', AdocaoContent>;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('adoption fee copy', () => {
  test('configured fees have truthful PT/EN introductions and retain their prices', async () => {
    const content = await contentWithFees({ female: 111, male: 222, puppy: 333, currency: 'EUR' });
    expect(content.pt.fees.intro).toBe('As taxas de adoção configuradas são apresentadas abaixo. Confirme os valores e as condições com a equipa.');
    expect(content.en.fees.intro).toBe('Configured adoption fees are shown below. Confirm amounts and conditions with the team.');
    expect(content.pt.fees.cards.map((card) => card.price)).toEqual(['111,00\u00a0€', '222,00\u00a0€', '333,00\u00a0€']);
    expect(content.en.fees.cards.map((card) => card.price)).toEqual(['€111.00', '€222.00', '€333.00']);
    expect(content.pt.hero.priceBadge).toBe('333,00\u00a0€');
    expect(content.en.hero.priceBadge).toBe('€333.00');
  });

  test('blank defaults keep the original demo warning and all three placeholders', async () => {
    const content = await contentWithFees({ female: null, male: null, puppy: null, currency: 'EUR' });
    expect(content.pt.fees.intro).toBe('Valores não configurados. Este exemplo não representa uma política de adoção real.');
    expect(content.en.fees.intro).toBe('Fees are not configured. This example does not represent a real adoption policy.');
    expect(content.pt.fees.cards.map((card) => card.price)).toEqual(['A definir', 'A definir', 'A definir']);
    expect(content.en.fees.cards.map((card) => card.price)).toEqual(['To be configured', 'To be configured', 'To be configured']);
  });

  for (const [female, male, puppy, ptPrices, enPrices] of [
    [0, null, null, ['0,00\u00a0€', 'A definir', 'A definir'], ['€0.00', 'To be configured', 'To be configured']],
    [null, 222, null, ['A definir', '222,00\u00a0€', 'A definir'], ['To be configured', '€222.00', 'To be configured']],
    [null, null, 333, ['A definir', 'A definir', '333,00\u00a0€'], ['To be configured', 'To be configured', '€333.00']],
    [111, 222, null, ['111,00\u00a0€', '222,00\u00a0€', 'A definir'], ['€111.00', '€222.00', 'To be configured']],
    [111, null, 333, ['111,00\u00a0€', 'A definir', '333,00\u00a0€'], ['€111.00', 'To be configured', '€333.00']],
    [null, 222, 333, ['A definir', '222,00\u00a0€', '333,00\u00a0€'], ['To be configured', '€222.00', '€333.00']],
  ] as const) {
    test(`mixed fees ${female}/${male}/${puppy} distinguish missing amounts in both languages`, async () => {
      const content = await contentWithFees({ female, male, puppy, currency: 'EUR' });
      expect(content.pt.fees.intro).toBe('Algumas taxas de adoção ainda não estão configuradas. Confirme os valores e as condições com a equipa.');
      expect(content.en.fees.intro).toBe('Some adoption fees are not configured yet. Confirm amounts and conditions with the team.');
      expect(content.pt.fees.cards.map((card) => card.price)).toEqual([...ptPrices]);
      expect(content.en.fees.cards.map((card) => card.price)).toEqual([...enPrices]);
    });
  }

  test('zero is a configured amount, not a missing fee', async () => {
    const content = await contentWithFees({ female: 0, male: 0, puppy: 0, currency: 'EUR' });
    expect(content.pt.fees.intro).toContain('As taxas de adoção configuradas');
    expect(content.en.fees.intro).toContain('Configured adoption fees');
    expect(content.pt.fees.cards.map((card) => card.price)).toEqual(['0,00\u00a0€', '0,00\u00a0€', '0,00\u00a0€']);
    expect(content.en.fees.cards.map((card) => card.price)).toEqual(['€0.00', '€0.00', '€0.00']);
  });
});
