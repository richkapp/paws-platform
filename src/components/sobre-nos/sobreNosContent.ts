import { shelter } from '../../config/shelter';
import type { Locale } from '../../i18n';

type Principle = {
  title: string;
  description: string;
  icon: string;
  tone: string;
};

type QuickStat = {
  value: string;
  label: string;
};

type AboutContent = {
  locale: Locale;
  hero: {
    badge: string;
    headingPrefix: string;
    headingHighlight: string;
    leadStrong: string;
    leadRest: string;
    subtext: string;
    imageAlt: string;
    captionTitle: string;
    captionText: string;
    primaryCta: string;
    secondaryCta: string;
    primaryHref: string;
    secondaryHref: string;
    chips: string[];
  };
  principles: {
    heading: string;
    subheading: string;
    cards: Principle[];
  };
  community: {
    eyebrow: string;
    heading: string;
    paragraphs: string[];
    cta: string;
    imageAlt: string;
    supportAlt: string;
  };
  rescue: {
    eyebrow: string;
    heading: string;
    paragraphs: string[];
    quickStats: QuickStat[];
    imageAlts: string[];
  };
  story: {
    eyebrow: string;
    heading: string;
    imageAlt: string;
    caption: string;
    quote: string;
    cta: string;
    ctaHref: string;
  };
};

