import { useState, type FormEvent } from 'react';
import type { Locale } from '../i18n';
import { shelter, demoNotice } from '../config/shelter';
import { formatEuropeanDateTimeInput, isValidEuropeanDateTime } from '../lib/europeanDateTime';
import { submitFormSubmission } from '../lib/formSubmission';

type SupplyDonationFormProps = {
  locale?: Locale;
};

type SupplyDonationCopy = {
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
  supplyTypesLabel: string;
  supplyTypesHelp: string;
  supplyTypesRequired: string;
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
  selectedSupplyLabel: string;
  contextLabel: string;
  contextValue: string;
  supplyOptions: string[];
};

const COPY: Record<Locale, SupplyDonationCopy> = {
  pt: {
    eyebrow: 'Donativos em espécie',
    title: 'Combina a entrega de donativos',
    intro: 'Diz-nos o que queres doar e quando podes entregar. A equipa responde por email para combinar o melhor momento.',
    nameLabel: 'Nome',
    emailLabel: 'Email',
    phoneLabel: 'Telefone (opcional)',
    phonePlaceholder: '',
    timeLabel: 'Dia e hora preferidos para entrega',
    timePlaceholder: 'dd/mm/aaaa hh:mm',
    timeHelp: 'Usa formato europeu: dia/mês/ano e hora 24h, por exemplo 11/07/2026 15:00.',
    timeInvalid: 'Indica a data e hora no formato dd/mm/aaaa hh:mm, por exemplo 11/07/2026 15:00.',
    supplyTypesLabel: 'Tipo de donativo',
    supplyTypesHelp: 'Podes escolher mais do que uma opção.',
    supplyTypesRequired: 'Escolhe pelo menos um tipo de donativo.',
    messageLabel: 'Detalhes dos donativos',
    messagePlaceholder: 'Ex.: 2 sacos de ração júnior, 5 mantas lavadas, lixívia, brinquedos, ou perguntas sobre entrega.',
    submit: 'Enviar pedido de entrega',
    submitting: 'A enviar…',
    sent: 'Pedido enviado. A equipa do abrigo recebeu os dados e responderá por email.',
    fallbackNote: 'Não conseguimos confirmar o envio automático. Usa este link para enviar o email preparado:',
    openEmail: 'Abrir email preparado',
    notProvided: 'Não indicado',
    subject: 'Donativo em espécie',
    bodyIntro: 'Novo pedido para entrega de donativos em espécie através do site abrigo.',
    pageLabel: 'Página',
    selectedSupplyLabel: 'Tipo(s) de donativo',
    contextLabel: 'Donativos em espécie',
    contextValue: 'Entrega de donativos abrigo',
    supplyOptions: [
      'Materiais de limpeza',
      'Comida para cão',
      'Medicação ou material veterinário',
      'Coleiras, trelas ou transportadoras',
      'Cobertores, almofadas ou camas',
      'Brinquedos e snacks',
      'Material de escritório ou outros artigos',
    ],
  },
  en: {
    eyebrow: 'In-kind donations',
    title: 'Arrange a supply drop-off',
    intro: 'Tell us what you would like to donate and when you can drop it off. The shelter team will reply by email to coordinate the best time.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    phoneLabel: 'Phone (optional)',
    phonePlaceholder: '',
    timeLabel: 'Preferred drop-off date and time',
    timePlaceholder: 'dd/mm/yyyy hh:mm',
    timeHelp: 'Use European format: day/month/year and 24-hour time, for example 11/07/2026 15:00.',
    timeInvalid: 'Enter the date and time as dd/mm/yyyy hh:mm, for example 11/07/2026 15:00.',
    supplyTypesLabel: 'Donation type',
    supplyTypesHelp: 'You can choose more than one option.',
    supplyTypesRequired: 'Choose at least one supply donation type.',
    messageLabel: 'Donation details',
    messagePlaceholder: 'E.g. two bags of junior food, five clean blankets, bleach, toys, or questions about delivery.',
    submit: 'Send drop-off request',
    submitting: 'Sending…',
    sent: 'Request sent. abrigo received the details and will reply by email.',
    fallbackNote: 'We could not confirm automatic sending. Use this link to send the prepared email:',
    openEmail: 'Open prepared email',
    notProvided: 'Not provided',
    subject: 'Supply donation drop-off',
    bodyIntro: 'New in-kind supply donation request from the abrigo website.',
    pageLabel: 'Page',
    selectedSupplyLabel: 'Supply donation type(s)',
    contextLabel: 'In-kind donation',
    contextValue: 'abrigo supply drop-off',
    supplyOptions: [
      'Cleaning supplies',
      'Dog food',
      'Medication or veterinary supplies',
      'Collars, leads, or transport crates',
      'Blankets, cushions, or beds',
      'Toys and treats',
      'Office supplies or other items',
    ],
  },
};


