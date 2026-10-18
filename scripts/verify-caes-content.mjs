import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const pages = [
  {
    name: 'pt',
    htmlPath: resolve(repoRoot, 'dist/caes/index.html'),
    requiredSnippets: [
      'Os Nossos Cães — CAPA Póvoa de Lanhoso',
      'https://capapvl.org/caes',
      'data-playful-scroll-reveal',
      'IntersectionObserver',
      '/images/caes/hero-playful-dogs.webp',
      '/images/caes/hero-playful-dogs-fallback.jpg',
      'Prontos para adoção',
      'Os Nossos',
      'Cães',
      'Cada um deles tem uma história, uma personalidade única e muito amor para dar.',
      'Poderá o próximo lar ser o teu?',
      'Ver cães',
      'Fazer o questionário',
      'data-shelter-count>90</span> para adoção',
      'data-adopted-count>10</span> já adotados',
      'Pesquisa por nome',
      'Lista de cães para adoção',
      'Procurar cão por nome',
      'Procurar por nome...',
      'Filtrar por tamanho',
      'Filtrar por sexo',
      'Pequenos',
      'Médios',
      'Grandes',
      '♀ Fêmea',
      '♂ Macho',
    ],
    forbiddenSnippets: [
      'Página Não Encontrada',
      'Página não encontrada',
      'https://capapvl.pt/caes',
      'noindex',
      '/test-landing',
    ],
  },
  {
    name: 'en',
    htmlPath: resolve(repoRoot, 'dist/en/dogs/index.html'),
    requiredSnippets: [
      'Our Dogs — CAPA Póvoa de Lanhoso',
      'https://capapvl.org/en/dogs',
      'data-playful-scroll-reveal',
      'IntersectionObserver',
      '/images/caes/hero-playful-dogs.webp',
      '/images/caes/hero-playful-dogs-fallback.jpg',
      'Ready for adoption',
      'Our',
      'Dogs',
      'Every one of them has a story, a unique personality, and so much love to give.',
      'Could the next home be yours?',
      'View dogs',
      'Take the match quiz',
      'data-shelter-count>90</span> available',
      'data-adopted-count>10</span> adopted',
      'Search by name',
      'List of dogs for adoption',
      'Search dog by name',
      'Search by name...',
      'Filter by size',
      'Filter by sex',
      'Small',
      'Medium',
      'Large',
      '♀ Female',
      '♂ Male',
    ],
    forbiddenSnippets: [
      'Page Not Found',
      'Página Não Encontrada',
      'https://capapvl.pt/en/dogs',
      'noindex',
      '/test-landing',
    ],
  },
];

const results = pages.map((page) => {
  const html = readFileSync(page.htmlPath, 'utf8');
  const missing = page.requiredSnippets.filter((snippet) => !html.includes(snippet));
  if (missing.length) {
    console.error(`Missing ${missing.length} required snippet(s) in ${page.name} page ${page.htmlPath}:`);
    missing.forEach((snippet) => console.error(`- ${snippet}`));
    process.exit(1);
  }

  const forbiddenPresent = page.forbiddenSnippets.filter((snippet) => html.includes(snippet));
  if (forbiddenPresent.length) {
    console.error(`Forbidden snippet(s) present in ${page.name} page ${page.htmlPath}:`);
    forbiddenPresent.forEach((snippet) => console.error(`- ${snippet}`));
    process.exit(1);
  }

  return {
    page: page.name,
    checked: page.requiredSnippets.length,
    htmlPath: page.htmlPath,
  };
});

console.log(JSON.stringify({ ok: true, pages: results }, null, 2));