export const aboutContent: Record<Locale, AboutContent> = {
  pt: {
    locale: 'pt',
    hero: {
      badge: 'Abrigo fictício',
      headingPrefix: 'Sobre o',
      headingHighlight: shelter.name,
      leadStrong: shelter.name,
      leadRest: '— um abrigo inteiramente fictício, criado para aprender a apresentar animais, apoiar adoções e organizar o trabalho de uma equipa.',
      subtext: shelter.description.pt,
      imageAlt: 'Cão acolhido pelo abrigo a receber carinho de voluntários',
      captionTitle: 'Cuidado diário, reabilitação e novas famílias',
      captionText: 'Cada gesto aproxima um patudo de uma vida segura.',
      primaryCta: 'Conheça o seu novo melhor Amigo',
      secondaryCta: 'Marque uma Visita',
      primaryHref: '/caes',
      secondaryHref: '#contactos',
      chips: ['Voluntariado e Solidariedade', 'Adoção Responsável', 'Resgate e Reabilitação'],
    },
    principles: {
      heading: 'Os Nossos Princípios',
      subheading: 'Três pilares que guiam cada decisão e cada cuidado que prestamos.',
      cards: [
        {
          title: 'Respeito e Proteção',
          description: 'Promovemos o respeito e a proteção dos animais, garantindo-lhes uma vida digna e livre de maus tratos.',
          icon: '🛡️',
          tone: 'bg-white sm:-rotate-1',
        },
        {
          title: 'Voluntariado e Solidariedade',
          description: 'Contamos com a ajuda de voluntários e com a solidariedade da comunidade para cuidar dos nossos patudos e garantir-lhes uma vida melhor.',
          icon: '❤',
          tone: 'bg-playful-peach/75 sm:rotate-1 sm:translate-y-5',
        },
        {
          title: 'Adoção Responsável',
          description: 'Incentivamos a adoção responsável, garantindo que os animais são acolhidos por famílias comprometidas com o seu bem-estar.',
          icon: '🏠',
          tone: 'bg-white sm:-rotate-1',
        },
      ],
    },
    community: {
      eyebrow: 'Na Comunidade',
      heading: 'Parceria com Escolas',
      paragraphs: [
        'Este espaço pode apresentar futuras parcerias com escolas e projetos educativos sobre o bem-estar animal. Não representa uma parceria real.',
        'Juntos, podemos construir um mundo melhor para nossos fiéis companheiros.',
      ],
      cta: 'Marque uma Visita',
      imageAlt: 'Cão do abrigo descontraído durante atividades com voluntários',
      supportAlt: 'Cão do abrigo junto a uma vedação do abrigo',
    },
    rescue: {
      eyebrow: 'Resgate e Reabilitação',
      heading: 'Uma Segunda Chance na Vida',
      paragraphs: [
        'O nosso trabalho inclui o resgate de cães de situações perigosas e de negligência. Ao chegarem ao abrigo, estes patudos recebem cuidados veterinários dedicados e passam por reabilitação física e socialização.',
        'Os nossos Voluntários trabalham incansavelmente para restaurar a sua saúde e a sua confiança no ser humano, proporcionando-lhes uma segunda chance na vida.',
        'Através dessa dedicação, procuramos dar a estes animais a oportunidade de encontrar um lar amoroso e seguro, onde possam viver felizes e saudáveis.',
      ],
      quickStats: [
        { value: 'Triagem', label: 'Avaliação veterinária à chegada' },
        { value: 'Reabilitação', label: 'Física e comportamental' },
        { value: 'Adoção', label: 'Encaminhamento para lar' },
      ],
      imageAlts: [
        'Cão resgatado a recuperar no abrigo do abrigo',
        'Cão em recuperação veterinária no abrigo',
        'Cães acolhidos pelo abrigo a descansar no abrigo',
      ],
    },
    story: {
      eyebrow: 'Histórias de Sucesso',
      heading: 'Cada Rabo a Abanar é uma Vitória',
      imageAlt: 'Fig, um dos nossos cães de sucesso adoptado pelo abrigo de exemplo',
      caption: 'Fig — adoção fictícia 🐾',
      quote: '"Estamos orgulhosos das nossas histórias de sucesso de Patudos que encontraram lares responsáveis e cheios de amor através da adoção. Cada rabo a abanar e olhar cheio de gratidão é uma prova do poder transformador do amor."',
      cta: 'Conheça o seu novo melhor Amigo',
      ctaHref: '/caes',
    },
  },
  en: {
    locale: 'en',
    hero: {
      badge: 'Fictional shelter',
      headingPrefix: 'About',
      headingHighlight: shelter.name,
      leadStrong: shelter.name,
      leadRest: '— an entirely fictional shelter, created to explore animal profiles, responsible adoption and team workflows.',
      subtext: shelter.description.en,
      imageAlt: 'Dog sheltered by the shelter receiving care from volunteers',
      captionTitle: 'Daily care, rehabilitation, and new families',
      captionText: 'Every gesture brings a dog closer to a safe life.',
      primaryCta: 'Meet Your New Best Friend',
      secondaryCta: 'Book a Visit',
      primaryHref: '/en/dogs',
      secondaryHref: '#contactos',
      chips: ['Volunteering and Solidarity', 'Responsible Adoption', 'Rescue and Rehabilitation'],
    },
    principles: {
      heading: 'Our Principles',
      subheading: 'Three pillars that guide every decision and every act of care we provide.',
      cards: [
        {
          title: 'Respect and Protection',
          description: 'We promote respect for and protection of animals, ensuring them a dignified life free from abuse.',
          icon: '🛡️',
          tone: 'bg-white sm:-rotate-1',
        },
        {
          title: 'Volunteering and Solidarity',
          description: 'We rely on the help of volunteers and the solidarity of the community to care for our dogs and give them a better life.',
          icon: '❤',
          tone: 'bg-playful-peach/75 sm:rotate-1 sm:translate-y-5',
        },
        {
          title: 'Responsible Adoption',
          description: 'We encourage responsible adoption, ensuring animals are welcomed by families committed to their wellbeing.',
          icon: '🏠',
          tone: 'bg-white sm:-rotate-1',
        },
      ],
    },
    community: {
      eyebrow: 'In the Community',
      heading: 'Partnership with Schools',
      paragraphs: [
        'Use this space to describe future school partnerships and animal welfare education. No real partnership is represented in this demo.',
        'Together, we can build a better world for our faithful companions.',
      ],
      cta: 'Book a Visit',
      imageAlt: 'shelter dog relaxing during volunteer activities',
      supportAlt: 'shelter dog near a shelter fence',
    },
    rescue: {
      eyebrow: 'Rescue and Rehabilitation',
      heading: 'A Second Chance at Life',
      paragraphs: [
        'Our work includes rescuing dogs from dangerous situations and neglect. Upon arriving at the shelter, these dogs receive dedicated veterinary care and undergo physical rehabilitation and socialisation.',
        'Our volunteers work tirelessly to restore their health and their trust in people, giving them a second chance at life.',
        'Through this dedication, we seek to give these animals the opportunity to find a loving and safe home where they can live happily and healthily.',
      ],
      quickStats: [
        { value: 'Triage', label: 'Veterinary assessment on arrival' },
        { value: 'Rehabilitation', label: 'Physical and behavioural' },
        { value: 'Adoption', label: 'Placement in a loving home' },
      ],
      imageAlts: [
        'Rescued dog recovering in this fictional shelter',
        'Original illustration representing animal care',
        'Dogs sheltered by the shelter resting at the shelter',
      ],
    },
    story: {
      eyebrow: 'Success Stories',
      heading: 'Every Wagging Tail Is a Victory',
      imageAlt: 'Fig, one of our success stories, adopted in this fictional demo',
      caption: 'Fig — fictional adoption 🐾',
      quote: '"We are proud of our success stories of dogs who found responsible and loving homes through adoption. Every wagging tail and grateful gaze is proof of the transformative power of love."',
      cta: 'Meet Your New Best Friend',
      ctaHref: '/en/dogs',
    },
  },
};

export type { AboutContent };
