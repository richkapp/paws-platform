import { useState, type FormEvent } from 'react';
import type { Locale } from '../i18n';
import { shelter, demoNotice } from '../config/shelter';
import { formatEuropeanDateTimeInput, isValidEuropeanDateTime } from '../lib/europeanDateTime';
import { submitFormSubmission } from '../lib/formSubmission';

type VolunteerFormProps = {
  locale?: Locale;
};

type VolunteerCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  timeLabel: string;
  timePlaceholder: string;
  timeHelp: string;
  timeInvalid: string;
  workTypesLabel: string;
  workTypesHelp: string;
  workTypesRequired: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  sent: string;
  fallbackNote: string;
  openEmail: string;
  notProvided: string;
  subject: string;
  bodyIntro: string;
  pageLabel: string;
  selectedWorkLabel: string;
  contextLabel: string;
  contextValue: string;
  workOptions: string[];
};

const COPY: Record<Locale, VolunteerCopy> = {
  pt: {
    eyebrow: 'Voluntariado',
    title: 'Agenda uma altura para ajudar',
    intro: 'Diz-nos quando podes vir e que tipo de ajuda consegues oferecer. A equipa responde por email para combinar os detalhes.',
    nameLabel: 'Nome',
    emailLabel: 'Email',
    phoneLabel: 'Telefone (opcional)',
    phonePlaceholder: '',
    timeLabel: 'Dia e hora pretendidos',
    timePlaceholder: 'dd/mm/aaaa hh:mm',
    timeHelp: 'Usa formato europeu: dia/mês/ano e hora 24h, por exemplo 05/07/2026 10:30.',
    timeInvalid: 'Indica a data e hora no formato dd/mm/aaaa hh:mm, por exemplo 05/07/2026 10:30.',
    workTypesLabel: 'Tipo de voluntariado',
    workTypesHelp: 'Podes escolher mais do que uma opção.',
    workTypesRequired: 'Escolhe pelo menos um tipo de voluntariado.',
    messageLabel: 'Mensagem',
    messagePlaceholder: 'Conta-nos a tua disponibilidade, experiência com animais ou alguma pergunta.',
    submit: 'Enviar pedido de voluntariado',
    submitting: 'A enviar…',
    sent: 'Pedido enviado. A equipa do abrigo recebeu os dados e responderá por email.',
    fallbackNote: 'Não conseguimos confirmar o envio automático. Usa este link para enviar o email preparado:',
    openEmail: 'Abrir email preparado',
    notProvided: 'Não indicado',
    subject: 'Pedido de voluntariado',
    bodyIntro: 'Novo pedido de voluntariado através do site abrigo.',
    pageLabel: 'Página',
    selectedWorkLabel: 'Tipo(s) de voluntariado',
    contextLabel: 'Voluntariado',
    contextValue: 'Agenda de voluntariado abrigo',
    workOptions: [
      'Passear cães',
      'Cuidados no abrigo',
      'Limpeza e manutenção',
      'Fotografar animais',
      'Campanhas e eventos',
      'Divulgação nas redes sociais',
      'Transporte de animais ou donativos',
    ],
  },
  en: {
    eyebrow: 'Volunteering',
    title: 'Schedule a time to volunteer',
    intro: 'Tell us when you can come and what kind of help you are willing to do. The shelter team will reply by email to coordinate details.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    phoneLabel: 'Phone (optional)',
    phonePlaceholder: '',
    timeLabel: 'Preferred date and time',
    timePlaceholder: 'dd/mm/yyyy hh:mm',
    timeHelp: 'Use European format: day/month/year and 24-hour time, for example 05/07/2026 10:30.',
    timeInvalid: 'Enter the date and time as dd/mm/yyyy hh:mm, for example 05/07/2026 10:30.',
    workTypesLabel: 'Volunteer work types',
    workTypesHelp: 'You can choose more than one option.',
    workTypesRequired: 'Choose at least one volunteer work type.',
    messageLabel: 'Message',
    messagePlaceholder: 'Tell us about your availability, animal experience, or any questions.',
    submit: 'Send volunteer request',
    submitting: 'Sending…',
    sent: 'Request sent. abrigo received the details and will reply by email.',
    fallbackNote: 'We could not confirm automatic sending. Use this link to send the prepared email:',
    openEmail: 'Open prepared email',
    notProvided: 'Not provided',
    subject: 'Volunteer request',
    bodyIntro: 'New volunteer request from the abrigo website.',
    pageLabel: 'Page',
    selectedWorkLabel: 'Volunteer work type(s)',
    contextLabel: 'Volunteering',
    contextValue: 'abrigo volunteer scheduling',
    workOptions: [
      'Dog walking',
      'Shelter animal care',
      'Cleaning and maintenance',
      'Animal photography',
      'Campaigns and events',
      'Social media outreach',
      'Transporting animals or donations',
    ],
  },
};


