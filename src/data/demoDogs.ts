import type { Dog } from '../lib/pawsApi';

/** Entirely fictional starter records. No real animals or photo metadata. */
export const demoDogs: Dog[] = [
  {
    "id": "demo-miso",
    "name": "Miso",
    "size": "small",
    "sex": "male",
    "age": "Nasceu em 2021",
    "description": "Sexo: Masculino\nIdade: Nasceu em 2021\nData de entrada: 2025\nRaça: Cruzado (exemplo)\nPorte: small\nPersonalidade: Calmo e curioso\nSociável com humanos\nSociável com machos\nSociável com fêmeas\nSociável com gatos\nChipado, Vacinado, Esterilizado\nNota: Animal e história inteiramente fictícios.\nHistória: Um companheiro fictício que adora descobrir cheiros no jardim.",
    "photo_url": "/illustrations/miso-portrait.svg",
    "photos": [
      "/illustrations/miso-portrait.svg",
      "/illustrations/miso-play.svg"
    ],
    "is_adopted": false,
    "traits": {
      "energia": 1,
      "receio": 0,
      "carente": false,
      "aves": "sim",
      "criancas": "sim",
      "fuga": false,
      "padrinho": false
    },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "demo-tulipa",
    "name": "Tulipa",
    "size": "small-medium",
    "sex": "female",
    "age": "Nasceu em 2023",
    "description": "Sexo: Feminino\nIdade: Nasceu em 2023\nData de entrada: 2025\nRaça: Cruzado (exemplo)\nPorte: small-medium\nPersonalidade: Meiga e observadora\nSociável com humanos\nSociável com machos\nSociável com fêmeas\nSociável com gatos\nChipado, Vacinado, Esterilizado\nAcolhimento: família temporária\nNota: Animal e história inteiramente fictícios.\nHistória: Uma personagem de exemplo que prefere conhecer pessoas com calma.",
    "photo_url": "/illustrations/tulipa-portrait.svg",
    "photos": [
      "/illustrations/tulipa-portrait.svg",
      "/illustrations/tulipa-play.svg"
    ],
    "is_adopted": false,
    "traits": {
      "energia": 2,
      "receio": 1,
      "carente": true,
      "aves": "sim",
      "criancas": "sim",
      "fuga": false,
      "padrinho": false
    },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "demo-orion",
    "name": "Orion",
    "size": "medium",
    "sex": "male",
    "age": "Nasceu em 2020",
    "description": "Sexo: Masculino\nIdade: Nasceu em 2020\nData de entrada: 2024\nRaça: Cruzado (exemplo)\nPorte: medium\nPersonalidade: Ativo e brincalhão\nSociável com humanos\nSociável com machos\nSociável com fêmeas\nSociável com gatos\nChipado, Vacinado, Esterilizado\nNota: Animal e história inteiramente fictícios.\nHistória: Um aventureiro inventado para demonstrar perfis com muita energia.",
    "photo_url": "/illustrations/orion-portrait.svg",
    "photos": [
      "/illustrations/orion-portrait.svg",
      "/illustrations/orion-play.svg"
    ],
    "is_adopted": false,
    "traits": {
      "energia": 3,
      "receio": 0,
      "carente": false,
      "aves": "sim",
      "criancas": "sim",
      "fuga": true,
      "padrinho": false
    },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "demo-maple",
    "name": "Maple",
    "size": "medium-large",
    "sex": "female",
    "age": "Nasceu em 2016",
    "description": "Sexo: Feminino\nIdade: Nasceu em 2016\nData de entrada: 2023\nRaça: Cruzado (exemplo)\nPorte: medium-large\nPersonalidade: Tranquila e delicada\nSociável com humanos\nSociável com machos\nSociável com fêmeas\nSociável com gatos\nChipado, Vacinado, Esterilizado\nNota: Animal e história inteiramente fictícios.\nHistória: Esta cadela fictícia gosta de rotinas previsíveis e passeios tranquilos.",
    "photo_url": "/illustrations/maple-portrait.svg",
    "photos": [
      "/illustrations/maple-portrait.svg",
      "/illustrations/maple-play.svg"
    ],
    "is_adopted": false,
    "traits": {
      "energia": 1,
      "receio": 2,
      "carente": false,
      "aves": "sim",
      "criancas": "nao",
      "fuga": false,
      "padrinho": true
    },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "demo-nori",
    "name": "Nori",
    "size": "large",
    "sex": "female",
    "age": "Nasceu em 2022",
    "description": "Sexo: Feminino\nIdade: Nasceu em 2022\nData de entrada: 2025\nRaça: Cruzado (exemplo)\nPorte: large\nPersonalidade: Inteligente e atenta\nSociável com humanos\nSociável com machos\nSociável com fêmeas\nNão sociável com gatos\nChipado, Vacinado, Esterilizado\nAcolhimento: hotel de acolhimento\nNota: Animal e história inteiramente fictícios.\nHistória: Uma exploradora de faz de conta que aprecia jogos e aprendizagem.",
    "photo_url": "/illustrations/nori-portrait.svg",
    "photos": [
      "/illustrations/nori-portrait.svg",
      "/illustrations/nori-play.svg"
    ],
    "is_adopted": false,
    "traits": {
      "energia": 3,
      "receio": 1,
      "carente": false,
      "aves": "nao",
      "criancas": "sim",
      "fuga": false,
      "padrinho": false
    },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "demo-pesto",
    "name": "Pesto",
    "size": "medium",
    "sex": "male",
    "age": "Nasceu em 2024",
    "description": "Sexo: Masculino\nIdade: Nasceu em 2024\nData de entrada: 2026\nRaça: Cruzado (exemplo)\nPorte: medium\nPersonalidade: Sociável e alegre\nSociável com humanos\nSociável com machos\nSociável com fêmeas\nSociável com gatos\nChipado, Vacinado, Esterilizado\nNota: Animal e história inteiramente fictícios.\nHistória: Um cão imaginário que gosta de companhia e de uma boa brincadeira.",
    "photo_url": "/illustrations/pesto-portrait.svg",
    "photos": [
      "/illustrations/pesto-portrait.svg",
      "/illustrations/pesto-play.svg"
    ],
    "is_adopted": false,
    "traits": {
      "energia": 2,
      "receio": 0,
      "carente": true,
      "aves": "sim",
      "criancas": "sim",
      "fuga": false,
      "padrinho": false
    },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "demo-fig",
    "name": "Fig",
    "size": "small",
    "sex": "female",
    "age": "Nasceu em 2019",
    "description": "Sexo: Feminino\nIdade: Nasceu em 2019\nData de entrada: 2024\nRaça: Cruzado (exemplo)\nPorte: small\nPersonalidade: Doce e paciente\nSociável com humanos\nSociável com machos\nSociável com fêmeas\nSociável com gatos\nChipado, Vacinado, Esterilizado\nNota: Animal e história inteiramente fictícios.\nHistória: Nesta história de demonstração, já encontrou uma família.",
    "photo_url": "/illustrations/fig-portrait.svg",
    "photos": [
      "/illustrations/fig-portrait.svg",
      "/illustrations/fig-play.svg"
    ],
    "is_adopted": true,
    "traits": {
      "energia": 1,
      "receio": 0,
      "carente": false,
      "aves": "sim",
      "criancas": "sim",
      "fuga": false,
      "padrinho": false
    },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": "demo-waffle",
    "name": "Waffle",
    "size": "large",
    "sex": "male",
    "age": "Nasceu em 2018",
    "description": "Sexo: Masculino\nIdade: Nasceu em 2018\nData de entrada: 2023\nRaça: Cruzado (exemplo)\nPorte: large\nPersonalidade: Afetuoso e divertido\nSociável com humanos\nSociável com machos\nSociável com fêmeas\nSociável com gatos\nChipado, Vacinado, Esterilizado\nNota: Animal e história inteiramente fictícios.\nHistória: Uma adoção fictícia para demonstrar o estado adotado no site.",
    "photo_url": "/illustrations/waffle-portrait.svg",
    "photos": [
      "/illustrations/waffle-portrait.svg",
      "/illustrations/waffle-play.svg"
    ],
    "is_adopted": true,
    "traits": {
      "energia": 2,
      "receio": 0,
      "carente": false,
      "aves": "sim",
      "criancas": "sim",
      "fuga": false,
      "padrinho": false
    },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
];
