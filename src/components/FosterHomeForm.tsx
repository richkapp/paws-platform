import { useRef, useState, type FormEvent } from 'react';
import type { Locale } from '../i18n';
import { shelter, demoNotice } from '../config/shelter';
import { submitFormSubmission } from '../lib/formSubmission';

type FosterHomeFormProps = {
  locale?: Locale;
};

type Option = {
  label: string;
  help?: string;
};

type StepCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  stepLabel: string;
  stepRequired: string;
  back: string;
  next: string;
  submit: string;
  submitting: string;
  sent: string;
  fallbackNote: string;
  openEmail: string;
  notProvided: string;
  subject: string;
  bodyIntro: string;
  pageLabel: string;
  contextLabel: string;
  contextValue: string;
  steps: Array<{ title: string; helper: string }>;
  labels: Record<string, string>;
  placeholders: Record<string, string>;
  options: Record<string, Option[]>;
};

const COPY: Record<Locale, StepCopy> = {
  pt: {
    eyebrow: 'Família FAT',
    title: 'Pedido para acolher temporariamente',
    intro: 'Responde a algumas perguntas sobre a tua casa, rotina e experiência. Isto ajuda a equipa do abrigo a perceber que animal pode encaixar melhor contigo.',
    stepLabel: 'Passo',
    stepRequired: 'Preenche as respostas obrigatórias deste passo antes de continuar.',
    back: 'Voltar',
    next: 'Continuar',
    submit: 'Enviar pedido de acolhimento',
    submitting: 'A enviar…',
    sent: 'Pedido enviado. A equipa do abrigo recebeu os dados e responderá por email.',
    fallbackNote: 'Não conseguimos confirmar o envio automático. Usa este link para enviar o email preparado:',
    openEmail: 'Abrir email preparado',
    notProvided: 'Não indicado',
    subject: 'Pedido de família de acolhimento temporário',
    bodyIntro: 'Novo pedido de família de acolhimento temporário através do site abrigo.',
    pageLabel: 'Página',
    contextLabel: 'Família FAT',
    contextValue: 'Pedido de acolhimento temporário abrigo',
    steps: [
      { title: 'Contacto', helper: 'Quem és e como a equipa te pode contactar.' },
      { title: 'Casa', helper: 'Condições da casa e acordo do agregado familiar.' },
      { title: 'Experiência', helper: 'O teu contacto com cães e cuidados que consegues dar.' },
      { title: 'Disponibilidade', helper: 'Quando podes acolher e que tipo de animal encaixa melhor.' },
      { title: 'Confirmar', helper: 'Notas finais e compromisso de acolhimento temporário.' },
    ],
    labels: {
      name: 'Nome',
      email: 'Email',
      phone: 'Telefone (opcional)',
      area: 'Localidade / freguesia',
      contactMethod: 'Forma preferida de contacto',
      homeType: 'Tipo de casa',
      housingStatus: 'Situação da habitação',
      outdoorSpace: 'Espaço exterior disponível',
      householdAgreement: 'Toda a casa concorda com o acolhimento?',
      householdAdults: 'Adultos em casa',
      childrenAtHome: 'Crianças em casa',
      currentPets: 'Animais que já vivem contigo',
      fosterExperience: 'Experiência anterior',
      dogExperience: 'Com que tipos de cães tens experiência?',
      careComfort: 'Cuidados que te sentes confortável em fazer',
      transport: 'Consegues transportar o animal até ao abrigo/veterinário?',
      availabilityStart: 'Quando poderias começar?',
      duration: 'Durante quanto tempo consegues acolher?',
      hoursAlone: 'Quantas horas por dia o animal ficaria sozinho?',
      animalPreferences: 'Que tipo de animal consegues acolher?',
      sizePreferences: 'Tamanhos possíveis',
      limits: 'Limites ou situações que o abrigo deve evitar',
      message: 'Mensagem ou contexto adicional',
      commitment: 'Compromisso',
      permission: 'Contacto do abrigo',
    },
    placeholders: {
      phone: '',
      area: 'Ex.: a tua localidade',
      householdAdults: 'Ex.: 2 adultos',
      childrenAtHome: 'Idades, se houver crianças',
      currentPets: 'Ex.: 1 cadela adulta, 2 gatos, nenhum animal…',
      availabilityStart: 'Ex.: imediatamente, a partir de 15/07, fins de semana…',
      limits: 'Ex.: não posso acolher cães grandes, não consigo pós-cirúrgico, tenho gatos…',
      message: 'Conta-nos qualquer detalhe que ajude a equipa a escolher bem o acolhimento.',
    },
    options: {
      contactMethod: [{ label: 'Email' }, { label: 'Telefone' }, { label: 'WhatsApp' }],
      homeType: [{ label: 'Apartamento' }, { label: 'Moradia' }, { label: 'Casa rural / quinta' }, { label: 'Outro' }],
      housingStatus: [{ label: 'Casa própria' }, { label: 'Arrendada com autorização' }, { label: 'Vivo com familiares / colegas' }, { label: 'Outro' }],
      outdoorSpace: [{ label: 'Sem exterior' }, { label: 'Varanda / terraço' }, { label: 'Quintal não vedado' }, { label: 'Quintal / jardim vedado' }, { label: 'Terreno rural' }],
      householdAgreement: [{ label: 'Sim, todos concordam' }, { label: 'Ainda preciso confirmar' }, { label: 'Não se aplica / vivo só' }],
      fosterExperience: [{ label: 'Seria a primeira vez' }, { label: 'Já tive cães' }, { label: 'Já fui FAT / foster' }, { label: 'Tenho experiência em abrigo ou resgate' }],
      dogExperience: [{ label: 'Cachorros' }, { label: 'Adultos' }, { label: 'Séniores' }, { label: 'Cães ansiosos / medrosos' }, { label: 'Cães grandes' }, { label: 'Ainda estou a aprender' }],
      careComfort: [{ label: 'Medicação simples' }, { label: 'Recuperação pós-cirúrgica' }, { label: 'Passeios e treino básico' }, { label: 'Gestão de ansiedade' }, { label: 'Fotos e atualizações regulares' }, { label: 'Prefiro um caso simples no início' }],
      transport: [{ label: 'Sim' }, { label: 'Às vezes, combinando' }, { label: 'Não' }],
      duration: [{ label: 'Emergência / poucos dias' }, { label: '2 a 4 semanas' }, { label: '1 a 3 meses' }, { label: 'Até adoção' }, { label: 'Fins de semana / férias' }],
      hoursAlone: [{ label: 'Menos de 2 horas' }, { label: '2 a 4 horas' }, { label: '4 a 6 horas' }, { label: 'Mais de 6 horas' }],
      animalPreferences: [{ label: 'Cachorro' }, { label: 'Adulto' }, { label: 'Sénior' }, { label: 'Ansioso / medroso' }, { label: 'Recuperação médica' }, { label: 'Sem preferência' }],
      sizePreferences: [{ label: 'Pequeno' }, { label: 'Médio' }, { label: 'Grande' }, { label: 'Qualquer tamanho' }],
      commitment: [{ label: 'Compreendo que o acolhimento é temporário e que o abrigo coordena alimentação, veterinário e acompanhamento.' }],
      permission: [{ label: 'Autorizo o abrigo a contactar-me sobre este pedido de acolhimento.' }],
    },
  },
  en: {
    eyebrow: 'Foster home request',
    title: 'Tell us about your temporary foster home',
    intro: 'Answer a few questions about your home, routine, and animal experience. This helps abrigo understand which animal could fit best with you.',
    stepLabel: 'Step',
    stepRequired: 'Complete the required answers on this step before continuing.',
    back: 'Back',
    next: 'Continue',
    submit: 'Send foster home request',
    submitting: 'Sending…',
    sent: 'Request sent. abrigo received the details and will reply by email.',
    fallbackNote: 'We could not confirm automatic sending. Use this link to send the prepared email:',
    openEmail: 'Open prepared email',
    notProvided: 'Not provided',
    subject: 'Foster home request',
    bodyIntro: 'New temporary foster home request from the abrigo website.',
    pageLabel: 'Page',
    contextLabel: 'Foster family',
    contextValue: 'abrigo temporary foster home request',
    steps: [
      { title: 'Contact', helper: 'Who you are and how the shelter team can reach you.' },
      { title: 'Home', helper: 'Your home setup and household agreement.' },
      { title: 'Experience', helper: 'Your dog experience and care comfort level.' },
      { title: 'Availability', helper: 'When you can foster and which animals may fit.' },
      { title: 'Confirm', helper: 'Final notes and temporary foster commitment.' },
    ],
    labels: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone (optional)',
      area: 'Town / parish',
      contactMethod: 'Preferred contact method',
      homeType: 'Home type',
      housingStatus: 'Housing status',
      outdoorSpace: 'Outdoor space available',
      householdAgreement: 'Does everyone at home agree to fostering?',
      householdAdults: 'Adults at home',
      childrenAtHome: 'Children at home',
      currentPets: 'Animals already living with you',
      fosterExperience: 'Previous experience',
      dogExperience: 'Which dogs do you have experience with?',
      careComfort: 'Care tasks you feel comfortable doing',
      transport: 'Can you transport the animal to the shelter/vet?',
      availabilityStart: 'When could you start?',
      duration: 'How long can you foster?',
      hoursAlone: 'How many hours a day would the animal be alone?',
      animalPreferences: 'Which animals can you foster?',
      sizePreferences: 'Possible sizes',
      limits: 'Limits or situations abrigo should avoid',
      message: 'Message or extra context',
      commitment: 'Commitment',
      permission: 'abrigo contact permission',
    },
    placeholders: {
      phone: '',
      area: 'E.g. a tua localidade',
      householdAdults: 'E.g. 2 adults',
      childrenAtHome: 'Ages, if there are children',
      currentPets: 'E.g. 1 adult female dog, 2 cats, no pets…',
      availabilityStart: 'E.g. immediately, from 15/07, weekends…',
      limits: 'E.g. no large dogs, no post-surgery care, I have cats…',
      message: 'Tell us anything that helps the team choose the right foster match.',
    },
    options: {
      contactMethod: [{ label: 'Email' }, { label: 'Phone' }, { label: 'WhatsApp' }],
      homeType: [{ label: 'Apartment' }, { label: 'House' }, { label: 'Rural house / farm' }, { label: 'Other' }],
      housingStatus: [{ label: 'Own home' }, { label: 'Rental with permission' }, { label: 'Living with family / housemates' }, { label: 'Other' }],
      outdoorSpace: [{ label: 'No outdoor space' }, { label: 'Balcony / terrace' }, { label: 'Unfenced yard' }, { label: 'Fenced yard / garden' }, { label: 'Rural land' }],
      householdAgreement: [{ label: 'Yes, everyone agrees' }, { label: 'I still need to confirm' }, { label: 'Not applicable / I live alone' }],
      fosterExperience: [{ label: 'This would be my first time' }, { label: 'I have had dogs before' }, { label: 'I have fostered before' }, { label: 'I have shelter or rescue experience' }],
      dogExperience: [{ label: 'Puppies' }, { label: 'Adult dogs' }, { label: 'Senior dogs' }, { label: 'Anxious or fearful dogs' }, { label: 'Large dogs' }, { label: 'I am still learning' }],
      careComfort: [{ label: 'Simple medication' }, { label: 'Post-surgery recovery' }, { label: 'Walks and basic training' }, { label: 'Anxiety management' }, { label: 'Regular photos and updates' }, { label: 'I prefer an easier first case' }],
      transport: [{ label: 'Yes' }, { label: 'Sometimes, with coordination' }, { label: 'No' }],
      duration: [{ label: 'Emergency / a few days' }, { label: '2 to 4 weeks' }, { label: '1 to 3 months' }, { label: 'Until adoption' }, { label: 'Weekends / holidays' }],
      hoursAlone: [{ label: 'Less than 2 hours' }, { label: '2 to 4 hours' }, { label: '4 to 6 hours' }, { label: 'More than 6 hours' }],
      animalPreferences: [{ label: 'Puppy' }, { label: 'Adult' }, { label: 'Senior' }, { label: 'Anxious / fearful' }, { label: 'Medical recovery' }, { label: 'No preference' }],
      sizePreferences: [{ label: 'Small' }, { label: 'Medium' }, { label: 'Large' }, { label: 'Any size' }],
      commitment: [{ label: 'I understand fostering is temporary and abrigo coordinates food, veterinary care, and support.' }],
      permission: [{ label: 'I allow abrigo to contact me about this foster request.' }],
    },
  },
};

