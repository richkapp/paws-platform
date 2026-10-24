import { shelter, feeLabel } from '../../config/shelter';
import type { Locale } from '../../i18n';

type Benefit = {
  title: string;
  description: string;
  icon: string;
  tone: string;
};

type ProcessStep = {
  title: string;
  description: string;
};

type FeeCard = {
  title: string;
  price: string;
  icon: string;
  tone: string;
  inclusions: string[];
  note?: string;
};

export type AdocaoContent = {
  locale: Locale;
  hero: {
    badge: string;
    headingPrefix: string;
    headingHighlight: string;
    paragraphs: string[];
    imageAlt: string;
    primaryCta: string;
    primaryHref: string;
    secondaryCta: string;
    secondaryHref: string;
    chips: string[];
    captionTitle: string;
    captionText: string;
    processBadgeValue: string;
    processBadgeLabel: string;
    priceBadge: string;
  };
  benefits: {
    eyebrow: string;
    heading: string;
    intro: string;
    cards: Benefit[];
  };
  process: {
    eyebrow: string;
    heading: string;
    intro: string;
    steps: ProcessStep[];
  };
  fees: {
    eyebrow: string;
    heading: string;
    intro: string;
    cards: FeeCard[];
    contactPrefix: string;
    contactEmail: string;
  };
  cta: {
    heading: string;
    paragraphs: string[];
    button: string;
    href: string;
  };
};

const configuredFeeCount = [shelter.fees.female, shelter.fees.male, shelter.fees.puppy]
  .filter((amount) => amount !== null).length;

