import { describe, expect, test } from 'bun:test';
import {
  demoNotice, donationDestination, formsNotice, hasPaymentDestination,
  paymentNotice, safeDestination, shelter, siteNotice,
} from '../src/config/shelter';

describe('public configuration notices', () => {
  test('blank defaults retain strict bilingual demo warnings and no payment destination', () => {
    expect(siteNotice('pt')).toBe('Demonstração fictícia · Sem envios, contactos ou pagamentos reais.');
    expect(siteNotice('en')).toBe('Fictional demo · No real submissions, contacts or payments.');
    expect(demoNotice('pt')).toContain('Nenhum pedido, email ou pagamento será enviado.');
    expect(demoNotice('en')).toContain('No request, email or payment will be sent.');
    expect(hasPaymentDestination()).toBe(false);
    expect(donationDestination()).toBeUndefined();
    expect(paymentNotice('en')).toBe('Payments are disabled: no payment destination is configured.');
  });

  test('configured donation destinations do not inherit the form-disabled payment promise', () => {
    const configured = structuredClone(shelter);
    configured.donations.paypalUrl = 'https://donations.example.invalid/configured';
    expect(configured.forms.enabled).toBe(false);
    expect(demoNotice('en', configured)).toContain('Submissions are disabled');
    expect(demoNotice('en', configured)).not.toContain('payment will be sent');
    expect(demoNotice('pt', configured)).not.toContain('pagamento será enviado');
    expect(demoNotice('en', configured)).toContain('may accept real payments');
    expect(paymentNotice('pt', configured)).toContain('podem aceitar pagamentos reais');
    expect(donationDestination(configured)).toBe('https://donations.example.invalid/configured');
  });

  test('bank-only and other-page donations are independent of forms', () => {
    const configured = structuredClone(shelter);
    configured.donations.bankAccount = 'SYNTHETIC-ACCOUNT-NOT-VALID';
    expect(hasPaymentDestination(configured)).toBe(true);
    expect(donationDestination(configured)).toBeUndefined();
    expect(paymentNotice('en', configured)).toContain('may accept real payments');
    configured.donations.bankAccount = '';
    configured.donations.otherUrl = 'https://other.example.invalid/donate';
    expect(donationDestination(configured)).toBe('https://other.example.invalid/donate');
    configured.donations.paypalUrl = 'https://paypal.example.invalid/donate';
    expect(donationDestination(configured)).toBe('https://paypal.example.invalid/donate');
    expect(formsNotice('en', configured)).toContain('Submissions are disabled');
  });

  for (const [label, customize] of [
    ['email', (config: typeof shelter) => { config.contact.email = 'contact@example.invalid'; }],
    ['phone', (config: typeof shelter) => { config.contact.phone = 'SYNTHETIC PHONE'; }],
    ['address', (config: typeof shelter) => { config.address.lines = ['Synthetic address']; }],
    ['locality', (config: typeof shelter) => { config.address.locality = 'Synthetic locality'; }],
    ['maps', (config: typeof shelter) => { config.address.mapsUrl = 'https://maps.example.invalid/location'; }],
    ['social', (config: typeof shelter) => { config.social.instagram = 'https://social.example.invalid/shelter'; }],
  ] as const) {
    test(`${label} configuration never claims all contacts are disabled`, () => {
      const configured = structuredClone(shelter);
      customize(configured);
      expect(siteNotice('en', configured)).toContain('Configured contact details and links may be real.');
      expect(siteNotice('pt', configured)).toContain('Os contactos e ligações configurados podem ser reais.');
      expect(siteNotice('en', configured)).toContain('Submissions are disabled');
      expect(demoNotice('en', configured)).toContain('through these forms');
      expect(hasPaymentDestination(configured)).toBe(false);
    });
  }

  test('unsafe, credentialed and blank URLs never activate destinations or notices', () => {
    for (const url of ['javascript:alert(1)', 'mailto:contact@example.invalid', 'https://user:pass@example.invalid/', 'not a URL', ' ']) {
      const configured = structuredClone(shelter);
      configured.address.mapsUrl = url;
      configured.social.facebook = url;
      configured.donations.paypalUrl = url;
      configured.donations.bankAccount = ' ';
      expect(safeDestination(url)).toBeUndefined();
      expect(donationDestination(configured)).toBeUndefined();
      expect(hasPaymentDestination(configured)).toBe(false);
      expect(siteNotice('en', configured)).toBe('Fictional demo · No real submissions, contacts or payments.');
    }
  });

  test('enabling forms does not claim delivery or activate payments', () => {
    const configured = structuredClone(shelter);
    configured.forms.enabled = true;
    expect(formsNotice('en', configured)).toContain('submissions require a configured backend');
    expect(formsNotice('en', configured)).toContain('email delivery depends on its settings');
    expect(formsNotice('pt', configured)).toContain('a entrega de email depende das suas definições');
    expect(paymentNotice('en', configured)).toContain('Payments are disabled');
    expect(demoNotice('en', configured)).not.toContain('submissions are disabled');
    expect(shelter.forms.enabled).toBe(false);
  });
});
