import { shelter } from '../config/shelter';
const API_BASE_URL = (import.meta.env.PUBLIC_API_URL || '').replace(/\/$/, '');
const FORM_SUBMISSION_TIMEOUT_MS = 10000;

export type FormSubmissionKind = 'sponsorship' | 'contact' | 'visit' | 'adoption_interest' | 'volunteer' | 'supply_donation' | 'foster_home';

export type FormSubmissionPayload = {
  kind: FormSubmissionKind;
  locale: 'pt' | 'en';
  source: string;
  pageUrl: string;
  contextLabel?: string;
  contextValue?: string;
  name?: string;
  email?: string;
  phone?: string;
  preferredTime?: string;
  amount?: string;
  business?: string;
  contributionMethod?: string;
  workTypes?: string[] | string;
  supplyTypes?: string[] | string;
  fosterDetails?: Record<string, string | string[]>;
  message?: string;
  website?: string;
};

export type FormSubmissionResult =
  | { status: 'sent'; submissionId?: string; dryRun?: boolean }
  | { status: 'disabled' }
  | { status: 'fallback'; error?: string; submissionId?: string };

type SubmitOptions = {
  skipBackend?: boolean;
};

export async function submitFormSubmission(payload: FormSubmissionPayload, options: SubmitOptions = {}): Promise<FormSubmissionResult> {
  if (!shelter.forms.enabled) return { status: 'disabled' };
  if (options.skipBackend || !API_BASE_URL) return { status: 'fallback', error: 'Backend unavailable' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FORM_SUBMISSION_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/forms/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    // Both success modes must confirm storage and an explicit email outcome.
    // An ignored honeypot response is not a stored or delivered submission.
    if (
      response.ok && body?.ok === true &&
      typeof body.submissionId === 'string' && body.submissionId.trim().length > 0 &&
      ((body.emailSent === true && body.dryRun === false) ||
        (body.emailSent === false && body.dryRun === true))
    ) {
      return { status: 'sent', submissionId: body.submissionId, dryRun: body.dryRun };
    }
    return {
      status: 'fallback',
      error: typeof body?.error === 'string' ? body.error : `Backend returned ${response.status}`,
      submissionId: typeof body?.submissionId === 'string' ? body.submissionId : undefined,
    };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Backend request timed out'
      : error instanceof Error
        ? error.message
        : 'Network error';
    return { status: 'fallback', error: message };
  } finally {
    clearTimeout(timeoutId);
  }
}