const STEP_RULES = [
  { fields: ['foster_name', 'foster_email', 'foster_area'], groups: ['contact_method'] },
  { fields: [], groups: ['home_type', 'housing_status', 'outdoor_space', 'household_agreement'] },
  { fields: [], groups: ['foster_experience', 'dog_experience', 'care_comfort', 'transport'] },
  { fields: ['availability_start'], groups: ['duration', 'hours_alone', 'animal_preferences', 'size_preferences'] },
  { fields: [], groups: ['foster_commitment', 'foster_permission'] },
];

function getText(data: FormData, name: string): string {
  return String(data.get(name) ?? '').trim();
}

function getValues(data: FormData, name: string): string[] {
  return data.getAll(name).map((value) => String(value).trim()).filter(Boolean);
}

function renderValue(value: string | string[], fallback: string): string {
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : fallback;
  return value || fallback;
}

function FieldLabel({ children }: { children: string }) {
  return <span className="mb-2 block text-sm font-extrabold text-playful-orange-dark">{children}</span>;
}

function TextField({ label, name, placeholder, type = 'text', multiline = false }: { label: string; name: string; placeholder?: string; type?: string; multiline?: boolean }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea name={name} rows={4} placeholder={placeholder} className="w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" />
      ) : (
        <input name={name} type={type} placeholder={placeholder} className="w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete={type === 'email' ? 'email' : name.includes('phone') ? 'tel' : name.includes('name') ? 'name' : 'off'} />
      )}
    </label>
  );
}