export default function VolunteerForm({ locale = 'pt' }: VolunteerFormProps) {
  const t = COPY[locale];
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'sent' | 'fallback' | 'disabled' | 'dry-run'>('idle');
  const [workTypeError, setWorkTypeError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shelter.forms.enabled) { setSubmitState('disabled'); return; }
    const form = event.currentTarget;
    const timeInput = form.elements.namedItem('volunteer_time') as HTMLInputElement | null;
    timeInput?.setCustomValidity(
      timeInput.value && isValidEuropeanDateTime(timeInput.value)
        ? ''
        : t.timeInvalid,
    );

    const data = new FormData(form);
    const workTypes = data.getAll('volunteer_work').map((value) => String(value).trim()).filter(Boolean);
    setWorkTypeError(workTypes.length > 0 ? '' : t.workTypesRequired);

    if (!form.reportValidity() || workTypes.length === 0) return;

    const get = (name: string) => String(data.get(name) ?? '').trim();
    const phone = get('volunteer_phone');
    const message = get('volunteer_message');

    setSubmitState('submitting');

    const result = await submitFormSubmission({
      kind: 'volunteer',
      locale,
      source: 'volunteer-form',
      pageUrl: window.location.href,
      contextLabel: t.contextLabel,
      contextValue: t.contextValue,
      name: get('volunteer_name'),
      email: get('volunteer_email'),
      phone,
      preferredTime: get('volunteer_time'),
      workTypes,
      message,
      website: get('website'),
    }, { skipBackend: form.dataset.skipBackend === 'true' });

    if (result.status === 'disabled') { setSubmitState('disabled'); return; }
    if (result.status === 'sent') {
      setSubmitState(result.dryRun ? 'dry-run' : 'sent');
      form.reset();
      setWorkTypeError('');
      return;
    }

    setSubmitState('fallback');

  };

  return (
    <section data-volunteer-form-section className="relative z-10 mx-auto max-w-4xl rounded-[2.5rem] border-2 border-playful-orange/15 bg-white/90 p-5 shadow-pillowy-lg sm:p-8 lg:p-10" aria-labelledby="volunteer-form-heading">
      <div className="mb-7 text-center">
        <span className="inline-flex -rotate-1 rounded-full border border-playful-line bg-playful-peach px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-playful-orange-dark shadow-sm">
          {t.eyebrow}
        </span>
        <h1 id="volunteer-form-heading" className="mx-auto mt-4 max-w-3xl font-playful-display text-4xl font-extrabold tracking-[-0.045em] text-playful-orange-dark sm:text-5xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-playful-muted sm:text-lg sm:leading-8">
          {t.intro}
        </p>
      </div>

      <form data-volunteer-form className="space-y-5" onSubmit={handleSubmit}>
          {!shelter.forms.enabled && <p data-form-disabled role="status" className="rounded-2xl border border-playful-line bg-playful-peach p-4 text-sm font-bold leading-6">{demoNotice(locale)}</p>}
          <fieldset disabled={!shelter.forms.enabled} className="space-y-5">
        <label className="hidden" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.nameLabel}
            <input name="volunteer_name" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="name" />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.emailLabel}
            <input name="volunteer_email" type="email" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="email" />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.phoneLabel}
            <input name="volunteer_phone" type="tel" className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="tel" placeholder={t.phonePlaceholder} />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.timeLabel}
            <input
              name="volunteer_time"
              type="text"
              required
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              pattern="[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}"
              placeholder={t.timePlaceholder}
              title={t.timeHelp}
              aria-describedby="volunteer-time-help"
              onInput={(event: FormEvent<HTMLInputElement>) => {
                const input = event.currentTarget;
                input.value = formatEuropeanDateTimeInput(input.value);
                input.setCustomValidity('');
              }}
              onBlur={(event: FormEvent<HTMLInputElement>) => {
                const input = event.currentTarget;
                if (!input.value) {
                  input.setCustomValidity('');
                  return;
                }
                input.setCustomValidity(isValidEuropeanDateTime(input.value) ? '' : t.timeInvalid);
              }}
              className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm"
            />
            <span id="volunteer-time-help" className="mt-1 block text-xs font-bold leading-5 text-playful-muted">
              {t.timeHelp}
            </span>
          </label>
        </div>

        <fieldset className="rounded-[1.6rem] border border-playful-line bg-playful-cream/70 p-4 sm:p-5" aria-describedby="volunteer-work-help volunteer-work-error">
          <legend className="px-2 text-sm font-extrabold text-playful-orange-dark">{t.workTypesLabel}</legend>
          <p id="volunteer-work-help" className="mb-4 text-xs font-bold leading-5 text-playful-muted">{t.workTypesHelp}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.workOptions.map((option) => (
              <label key={option} className="flex items-start gap-3 rounded-[1.1rem] border border-playful-line bg-white/85 px-4 py-3 text-sm font-bold leading-6 text-playful-muted shadow-sm">
                <input
                  data-volunteer-work-option
                  name="volunteer_work"
                  type="checkbox"
                  value={option}
                  onChange={() => setWorkTypeError('')}
                  className="mt-1 h-5 w-5 accent-playful-orange"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {workTypeError && (
            <p id="volunteer-work-error" data-volunteer-work-error className="mt-3 text-sm font-extrabold text-playful-orange-dark" aria-live="polite">
              {workTypeError}
            </p>
          )}
        </fieldset>

        <label className="block text-sm font-extrabold text-playful-orange-dark">
          {t.messageLabel}
          <textarea name="volunteer_message" rows={5} className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" placeholder={t.messagePlaceholder} />
        </label>

        {submitState === 'dry-run' && <p data-form-dry-run role="status" className="rounded-2xl border border-playful-line bg-playful-peach p-4 text-sm font-bold">{locale === 'pt' ? 'Teste local concluído. Nenhum email foi enviado (modo dry-run).' : 'Local test complete. No email was sent (dry-run mode).'}</p>}

          {submitState === 'sent' && (
          <p data-volunteer-success className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-800" aria-live="polite">
            {t.sent}
          </p>
        )}

        {submitState === 'fallback' && <p role="alert" className="rounded-2xl bg-playful-peach p-4 text-sm font-bold">{locale === 'pt' ? 'Não foi possível enviar. Tenta novamente mais tarde.' : 'Could not send. Please try again later.'}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={!shelter.forms.enabled || submitState === 'submitting'} className="squishy playful-focus w-full rounded-full bg-playful-orange px-7 py-4 font-playful-display text-base font-extrabold text-white shadow-squish disabled:cursor-wait disabled:opacity-70 sm:w-auto">
            {submitState === 'submitting' ? t.submitting : t.submit}
          </button>
        </div>
      </fieldset>
        </form>
    </section>
  );
}