export const adocaoContent: Record<Locale, AdocaoContent> = {
  pt: {
    locale: 'pt',
    hero: {
      badge: 'Adoção Responsável',
      headingPrefix: 'Ganhe um Novo',
      headingHighlight: 'Melhor Amigo!',
      paragraphs: [
        'A adoção é um ato de amor que transforma duas vidas: a do animal e a sua. Estes patudos estão à espera de uma segunda chance e de alguém que os ame para sempre.',
        'Quando adopta, não está apenas a ganhar um amigo — está a salvar uma vida.',
      ],
      imageAlt: 'Tulipa, uma cadela do abrigo, olha para a câmara com expressão doce, representando a adoção responsável',
      primaryCta: 'Ver Cães Disponíveis',
      primaryHref: '/caes',
      secondaryCta: 'Como funciona a adoção',
      secondaryHref: '#processo-adocao',
      chips: ['Visita ao abrigo', 'Compatibilidade real', 'Histórico veterinário'],
      captionTitle: 'Uma segunda chance começa aqui',
      captionText: 'Cada adoção abre espaço para outro animal ser acolhido em segurança.',
      processBadgeValue: '6',
      processBadgeLabel: 'passos',
      priceBadge: feeLabel(shelter.fees.puppy, 'pt'),
    },
    benefits: {
      eyebrow: 'Por Que Adotar',
      heading: 'Benefícios da Adoção',
      intro: 'Adotar um cão de um abrigo é uma decisão que traz alegria e benefícios para toda a família.',
      cards: [
        {
          title: 'Uma Escolha que Muda Vidas',
          description: 'Ao adotar, está a dar uma segunda oportunidade a um animal que foi abandonado ou rejeitado. A sua escolha salva duas vidas: a do animal adotado e a do próximo que o abrigo pode acolher.',
          icon: '❤',
          tone: 'bg-white sm:-rotate-1',
        },
        {
          title: 'Bem-Estar Melhorado',
          description: 'Cães adotados de abrigos tendem a ser mais gratos e dedicados aos seus novos donos. A sensação de ser salvo cria um vínculo único e inquebrável entre vocês.',
          icon: '✨',
          tone: 'bg-playful-peach/80 sm:rotate-1 sm:translate-y-4',
        },
        {
          title: 'Comunidade Global',
          description: 'Ao adotar, junta-se a uma comunidade de pessoas que partilham o mesmo amor por animais. Faz novos amigos de quatro patas e conhece pessoas com valores semelhantes.',
          icon: '🌍',
          tone: 'bg-white sm:-rotate-1',
        },
        {
          title: 'Decisão Financeira Inteligente',
          description: 'Adotar é mais económico do que comprar um cão de criador. As taxas de adoção incluem vacinação, microchip e esterilização — tudo pronto para si.',
          icon: '€',
          tone: 'bg-playful-cream sm:rotate-1',
        },
        {
          title: 'Compatibilidade Real',
          description: 'Os nossos voluntários conhecem cada animal pessoalmente. Podemos ajudar a encontrar o cão perfeito para o seu estilo de vida, família e personalidade.',
          icon: '✓',
          tone: 'bg-white sm:-rotate-1 sm:translate-y-4',
        },
        {
          title: 'Educação pelo Exemplo',
          description: 'Adotar ensina às crianças valores importantes como responsabilidade, empatia e respeito pela vida. É uma lição viva que durarà para toda a vida.',
          icon: '📚',
          tone: 'bg-playful-peach/70 sm:rotate-1',
        },
      ],
    },
    process: {
      eyebrow: 'Como Adotar',
      heading: 'O Processo de Adoção',
      intro: 'O nosso processo de adoção foi pensado para garantir o melhor encaixe entre cão e família.',
      steps: [
        {
          title: 'Escolha o SeuHorário',
          description: 'Contacte-nos por email ou telefone para agendar uma visita ao abrigo. Assim podemos dedicar-lhe tempo e apresentar-lhe os animais disponíveis.',
        },
        {
          title: 'Traga o Seu Cão',
          description: 'Se já tem um cão em casa, traga-o consigo! Assim podemos verificar como se adapta ao novo membro da família antes de tomar uma decisão.',
        },
        {
          title: 'Conheça e Conecte-se',
          description: 'Passe tempo com os animais. Brinque, caricie e sinta qual deles mais se identifica consigo e com a sua família.',
        },
        {
          title: 'Reflita com Calma',
          description: 'Não há pressa. Leve o tempo que precisar para refletir sobre a sua escolha. Pode visitar novamente antes de decidir.',
        },
        {
          title: 'Prepare os Documentos',
          description: 'Quando estiver pronto, prepare os documentos necessários: comprovativo de morada e documento de identificação.',
        },
        {
          title: 'Venha Buscar o Seu Cão',
          description: 'Celebrate! O seu novo melhor amigo está à sua espera. Levará consigo um Histórico Veterinário completo do animal.',
        },
      ],
    },
    fees: {
      eyebrow: 'Taxas de Adoção',
      heading: 'Quanto Custa Adotar',
      intro: configuredFeeCount === 0
        ? 'Valores não configurados. Este exemplo não representa uma política de adoção real.'
        : configuredFeeCount === 3
          ? 'As taxas de adoção configuradas são apresentadas abaixo. Confirme os valores e as condições com a equipa.'
          : 'Algumas taxas de adoção ainda não estão configuradas. Confirme os valores e as condições com a equipa.',
      cards: [
        {
          title: 'Fêmea',
          price: feeLabel(shelter.fees.female, 'pt'),
          icon: '♀',
          tone: 'bg-white sm:-rotate-1',
          inclusions: ['Vacinas em dia', 'Esterilização', 'Microchip'],
        },
        {
          title: 'Macho',
          price: feeLabel(shelter.fees.male, 'pt'),
          icon: '♂',
          tone: 'bg-playful-peach/82 sm:rotate-1 sm:translate-y-5',
          inclusions: ['Vacinas em dia', 'Esterilização', 'Microchip'],
        },
        {
          title: 'Bebé',
          price: feeLabel(shelter.fees.puppy, 'pt'),
          icon: '🐾',
          tone: 'bg-white sm:-rotate-1',
          inclusions: ['Vacinas em dia', 'Esterilização*', 'Microchip'],
          note: 'Cuidados e condições a definir pela equipa.',
        },
      ],
      contactPrefix: 'Para mais informações, contacte-nos em',
      contactEmail: shelter.contact.email,
    },
    cta: {
      heading: 'Encontre o Seu Companheiro',
      paragraphs: [
        'Cada um dos nossos patudos tem uma história única para contar e muito amor para dar. O seu novo melhor amigo está à sua espera.',
        'Venha conhecer os animais que estão prontos para fazer parte da sua família.',
      ],
      button: 'Ver Cães Disponíveis',
      href: '/caes',
    },
  },
  en: {
    locale: 'en',
    hero: {
      badge: 'Responsible Adoption',
      headingPrefix: 'Gain a New',
      headingHighlight: 'Best Friend!',
      paragraphs: [
        "Adoption is an act of love that transforms two lives: the animal's and yours. These furry friends are waiting for a second chance and someone to love them forever.",
        "When you adopt, you're not just gaining a companion — you're saving a life.",
      ],
      imageAlt: 'Tulipa, a shelter dog, looks toward the camera with a gentle expression, representing responsible adoption',
      primaryCta: 'See Available Dogs',
      primaryHref: '/en/dogs',
      secondaryCta: 'How adoption works',
      secondaryHref: '#processo-adocao',
      chips: ['Shelter visit', 'True match', 'Veterinary record'],
      captionTitle: 'A second chance starts here',
      captionText: 'Every adoption opens space for another animal to be safely welcomed.',
      processBadgeValue: '6',
      processBadgeLabel: 'steps',
      priceBadge: feeLabel(shelter.fees.puppy, 'en'),
    },
    benefits: {
      eyebrow: 'Why Adopt',
      heading: 'Benefits of Adoption',
      intro: 'Adopting a dog from a shelter is a decision that brings joy and benefits to the whole family.',
      cards: [
        {
          title: 'A Choice That Changes Lives',
          description: "By adopting, you're giving a second chance to an animal that was abandoned or rejected. Your choice saves two lives: the one you adopt, and the next animal the shelter can take in.",
          icon: '❤',
          tone: 'bg-white sm:-rotate-1',
        },
        {
          title: 'Improved Well-Being',
          description: 'Shelter dogs tend to be more grateful and devoted to their new owners. The sense of being rescued creates a unique and unbreakable bond between you.',
          icon: '✨',
          tone: 'bg-playful-peach/80 sm:rotate-1 sm:translate-y-4',
        },
        {
          title: 'A Community of Animal Lovers',
          description: 'By adopting, you join a community of people who share the same love for animals. You make new four-legged friends and connect with people who share your values.',
          icon: '🌍',
          tone: 'bg-white sm:-rotate-1',
        },
        {
          title: 'A Smart Financial Decision',
          description: 'Adopting is more affordable than buying from a breeder. Adoption fees include vaccinations, microchip, and spaying or neutering — all taken care of for you.',
          icon: '€',
          tone: 'bg-playful-cream sm:rotate-1',
        },
        {
          title: 'A True Match',
          description: 'Our volunteers know each animal personally. We can help you find the perfect dog for your lifestyle, family, and personality.',
          icon: '✓',
          tone: 'bg-white sm:-rotate-1 sm:translate-y-4',
        },
        {
          title: 'Teaching by Example',
          description: "Adoption teaches children important values like responsibility, empathy, and respect for life. It's a living lesson that will last a lifetime.",
          icon: '📚',
          tone: 'bg-playful-peach/70 sm:rotate-1',
        },
      ],
    },
    process: {
      eyebrow: 'How to Adopt',
      heading: 'The Adoption Process',
      intro: 'Our adoption process is designed to ensure the best possible match between dog and family.',
      steps: [
        {
          title: 'Book a Visit',
          description: 'Contact us by email or phone to schedule a visit to the shelter. That way we can dedicate time to you and introduce you to the animals available.',
        },
        {
          title: 'Bring Your Dog Along',
          description: 'If you already have a dog at home, bring them with you! This way we can see how they get along with the potential new family member before any decisions are made.',
        },
        {
          title: 'Meet and Connect',
          description: 'Spend time with the animals. Play, cuddle, and get a feel for which one connects most with you and your family.',
        },
        {
          title: 'Take Your Time',
          description: "There's no rush. Take all the time you need to think it through. You're welcome to visit again before making your decision.",
        },
        {
          title: 'Prepare Your Documents',
          description: "When you're ready, gather the required documents: proof of address and a valid ID.",
        },
        {
          title: 'Take Your Dog Home',
          description: "Celebrate! Your new best friend is waiting for you. You'll take home a complete Veterinary Record for the animal.",
        },
      ],
    },
    fees: {
      eyebrow: 'Adoption Fees',
      heading: 'How Much Does It Cost to Adopt?',
      intro: configuredFeeCount === 0
        ? 'Fees are not configured. This example does not represent a real adoption policy.'
        : configuredFeeCount === 3
          ? 'Configured adoption fees are shown below. Confirm amounts and conditions with the team.'
          : 'Some adoption fees are not configured yet. Confirm amounts and conditions with the team.',
      cards: [
        {
          title: 'Female',
          price: feeLabel(shelter.fees.female, 'en'),
          icon: '♀',
          tone: 'bg-white sm:-rotate-1',
          inclusions: ['Up-to-date vaccinations', 'Spayed', 'Microchipped'],
        },
        {
          title: 'Male',
          price: feeLabel(shelter.fees.male, 'en'),
          icon: '♂',
          tone: 'bg-playful-peach/82 sm:rotate-1 sm:translate-y-5',
          inclusions: ['Up-to-date vaccinations', 'Neutered', 'Microchipped'],
        },
        {
          title: 'Puppy',
          price: feeLabel(shelter.fees.puppy, 'en'),
          icon: '🐾',
          tone: 'bg-white sm:-rotate-1',
          inclusions: ['Up-to-date vaccinations', 'Spay/Neuter*', 'Microchipped'],
          note: 'Care and conditions to be defined by the team.',
        },
      ],
      contactPrefix: 'For more information, contact us at',
      contactEmail: shelter.contact.email,
    },
    cta: {
      heading: 'Find Your Companion',
      paragraphs: [
        'Each one of our furry friends has a unique story to tell and so much love to give. Your new best friend is waiting for you.',
        'Come meet the animals who are ready to become part of your family.',
      ],
      button: 'See Available Dogs',
      href: '/en/dogs',
    },
  },
};