function OptionGroup({ label, name, options, type = 'checkbox' }: { label: string; name: string; options: Option[]; type?: 'checkbox' | 'radio' }) {
  return (
    <fieldset className="rounded-[1.6rem] border border-playful-line bg-playful-cream/70 p-4 sm:p-5">
      <legend className="px-2 text-sm font-extrabold text-playful-orange-dark">{label}</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.label} className="flex items-start gap-3 rounded-[1.1rem] border border-playful-line bg-white/85 px-4 py-3 text-sm font-bold leading-6 text-playful-muted shadow-sm">
            <input name={name} type={type} value={option.label} className="mt-1 h-5 w-5 accent-playful-orange" />
            <span>
              {option.label}
              {option.help && <span className="mt-1 block text-xs font-semibold text-playful-muted/75">{option.help}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function FosterHomeForm({ locale = 'pt' }: FosterHomeFormProps) {
  const t = COPY[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'sent' | 'fallback' | 'disabled' | 'dry-run'>('idle');

  const validateStep = (stepIndex: number): boolean => {
    const form = formRef.current;
    if (!form) return false;
    const rules = STEP_RULES[stepIndex];

    for (const fieldName of rules.fields) {
      const field = form.elements.namedItem(fieldName) as HTMLInputElement | HTMLTextAreaElement | null;
      const value = field?.value.trim() ?? '';
      if (!value || (field instanceof HTMLInputElement && field.type === 'email' && !field.validity.valid)) {
        setStepError(t.stepRequired);
        field?.focus();
        return false;
      }
    }

    for (const groupName of rules.groups) {
      const choices = Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${groupName}"]`));
      if (!choices.some((choice) => choice.checked)) {
        setStepError(t.stepRequired);
        choices[0]?.focus();
        return false;
      }
    }

    setStepError('');
    return true;
  };

  const goNext = () => {
    if (validateStep(currentStep)) setCurrentStep((step) => Math.min(step + 1, t.steps.length - 1));
  };

  const goBack = () => {
    setStepError('');
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shelter.forms.enabled) { setSubmitState('disabled'); return; }
    const form = event.currentTarget;

    for (let index = 0; index < STEP_RULES.length; index += 1) {
      if (!validateStep(index)) {
        setCurrentStep(index);
        return;
      }
    }

    const data = new FormData(form);
    const details: Record<string, string | string[]> = {
      [t.labels.area]: getText(data, 'foster_area'),
      [t.labels.contactMethod]: getText(data, 'contact_method'),
      [t.labels.homeType]: getText(data, 'home_type'),
      [t.labels.housingStatus]: getText(data, 'housing_status'),
      [t.labels.outdoorSpace]: getValues(data, 'outdoor_space'),
      [t.labels.householdAgreement]: getText(data, 'household_agreement'),
      [t.labels.householdAdults]: getText(data, 'household_adults'),
      [t.labels.childrenAtHome]: getText(data, 'children_at_home'),
      [t.labels.currentPets]: getText(data, 'current_pets'),
      [t.labels.fosterExperience]: getText(data, 'foster_experience'),
      [t.labels.dogExperience]: getValues(data, 'dog_experience'),
      [t.labels.careComfort]: getValues(data, 'care_comfort'),
      [t.labels.transport]: getText(data, 'transport'),
      [t.labels.availabilityStart]: getText(data, 'availability_start'),
      [t.labels.duration]: getValues(data, 'duration'),
      [t.labels.hoursAlone]: getText(data, 'hours_alone'),
      [t.labels.animalPreferences]: getValues(data, 'animal_preferences'),
      [t.labels.sizePreferences]: getValues(data, 'size_preferences'),
      [t.labels.limits]: getText(data, 'limits'),
      [t.labels.message]: getText(data, 'foster_message'),
      [t.labels.commitment]: getValues(data, 'foster_commitment'),
      [t.labels.permission]: getValues(data, 'foster_permission'),
    };

    const body = [
      t.bodyIntro,
      '',
      `${t.labels.name}: ${getText(data, 'foster_name')}`,
      `${t.labels.email}: ${getText(data, 'foster_email')}`,
      `${t.labels.phone}: ${getText(data, 'foster_phone') || t.notProvided}`,
      '',
      ...Object.entries(details).map(([label, value]) => `${label}: ${renderValue(value, t.notProvided)}`),
      '',
      `${t.pageLabel}: ${window.location.href}`,
    ].join('\n');

    setSubmitState('submitting');

    const result = await submitFormSubmission({
      kind: 'foster_home',
      locale,
      source: 'foster-home-form',
      pageUrl: window.location.href,
      contextLabel: t.contextLabel,
      contextValue: t.contextValue,
      name: getText(data, 'foster_name'),
      email: getText(data, 'foster_email'),
      phone: getText(data, 'foster_phone'),
      fosterDetails: details,
      message: body,
      website: getText(data, 'website'),
    }, { skipBackend: form.dataset.skipBackend === 'true' });

    if (result.status === 'disabled') { setSubmitState('disabled'); return; }
    if (result.status === 'sent') {
      setSubmitState(result.dryRun ? 'dry-run' : 'sent');
      setStepError('');
      return;
    }

    setSubmitState('fallback');
  };

  return (
    <section data-foster-home-form-section className="relative z-10 mx-auto max-w-5xl rounded-[2.5rem] border-2 border-playful-orange/15 bg-white/90 p-5 shadow-pillowy-lg sm:p-8 lg:p-10" aria-labelledby="foster-home-form-heading">
      <div className="mb-7 text-center">
        <span className="inline-flex -rotate-1 rounded-full border border-playful-line bg-playful-peach px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-playful-orange-dark shadow-sm">
          {t.eyebrow}
        </span>
        <h1 id="foster-home-form-heading" className="mx-auto mt-4 max-w-3xl font-playful-display text-4xl font-extrabold tracking-[-0.045em] text-playful-orange-dark sm:text-5xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-base font-medium leading-7 text-playful-muted sm:text-lg sm:leading-8">
          {t.intro}
        </p>
      </div>

      <ol className="mb-8 grid gap-3 sm:grid-cols-5" aria-label="Foster form progress">
        {t.steps.map((step, index) => (
          <li key={step.title} className={`rounded-[1.25rem] border px-4 py-3 text-center shadow-sm ${index === currentStep ? 'border-playful-orange bg-playful-peach text-playful-orange-dark' : index < currentStep ? 'border-playful-orange/30 bg-white text-playful-orange-dark' : 'border-playful-line bg-white/70 text-playful-muted'}`}>
            <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.16em]">{t.stepLabel} {index + 1}</span>
            <span className="mt-1 block font-playful-display text-sm font-extrabold">{step.title}</span>
          </li>
        ))}
      </ol>

      <form ref={formRef} data-foster-home-form className="space-y-6" onSubmit={handleSubmit}>
          {!shelter.forms.enabled && <p data-form-disabled role="status" className="rounded-2xl border border-playful-line bg-playful-peach p-4 text-sm font-bold leading-6">{demoNotice(locale)}</p>}
          <fieldset disabled={!shelter.forms.enabled} className="space-y-5">
        <label className="hidden" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <div className="rounded-[2rem] border border-playful-line bg-playful-cream/45 p-5 sm:p-6">
          <p data-foster-step-index className="text-xs font-extrabold uppercase tracking-[0.22em] text-playful-orange-dark">{t.stepLabel} {currentStep + 1} / {t.steps.length}</p>
          <h2 className="mt-2 font-playful-display text-2xl font-extrabold tracking-[-0.03em] text-playful-orange-dark">{t.steps[currentStep].title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-playful-muted">{t.steps[currentStep].helper}</p>
        </div>

        <div data-foster-step="0" className={currentStep === 0 ? 'space-y-5' : 'hidden'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t.labels.name} name="foster_name" />
            <TextField label={t.labels.email} name="foster_email" type="email" />
            <TextField label={t.labels.phone} name="foster_phone" type="tel" placeholder={t.placeholders.phone} />
            <TextField label={t.labels.area} name="foster_area" placeholder={t.placeholders.area} />
          </div>
          <OptionGroup label={t.labels.contactMethod} name="contact_method" options={t.options.contactMethod} type="radio" />
        </div>

        <div data-foster-step="1" className={currentStep === 1 ? 'space-y-5' : 'hidden'}>
          <OptionGroup label={t.labels.homeType} name="home_type" options={t.options.homeType} type="radio" />
          <OptionGroup label={t.labels.housingStatus} name="housing_status" options={t.options.housingStatus} type="radio" />
          <OptionGroup label={t.labels.outdoorSpace} name="outdoor_space" options={t.options.outdoorSpace} />
          <OptionGroup label={t.labels.householdAgreement} name="household_agreement" options={t.options.householdAgreement} type="radio" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t.labels.householdAdults} name="household_adults" placeholder={t.placeholders.householdAdults} />
            <TextField label={t.labels.childrenAtHome} name="children_at_home" placeholder={t.placeholders.childrenAtHome} />
          </div>
          <TextField label={t.labels.currentPets} name="current_pets" placeholder={t.placeholders.currentPets} multiline />
        </div>

        <div data-foster-step="2" className={currentStep === 2 ? 'space-y-5' : 'hidden'}>
          <OptionGroup label={t.labels.fosterExperience} name="foster_experience" options={t.options.fosterExperience} type="radio" />
          <OptionGroup label={t.labels.dogExperience} name="dog_experience" options={t.options.dogExperience} />
          <OptionGroup label={t.labels.careComfort} name="care_comfort" options={t.options.careComfort} />
          <OptionGroup label={t.labels.transport} name="transport" options={t.options.transport} type="radio" />
        </div>

        <div data-foster-step="3" className={currentStep === 3 ? 'space-y-5' : 'hidden'}>
          <TextField label={t.labels.availabilityStart} name="availability_start" placeholder={t.placeholders.availabilityStart} />
          <OptionGroup label={t.labels.duration} name="duration" options={t.options.duration} />
          <OptionGroup label={t.labels.hoursAlone} name="hours_alone" options={t.options.hoursAlone} type="radio" />
          <OptionGroup label={t.labels.animalPreferences} name="animal_preferences" options={t.options.animalPreferences} />
          <OptionGroup label={t.labels.sizePreferences} name="size_preferences" options={t.options.sizePreferences} />
        </div>

        <div data-foster-step="4" className={currentStep === 4 ? 'space-y-5' : 'hidden'}>
          <TextField label={t.labels.limits} name="limits" placeholder={t.placeholders.limits} multiline />
          <TextField label={t.labels.message} name="foster_message" placeholder={t.placeholders.message} multiline />
          <OptionGroup label={t.labels.commitment} name="foster_commitment" options={t.options.commitment} />
          <OptionGroup label={t.labels.permission} name="foster_permission" options={t.options.permission} />
        </div>

        {stepError && (
          <p data-foster-step-error className="rounded-[1.25rem] border border-playful-orange/30 bg-playful-peach px-4 py-3 text-sm font-extrabold leading-6 text-playful-orange-dark" aria-live="polite">
            {stepError}
          </p>
        )}

        {submitState === 'dry-run' && <p data-form-dry-run role="status" className="rounded-2xl border border-playful-line bg-playful-peach p-4 text-sm font-bold">{locale === 'pt' ? 'Teste local concluído. Nenhum email foi enviado (modo dry-run).' : 'Local test complete. No email was sent (dry-run mode).'}</p>}

          {submitState === 'sent' && (
          <p data-foster-success className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-800" aria-live="polite">
            {t.sent}
          </p>
        )}

        {submitState === 'fallback' && <p role="alert" className="rounded-2xl bg-playful-peach p-4 text-sm font-bold">{locale === 'pt' ? 'Não foi possível enviar. Tenta novamente mais tarde.' : 'Could not send. Please try again later.'}</p>}

        {submitState !== 'sent' && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button data-foster-back type="button" onClick={goBack} disabled={currentStep === 0 || submitState === 'submitting'} className="playful-focus rounded-full border-2 border-playful-orange bg-white px-6 py-3 font-playful-display text-sm font-extrabold text-playful-orange-dark shadow-pillowy disabled:cursor-not-allowed disabled:opacity-40">
              {t.back}
            </button>
            {currentStep < t.steps.length - 1 ? (
              <button data-foster-next type="button" onClick={goNext} disabled={!shelter.forms.enabled || submitState === 'submitting'} className="squishy playful-focus rounded-full bg-playful-orange px-7 py-4 font-playful-display text-base font-extrabold text-white shadow-squish disabled:cursor-wait disabled:opacity-70">
                {t.next}
                <span aria-hidden="true"> →</span>
              </button>
            ) : (
              <button data-foster-submit type="submit" disabled={!shelter.forms.enabled || submitState === 'submitting'} className="squishy playful-focus rounded-full bg-playful-orange px-7 py-4 font-playful-display text-base font-extrabold text-white shadow-squish disabled:cursor-wait disabled:opacity-70">
                {submitState === 'submitting' ? t.submitting : t.submit}
              </button>
            )}
          </div>
        )}
      </fieldset>
        </form>
    </section>
  );
}