export default function SupplyDonationForm({ locale = 'pt' }: SupplyDonationFormProps) {
  const t = COPY[locale];
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'sent' | 'fallback' | 'disabled' | 'dry-run'>('idle');
  const [supplyTypeError, setSupplyTypeError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shelter.forms.enabled) { setSubmitState('disabled'); return; }
    const form = event.currentTarget;
    const timeInput = form.elements.namedItem('supply_time') as HTMLInputElement | null;
    timeInput?.setCustomValidity(
      timeInput.value && isValidEuropeanDateTime(timeInput.value)
        ? ''
        : t.timeInvalid,
    );

    const data = new FormData(form);
    const supplyTypes = data.getAll('supply_type').map((value) => String(value).trim()).filter(Boolean);
    setSupplyTypeError(supplyTypes.length > 0 ? '' : t.supplyTypesRequired);

    if (!form.reportValidity() || supplyTypes.length === 0) return;

    const get = (name: string) => String(data.get(name) ?? '').trim();
    const phone = get('supply_phone');
    const message = get('supply_message');

    setSubmitState('submitting');

    const result = await submitFormSubmission({
      kind: 'supply_donation',
      locale,
      source: 'supply-donation-form',
      pageUrl: window.location.href,
      contextLabel: t.contextLabel,
      contextValue: t.contextValue,
      name: get('supply_name'),
      email: get('supply_email'),
      phone,
      preferredTime: get('supply_time'),
      supplyTypes,
      message,
      website: get('website'),
    }, { skipBackend: form.dataset.skipBackend === 'true' });

    if (result.status === 'disabled') { setSubmitState('disabled'); return; }
    if (result.status === 'sent') {
      setSubmitState(result.dryRun ? 'dry-run' : 'sent');
      form.reset();
      setSupplyTypeError('');
      return;
    }

    setSubmitState('fallback');

  };

  return (
    <section data-supply-donation-form-section className="relative z-10 mx-auto max-w-4xl rounded-[2.5rem] border-2 border-playful-orange/15 bg-white/90 p-5 shadow-pillowy-lg sm:p-8 lg:p-10" aria-labelledby="supply-donation-form-heading">
      <div className="mb-7 text-center">
        <span className="inline-flex -rotate-1 rounded-full border border-playful-line bg-playful-peach px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-playful-orange-dark shadow-sm">
          {t.eyebrow}
        </span>
        <h1 id="supply-donation-form-heading" className="mx-auto mt-4 max-w-3xl font-playful-display text-4xl font-extrabold tracking-[-0.045em] text-playful-orange-dark sm:text-5xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-playful-muted sm:text-lg sm:leading-8">
          {t.intro}
        </p>
      </div>

      <form data-supply-donation-form className="space-y-5" onSubmit={handleSubmit}>
          {!shelter.forms.enabled && <p data-form-disabled role="status" className="rounded-2xl border border-playful-line bg-playful-peach p-4 text-sm font-bold leading-6">{demoNotice(locale)}</p>}
          <fieldset disabled={!shelter.forms.enabled} className="space-y-5">
        <label className="hidden" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.nameLabel}
            <input name="supply_name" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="name" />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.emailLabel}
            <input name="supply_email" type="email" required className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="email" />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.phoneLabel}
            <input name="supply_phone" type="tel" className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" autoComplete="tel" placeholder={t.phonePlaceholder} />
          </label>
          <label className="block text-sm font-extrabold text-playful-orange-dark">
            {t.timeLabel}
            <input
              name="supply_time"
              type="text"
              required
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              pattern="[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}"
              placeholder={t.timePlaceholder}
              title={t.timeHelp}
              aria-describedby="supply-time-help"
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
            <span id="supply-time-help" className="mt-1 block text-xs font-bold leading-5 text-playful-muted">
              {t.timeHelp}
            </span>
          </label>
        </div>

        <fieldset className="rounded-[1.6rem] border border-playful-line bg-playful-cream/70 p-4 sm:p-5" aria-describedby="supply-type-help supply-type-error">
          <legend className="px-2 text-sm font-extrabold text-playful-orange-dark">{t.supplyTypesLabel}</legend>
          <p id="supply-type-help" className="mb-4 text-xs font-bold leading-5 text-playful-muted">{t.supplyTypesHelp}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.supplyOptions.map((option) => (
              <label key={option} className="flex items-start gap-3 rounded-[1.1rem] border border-playful-line bg-white/85 px-4 py-3 text-sm font-bold leading-6 text-playful-muted shadow-sm">
                <input
                  data-supply-type-option
                  name="supply_type"
                  type="checkbox"
                  value={option}
                  onChange={() => setSupplyTypeError('')}
                  className="mt-1 h-5 w-5 accent-playful-orange"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {supplyTypeError && (
            <p id="supply-type-error" data-supply-type-error className="mt-3 text-sm font-extrabold text-playful-orange-dark" aria-live="polite">
              {supplyTypeError}
            </p>
          )}
        </fieldset>

        <label className="block text-sm font-extrabold text-playful-orange-dark">
          {t.messageLabel}
          <textarea name="supply_message" rows={5} className="mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm" placeholder={t.messagePlaceholder} />
        </label>

        {submitState === 'dry-run' && <p data-form-dry-run role="status" className="rounded-2xl border border-playful-line bg-playful-peach p-4 text-sm font-bold">{locale === 'pt' ? 'Teste local concluído. Nenhum email foi enviado (modo dry-run).' : 'Local test complete. No email was sent (dry-run mode).'}</p>}

          {submitState === 'sent' && (
          <p data-supply-success className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-800" aria-live="polite">
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
