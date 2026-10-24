/** Public, non-secret customization. Blank destinations are deliberately disabled.
 * Branding illustrations: public/illustrations/. Colors: src/styles/global.css @theme.
 * Turning on the API does NOT enable forms: opt in here only after backend setup.
 */
export interface ShelterConfig {
  name: string;
  tagline: { pt: string; en: string };
  description: { pt: string; en: string };
  logo: string;
  publicUrl: string;
  contact: { email: string; phone: string };
  address: { lines: string[]; locality: string; mapsUrl: string };
  social: { facebook: string; instagram: string };
  donations: { paypalUrl: string; bankAccount: string; bankHolder: string; otherUrl: string };
  fees: { female: number | null; male: number | null; puppy: number | null; currency: string };
  impact: { sterilized: number };
  forms: { enabled: boolean };
}

export const shelter: ShelterConfig = {
  name: 'Paws Meadow',
  tagline: { pt: 'Um abrigo de exemplo', en: 'An example shelter' },
  description: {
    pt: 'Abrigo fictício para explorar a adoção responsável. Todos os animais, histórias e números são exemplos.',
    en: 'A fictional shelter for exploring responsible adoption. All animals, stories and figures are examples.',
  },
  logo: '/illustrations/paws-mark.svg',
  publicUrl: '',
  contact: { email: '', phone: '' },
  address: { lines: [], locality: '', mapsUrl: '' },
  social: { facebook: '', instagram: '' },
  donations: { paypalUrl: '', bankAccount: '', bankHolder: '', otherUrl: '' },
  fees: { female: null, male: null, puppy: null, currency: 'EUR' },
  impact: { sterilized: 8 },
  forms: { enabled: false },
};

/** Only explicit web destinations can become external links. */
export function safeDestination(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function feeLabel(amount: number | null, locale: 'pt' | 'en'): string {
  return amount === null
    ? (locale === 'pt' ? 'A definir' : 'To be configured')
    : new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', { style: 'currency', currency: shelter.fees.currency }).format(amount);
}

/** Mirrors the rendered donation link; a bank destination is independent. */
export function donationDestination(config: ShelterConfig = shelter): string | undefined {
  return safeDestination(config.donations.paypalUrl || config.donations.otherUrl);
}

export function hasPaymentDestination(config: ShelterConfig = shelter): boolean {
  return Boolean(donationDestination(config) || config.donations.bankAccount.trim());
}

function hasContactDestination(config: ShelterConfig): boolean {
  return Boolean(
    config.contact.email.trim() || config.contact.phone.trim()
    || config.address.lines.some((line) => line.trim()) || config.address.locality.trim()
    || safeDestination(config.address.mapsUrl)
    || Object.values(config.social).some((url) => safeDestination(url)),
  );
}

export function paymentNotice(locale: 'pt' | 'en', config: ShelterConfig = shelter): string {
  if (hasPaymentDestination(config)) {
    return locale === 'pt'
      ? 'Os destinos de donativos configurados podem aceitar pagamentos reais. Este site não processa pagamentos.'
      : 'Configured donation destinations may accept real payments. This site does not process payments.';
  }
  return locale === 'pt'
    ? 'Pagamentos desativados: nenhum destino de pagamento configurado.'
    : 'Payments are disabled: no payment destination is configured.';
}

export function formsNotice(locale: 'pt' | 'en', config: ShelterConfig = shelter): string {
  if (config.forms.enabled) {
    return locale === 'pt'
      ? 'Formulários ativados: os envios exigem um backend configurado; a entrega de email depende das suas definições.'
      : 'Forms are enabled: submissions require a configured backend; email delivery depends on its settings.';
  }
  return locale === 'pt'
    ? 'Envios desativados. Nenhum pedido ou email será enviado por estes formulários. Não introduzas dados pessoais.'
    : 'Submissions are disabled. No request or email will be sent through these forms. Do not enter personal details.';
}

export function siteNotice(locale: 'pt' | 'en', config: ShelterConfig = shelter): string {
  const contactsConfigured = hasContactDestination(config);
  if (!config.forms.enabled && !contactsConfigured && !hasPaymentDestination(config)) {
    return locale === 'pt'
      ? 'Demonstração fictícia · Sem envios, contactos ou pagamentos reais.'
      : 'Fictional demo · No real submissions, contacts or payments.';
  }
  const contacts = contactsConfigured
    ? (locale === 'pt' ? 'Os contactos e ligações configurados podem ser reais.' : 'Configured contact details and links may be real.')
    : (locale === 'pt' ? 'Nenhum contacto configurado.' : 'No contact details or links are configured.');
  return `${formsNotice(locale, config)} ${contacts} ${paymentNotice(locale, config)}`;
}

export function demoNotice(locale: 'pt' | 'en', config: ShelterConfig = shelter): string {
  if (config.forms.enabled || hasContactDestination(config) || hasPaymentDestination(config)) {
    return siteNotice(locale, config);
  }
  return locale === 'pt'
    ? 'Demonstração: envios desativados. Nenhum pedido, email ou pagamento será enviado. Não introduzas dados pessoais.'
    : 'Demo: submissions are disabled. No request, email or payment will be sent. Do not enter personal details.';
}
