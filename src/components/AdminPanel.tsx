import { useEffect, useMemo, useRef, useState } from 'react';
import { capaApi, type Dog } from '../lib/capaApi';
import type { Locale } from '../i18n';
import { DOG_SIZES, fosterStatus, yearFrom, type DogSize } from '../lib/dogFacts';
import {
  SIZE_LABELS,
  SOCIAL_KEYS,
  buildPayload,
  emptyForm,
  fold,
  matchGap,
  parseDog,
  type DogForm,
  type Social,
} from '../lib/adminDogForm';

/* The admin area is Portuguese only: CAPA's team works in Portuguese. */

type Route = { view: 'list' } | { view: 'new' } | { view: 'edit'; id: string };
type Toast = { kind: 'ok' | 'error'; text: string; href?: string } | null;

const SESSION_EXPIRED = 'A sessão expirou. Entre novamente.';
const MAX_PHOTO_MB = 15;
const THIS_YEAR = new Date().getFullYear();

function readRoute(): Route {
  if (typeof window === 'undefined') return { view: 'list' };
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === 'novo') return { view: 'new' };
  const edit = hash.match(/^editar\/(.+)$/);
  if (edit) return { view: 'edit', id: decodeURIComponent(edit[1]) };
  return { view: 'list' };
}

function go(route: Route) {
  const hash = route.view === 'new' ? '#novo' : route.view === 'edit' ? `#editar/${encodeURIComponent(route.id)}` : '';
  if (window.location.hash !== hash) {
    if (hash) window.location.hash = hash;
    else history.pushState(null, '', window.location.pathname);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

function isAuthError(err: unknown) {
  return err instanceof Error && /unauthori[sz]ed|\(401\)/i.test(err.message);
}

function friendlyError(err: unknown, fallback: string) {
  if (!(err instanceof Error)) return fallback;
  const map: Record<string, string> = {
    'Name is required': 'O nome é obrigatório.',
    'Invalid size': 'Porte inválido.',
    'Invalid sex': 'Sexo inválido.',
    'Dog not found': 'Este cão já não existe. Atualize a página.',
    'Duplicate name': 'Já existe um cão com este nome. Use um nome diferente (por exemplo, "Bobi II").',
    'Too many attempts': 'Demasiadas tentativas. Aguarde 15 minutos e tente novamente.',
    'Failed to fetch': 'Sem ligação ao servidor. Verifique a internet e tente novamente.',
  };
  return map[err.message] ?? fallback;
}

function genderEnd(sex: string | null | undefined) {
  return sex === 'female' ? 'a' : 'o';
}

function ageText(dog: Dog) {
  const birth = yearFrom(dog.age);
  if (!birth) return null;
  const years = THIS_YEAR - birth;
  return years < 1 ? 'menos de 1 ano' : `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

function publicUrl(dog: Dog) {
  return `/cao/?id=${encodeURIComponent(dog.id)}`;
}

/* ─────────────────────────── Small UI pieces ─────────────────────────── */

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function Icon({ name, className = 'h-4 w-4' }: { name: 'plus' | 'search' | 'edit' | 'eye' | 'trash' | 'back' | 'logout' | 'check' | 'camera' | 'alert' | 'x' | 'home'; className?: string }) {
  const paths: Record<string, string> = {
    plus: 'M12 5v14M5 12h14',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
    edit: 'M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
    back: 'M15 5l-7 7 7 7',
    logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
    check: 'M5 12l5 5 9-10',
    camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    alert: 'M12 4 2.5 20h19L12 4Zm0 6v4m0 3v.01',
    x: 'M6 6l12 12M18 6 6 18',
    home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z',
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function Segmented<T extends string | number>({ value, options, onChange, name }: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`min-h-[42px] rounded-full border-2 px-4 text-sm font-bold transition-colors playful-focus ${
              active
                ? 'border-playful-orange-dark bg-playful-orange-dark text-white'
                : 'border-playful-line bg-white text-playful-ink hover:border-playful-orange'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children, htmlFor, required }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-extrabold text-playful-ink">
        {label}{required && <span className="text-playful-watermelon-dark"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs font-medium leading-5 text-playful-muted">{hint}</p>}
    </div>
  );
}

const inputClass = 'w-full rounded-xl border-2 border-playful-line bg-white px-4 py-3 text-base text-playful-ink placeholder:text-playful-muted/60 focus:border-playful-orange focus:outline-none focus:ring-2 focus:ring-playful-orange/30';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-playful-line/70 bg-white p-5 shadow-[0_6px_18px_rgb(148_74_0/0.07)] sm:p-7">
      <h2 className="font-playful-display text-lg font-extrabold text-playful-ink">{title}</h2>
      {description && <p className="mt-1 text-sm font-medium leading-6 text-playful-muted">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Logo() {
  return (
    <a href="/" className="flex items-center gap-3 playful-focus rounded-xl" title="Abrir o site">
      <img src="/logo.jpg" alt="" className="h-10 w-10 rounded-full border border-playful-line object-cover" />
      <span className="leading-tight">
        <span className="block font-playful-display text-base font-extrabold text-playful-orange-dark">CAPAPVL</span>
        <span className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-playful-muted">Gestão de cães</span>
      </span>
    </a>
  );
}

function ConfirmDialog({ title, body, confirmLabel, danger, busy, onConfirm, onCancel }: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-playful-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 id="confirm-title" className="font-playful-display text-xl font-extrabold text-playful-ink">{title}</h3>
        <div className="mt-3 text-sm font-medium leading-6 text-playful-muted">{body}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="min-h-[46px] rounded-full border-2 border-playful-line px-5 font-bold text-playful-ink hover:bg-playful-cream playful-focus">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`flex min-h-[46px] items-center justify-center gap-2 rounded-full px-5 font-bold text-white playful-focus disabled:opacity-60 ${danger ? 'bg-playful-watermelon-dark hover:bg-[#8f2c2f]' : 'bg-playful-orange-dark hover:bg-[#7c3e00]'}`}>
            {busy && <Spinner />}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastBar({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    if (!toast || toast.kind === 'error') return;
    const id = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(id);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className="fixed inset-x-4 top-20 z-[70] flex justify-center" role="status" aria-live="polite">
      <div className={`flex max-w-xl items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-xl ${toast.kind === 'ok' ? 'bg-nature-600' : 'bg-playful-watermelon-dark'}`}>
        <Icon name={toast.kind === 'ok' ? 'check' : 'alert'} className="h-5 w-5 flex-none" />
        <span>{toast.text}</span>
        {toast.href && <a href={toast.href} target="_blank" rel="noopener" className="whitespace-nowrap underline underline-offset-4">Ver no site</a>}
        <button type="button" onClick={onClose} className="ml-1 rounded-full p-1 hover:bg-white/20" aria-label="Fechar"><Icon name="x" /></button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Login ─────────────────────────── */

function LoginScreen({ onLogin, notice }: { onLogin: () => void; notice: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!capaApi) { setError('O servidor não está configurado. Contacte quem gere o site.'); return; }
    setLoading(true);
    try {
      await capaApi.login(email.trim(), password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error && /invalid login/i.test(err.message) ? 'Email ou palavra-passe incorretos.' : friendlyError(err, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-playful-canvas px-4 py-10 font-playful-body pattern-dots">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.jpg" alt="CAPA Póvoa de Lanhoso" className="h-20 w-20 rounded-full border-2 border-white object-cover shadow-pillowy" />
          <h1 className="mt-4 font-playful-display text-3xl font-extrabold tracking-[-0.03em] text-playful-ink">Gestão de cães</h1>
          <p className="mt-1 text-sm font-semibold text-playful-muted">Área reservada à equipa da CAPA</p>
        </div>
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-playful-line/70 bg-white p-7 shadow-pillowy" noValidate>
          {notice && !error && <p className="rounded-2xl bg-playful-peach/60 px-4 py-3 text-sm font-semibold text-playful-ink">{notice}</p>}
          <Field label="Email" htmlFor="admin-email">
            <input id="admin-email" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Palavra-passe" htmlFor="admin-password">
            <div className="relative">
              <input id="admin-password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-24`} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-extrabold text-playful-orange-dark hover:bg-playful-cream">
                {show ? 'Esconder' : 'Mostrar'}
              </button>
            </div>
          </Field>
          {error && <p role="alert" className="rounded-2xl border border-playful-watermelon/40 bg-playful-watermelon/10 px-4 py-3 text-sm font-semibold text-playful-watermelon-dark">{error}</p>}
          <button type="submit" disabled={loading || !email || !password} className="squishy flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-playful-orange-dark font-extrabold text-white shadow-pillowy hover:bg-[#7c3e00] disabled:opacity-50 playful-focus">
            {loading && <Spinner />}{loading ? 'A entrar…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm font-semibold"><a href="/" className="text-playful-orange-dark underline underline-offset-4">← Voltar ao site</a></p>
      </div>
    </div>
  );
}

/* ─────────────────────────── Dog list ─────────────────────────── */

type StatusFilter = 'available' | 'adopted' | 'attention' | 'all';

function needsAttention(dog: Dog): string[] {
  if (dog.is_adopted) return [];
  const issues: string[] = [];
  if (!dog.photo_url) issues.push('Sem foto');
  const gap = matchGap(dog);
  if (gap) issues.push(`Fora do questionário (${gap})`);
  if (!yearFrom(dog.age)) issues.push('Sem ano de nascimento');
  return issues;
}

function Badge({ tone, children }: { tone: 'green' | 'orange' | 'red' | 'blue' | 'grey'; children: React.ReactNode }) {
  const tones = {
    green: 'bg-nature-100 text-nature-700',
    orange: 'bg-playful-peach text-playful-orange-dark',
    red: 'bg-playful-watermelon/15 text-playful-watermelon-dark',
    blue: 'bg-sky-100 text-sky-800',
    grey: 'bg-playful-cream text-playful-muted',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${tones[tone]}`}>{children}</span>;
}

function DogList({ dogs, loading, loadError, onReload, onToggleAdopted, onDelete }: {
  dogs: Dog[];
  loading: boolean;
  loadError: string;
  onReload: () => void;
  onToggleAdopted: (dog: Dog) => void;
  onDelete: (dog: Dog) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('available');
  const [size, setSize] = useState<'all' | DogSize>('all');
  const [sex, setSex] = useState<'all' | 'male' | 'female'>('all');

  const counts = useMemo(() => ({
    available: dogs.filter((d) => !d.is_adopted).length,
    adopted: dogs.filter((d) => d.is_adopted).length,
    attention: dogs.filter((d) => needsAttention(d).length > 0).length,
    all: dogs.length,
  }), [dogs]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return dogs.filter((d) => {
      if (status === 'available' && d.is_adopted) return false;
      if (status === 'adopted' && !d.is_adopted) return false;
      if (status === 'attention' && needsAttention(d).length === 0) return false;
      if (size !== 'all' && d.size !== size) return false;
      if (sex !== 'all' && d.sex !== sex) return false;
      if (q && !fold(d.name).includes(q)) return false;
      return true;
    });
  }, [dogs, query, status, size, sex]);

  const tabs: { id: StatusFilter; label: string }[] = [
    { id: 'available', label: 'Para adoção' },
    { id: 'adopted', label: 'Adotados' },
    { id: 'attention', label: 'Por completar' },
    { id: 'all', label: 'Todos' },
  ];
  const narrowed = size !== 'all' || sex !== 'all' || query;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-playful-display text-3xl font-extrabold tracking-[-0.03em] text-playful-ink sm:text-4xl">Os nossos cães</h1>
          <p className="mt-1 text-sm font-semibold text-playful-muted">
            {counts.available} para adoção · {counts.adopted} adotados · as alterações aparecem logo no site
          </p>
        </div>
        <button type="button" onClick={() => go({ view: 'new' })} className="squishy hidden min-h-[48px] items-center gap-2 rounded-full bg-playful-orange-dark px-6 font-extrabold text-white shadow-pillowy hover:bg-[#7c3e00] playful-focus sm:flex">
          <Icon name="plus" className="h-5 w-5" /> Adicionar cão
        </button>
      </div>

      <div className="mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0" role="tablist" aria-label="Estado">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={status === tab.id}
            onClick={() => setStatus(tab.id)}
            className={`flex min-h-[42px] flex-none items-center gap-2 rounded-full border-2 px-4 text-sm font-extrabold transition-colors playful-focus ${
              status === tab.id ? 'border-playful-ink bg-playful-ink text-white' : 'border-playful-line bg-white text-playful-ink hover:border-playful-orange'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${status === tab.id ? 'bg-white/20' : tab.id === 'attention' && counts.attention ? 'bg-playful-peach text-playful-orange-dark' : 'bg-playful-cream'}`}>{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_12rem_13rem]">
        <label className="relative col-span-2 block sm:col-span-1">
          <span className="sr-only">Pesquisar por nome</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-playful-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por nome…" className={`${inputClass} pl-12`} />
        </label>
        <select value={size} onChange={(e) => setSize(e.target.value as 'all' | DogSize)} className={`${inputClass} px-3 text-sm sm:px-4 sm:text-base`} aria-label="Porte">
          <option value="all">Todos os portes</option>
          {DOG_SIZES.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
        </select>
        <select value={sex} onChange={(e) => setSex(e.target.value as 'all' | 'male' | 'female')} className={`${inputClass} px-3 text-sm sm:px-4 sm:text-base`} aria-label="Sexo">
          <option value="all">Machos e fêmeas</option>
          <option value="male">Machos</option>
          <option value="female">Fêmeas</option>
        </select>
      </div>

      {status === 'attention' && (
        <p className="mt-4 rounded-2xl bg-playful-peach/50 px-4 py-3 text-sm font-semibold leading-6 text-playful-ink">
          Cães para adoção a quem falta alguma coisa: foto, ano de nascimento, ou os dados de que o questionário precisa (sexo, energia e receio). Sem esses dados, o cão não aparece nas sugestões do questionário.
        </p>
      )}

      {loadError ? (
        <div className="mt-10 rounded-3xl border border-playful-watermelon/40 bg-white p-8 text-center">
          <p className="font-bold text-playful-watermelon-dark">{loadError}</p>
          <button type="button" onClick={onReload} className="mt-4 rounded-full bg-playful-orange-dark px-5 py-2.5 font-bold text-white">Tentar novamente</button>
        </div>
      ) : loading && dogs.length === 0 ? (
        <div className="mt-16 flex items-center justify-center gap-3 font-semibold text-playful-muted"><Spinner className="h-6 w-6" /> A carregar…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-playful-line bg-white/60 p-10 text-center">
          <p className="font-bold text-playful-ink">{status === 'attention' && !narrowed ? 'Está tudo completo. 🎉' : 'Nenhum cão encontrado.'}</p>
          {narrowed && <button type="button" onClick={() => { setQuery(''); setSize('all'); setSex('all'); }} className="mt-3 text-sm font-bold text-playful-orange-dark underline underline-offset-4">Limpar pesquisa e filtros</button>}
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {filtered.map((dog) => {
            const issues = needsAttention(dog);
            const foster = fosterStatus(dog.description);
            const meta = [dog.sex === 'female' ? 'Fêmea' : dog.sex === 'male' ? 'Macho' : null, SIZE_LABELS[dog.size] ?? dog.size, ageText(dog)].filter(Boolean).join(' · ');
            return (
              <li key={dog.id} className="flex flex-col rounded-3xl border border-playful-line/70 bg-white p-3.5 shadow-[0_4px_14px_rgb(148_74_0/0.06)] sm:p-4">
                <div className="flex gap-4">
                <button type="button" onClick={() => go({ view: 'edit', id: dog.id })} className="h-20 w-20 flex-none overflow-hidden rounded-2xl bg-playful-cream playful-focus sm:h-24 sm:w-24" aria-label={`Editar ${dog.name}`}>
                  {dog.photo_url
                    ? <img src={dog.photo_url} alt="" loading="lazy" className={`h-full w-full object-cover ${dog.is_adopted ? 'grayscale-[40%]' : ''}`} />
                    : <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-bold text-playful-muted"><Icon name="camera" className="h-6 w-6" />Sem foto</span>}
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-playful-display text-lg font-extrabold text-playful-ink">{dog.name}</h3>
                      <p className="text-sm font-semibold text-playful-muted">{meta}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dog.is_adopted
                      ? <Badge tone="green"><Icon name="check" className="h-3.5 w-3.5" />Adotad{genderEnd(dog.sex)}</Badge>
                      : status === 'all' && <Badge tone="orange">Para adoção</Badge>}
                    {!dog.is_adopted && foster && <Badge tone="blue">{/hotel/i.test(foster) ? 'Hotel de acolhimento' : 'Família de acolhimento'}</Badge>}
                    {issues.map((issue) => <Badge key={issue} tone="red"><Icon name="alert" className="h-3.5 w-3.5" />{issue}</Badge>)}
                  </div>
                </div>
                </div>
                  <div className="mt-3 flex items-center gap-1 border-t border-playful-line/50 pt-3">
                    <button type="button" onClick={() => go({ view: 'edit', id: dog.id })} className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-playful-cream px-4 text-sm font-extrabold text-playful-ink hover:bg-playful-peach playful-focus">
                      <Icon name="edit" /> Editar
                    </button>
                    <a href={publicUrl(dog)} target="_blank" rel="noopener" className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-bold text-playful-muted hover:bg-playful-cream hover:text-playful-ink playful-focus">
                      <Icon name="eye" /> Ver<span className="hidden sm:inline">&nbsp;no site</span>
                    </a>
                    <button type="button" onClick={() => onToggleAdopted(dog)} className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-bold text-playful-muted hover:bg-playful-cream hover:text-playful-ink playful-focus">
                      {dog.is_adopted ? <><Icon name="back" /> Para adoção</> : <><Icon name="home" /> <span className="hidden sm:inline">Marcar&nbsp;</span>Adotad{genderEnd(dog.sex)}</>}
                    </button>
                    <button type="button" onClick={() => onDelete(dog)} className="ml-auto flex min-h-[40px] w-10 items-center justify-center rounded-full text-playful-muted hover:bg-playful-watermelon/10 hover:text-playful-watermelon-dark playful-focus" aria-label={`Eliminar ${dog.name}`} title="Eliminar">
                      <Icon name="trash" />
                    </button>
                  </div>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={() => go({ view: 'new' })} className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-playful-orange-dark px-5 font-extrabold text-white shadow-xl playful-focus sm:hidden" aria-label="Adicionar cão">
        <Icon name="plus" className="h-6 w-6" /> Adicionar
      </button>
    </main>
  );
}

/* ─────────────────────────── Editor ─────────────────────────── */

const FOSTER_OPTIONS = [
  { value: '', label: 'No abrigo' },
  { value: 'Família de acolhimento temporário', label: 'Em família de acolhimento' },
  { value: 'Hotel de acolhimento', label: 'Em hotel de acolhimento' },
];

type NewPhoto = { file: File; url: string };

function DogEditor({ dog, onDone, onAuthLost, existingNames }: {
  dog: Dog | null;
  onDone: (message: string, saved?: Dog) => void;
  onAuthLost: () => void;
  existingNames: string[];
}) {
  const initial = useMemo(() => (dog ? parseDog(dog) : emptyForm()), [dog]);
  const [form, setForm] = useState<DogForm>(initial);
  const [photos, setPhotos] = useState<string[]>(dog?.photos?.length ? dog.photos : dog?.photo_url ? [dog.photo_url] : []);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || newPhotos.length > 0;
  const end = genderEnd(form.sex);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty && !saving) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);

  useEffect(() => () => newPhotos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof DogForm>(key: K, value: DogForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setSocial = (key: typeof SOCIAL_KEYS[number], value: Social) => setForm((f) => ({ ...f, social: { ...f.social, [key]: value } }));

  function validate(): string[] {
    const list: string[] = [];
    const name = form.name.trim();
    if (!name) list.push('Escreva o nome do cão.');
    else if (existingNames.some((n) => fold(n) === fold(name) && fold(n) !== fold(dog?.name ?? ''))) list.push(`Já existe um cão chamado ${name}. Use um nome diferente (por exemplo, "${name} II").`);
    if (!form.sex) list.push('Escolha o sexo.');
    const birth = Number(form.birthYear);
    const entry = Number(form.entryYear);
    if (form.birthYear && (!/^\d{4}$/.test(form.birthYear) || birth < 1995 || birth > THIS_YEAR)) list.push(`O ano de nascimento tem de ser entre 1995 e ${THIS_YEAR} (por exemplo, 2020).`);
    if (form.entryYear && (!/^\d{4}$/.test(form.entryYear) || entry < 1995 || entry > THIS_YEAR)) list.push(`O ano de entrada tem de ser entre 1995 e ${THIS_YEAR}.`);
    if (birth && entry && entry < birth) list.push('O ano de entrada não pode ser antes do ano de nascimento.');
    return list;
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: NewPhoto[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') || /hei[cf]/i.test(file.type)) rejected.push(`${file.name}: formato não suportado (use JPG ou PNG)`);
      else if (file.size > MAX_PHOTO_MB * 1024 * 1024) rejected.push(`${file.name}: maior que ${MAX_PHOTO_MB} MB`);
      else next.push({ file, url: URL.createObjectURL(file) });
    }
    setNewPhotos((prev) => [...prev, ...next]);
    setErrors(rejected);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function deleteExistingPhoto() {
    if (!capaApi || !dog || !photoToDelete) return;
    setDeletingPhoto(true);
    try {
      const filename = decodeURIComponent(photoToDelete.split('/').pop() ?? '');
      const updated = await capaApi.deletePhoto(dog.id, filename);
      setPhotos(updated.photos ?? []);
      setPhotoToDelete(null);
    } catch (err) {
      if (isAuthError(err)) return onAuthLost();
      setErrors([friendlyError(err, 'Não foi possível apagar a foto. Tente novamente.')]);
      setPhotoToDelete(null);
    } finally {
      setDeletingPhoto(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (problems.length) { topRef.current?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (!capaApi) return;
    setSaving(true);
    let saved: Dog;
    try {
      const payload = buildPayload(form);
      saved = dog ? await capaApi.updateDog(dog.id, payload) : await capaApi.createDog(payload);
    } catch (err) {
      setSaving(false);
      if (isAuthError(err)) return onAuthLost();
      setErrors([friendlyError(err, 'Não foi possível guardar. Verifique a ligação e tente novamente.')]);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (newPhotos.length) {
      try {
        saved = await capaApi.uploadPhotos(saved.id, newPhotos.map((p) => p.file));
      } catch (err) {
        setSaving(false);
        if (isAuthError(err)) return onAuthLost();
        onDone(`${saved.name} foi guardad${end}, mas as fotos não foram enviadas. Abra o cão e tente adicioná-las de novo.`, saved);
        return;
      }
    }
    setSaving(false);
    onDone(dog ? `Alterações a ${saved.name} guardadas.` : `${saved.name} foi adicionad${end} ao site.`, saved);
  }

  function leave() {
    if (dirty) setLeaveAsk(true);
    else go({ view: 'list' });
  }

  const matchMissing = [!form.sex && 'sexo', form.energia == null && 'energia', form.receio == null && 'receio'].filter(Boolean) as string[];
  const fosterKnown = FOSTER_OPTIONS.some((o) => o.value === form.foster);

  return (
    <div ref={topRef} className="mx-auto max-w-3xl px-4 pb-36 pt-6 sm:px-6">
      {leaveAsk && (
        <ConfirmDialog title="Sair sem guardar?" body="As alterações que fez a este cão vão perder-se." confirmLabel="Sair sem guardar" danger onConfirm={() => { setLeaveAsk(false); go({ view: 'list' }); }} onCancel={() => setLeaveAsk(false)} />
      )}
      {photoToDelete && (
        <ConfirmDialog title="Apagar esta foto?" body={<><img src={photoToDelete} alt="" className="mb-3 h-32 w-32 rounded-2xl object-cover" />A foto é retirada do site de imediato.</>} confirmLabel="Apagar foto" danger busy={deletingPhoto} onConfirm={deleteExistingPhoto} onCancel={() => setPhotoToDelete(null)} />
      )}

      <button type="button" onClick={leave} className="mb-4 flex items-center gap-1.5 rounded-full py-2 pr-3 text-sm font-bold text-playful-muted hover:text-playful-ink playful-focus">
        <Icon name="back" /> Todos os cães
      </button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-playful-display text-3xl font-extrabold tracking-[-0.03em] text-playful-ink">{dog ? dog.name : 'Novo cão'}</h1>
        {dog && <a href={publicUrl(dog)} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-sm font-bold text-playful-orange-dark underline underline-offset-4"><Icon name="eye" /> Ver a página no site</a>}
      </div>

      {errors.length > 0 && (
        <div role="alert" className="mt-5 rounded-2xl border border-playful-watermelon/40 bg-playful-watermelon/10 px-5 py-4 text-sm font-semibold text-playful-watermelon-dark">
          {errors.length === 1 ? errors[0] : <ul className="list-disc space-y-1 pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}

      <form onSubmit={save} className="mt-6 space-y-5" noValidate>
        <Section title="Informação básica">
          <Field label="Nome" htmlFor="dog-name" required>
            <input id="dog-name" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} placeholder="Ex: Bolinha" autoComplete="off" />
          </Field>
          <Field label="Sexo" required>
            <Segmented name="Sexo" value={form.sex || null} onChange={(v) => set('sex', v)} options={[{ value: 'female', label: 'Fêmea' }, { value: 'male', label: 'Macho' }]} />
          </Field>
          <Field label="Porte" hint="Como está na ficha do cão.">
            <Segmented name="Porte" value={form.size} onChange={(v) => set('size', v)} options={DOG_SIZES.map((s) => ({ value: s, label: SIZE_LABELS[s] }))} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ano de nascimento" htmlFor="dog-birth" hint="Aproximado serve. O site calcula a idade.">
              <input id="dog-birth" inputMode="numeric" maxLength={4} value={form.birthYear} onChange={(e) => set('birthYear', e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder="Ex: 2020" />
            </Field>
            <Field label="Ano de entrada no abrigo" htmlFor="dog-entry">
              <input id="dog-entry" inputMode="numeric" maxLength={4} value={form.entryYear} onChange={(e) => set('entryYear', e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder={`Ex: ${THIS_YEAR}`} />
            </Field>
          </div>
          <Field label="Raça" htmlFor="dog-breed">
            <input id="dog-breed" value={form.breed} onChange={(e) => set('breed', e.target.value)} className={inputClass} placeholder="Ex: Indefinida, Cruzado de Podengo" />
          </Field>
        </Section>

        <Section title="Situação">
          <Field label="Estado">
            <Segmented name="Estado" value={form.isAdopted ? 'adopted' : 'available'} onChange={(v) => set('isAdopted', v === 'adopted')} options={[{ value: 'available', label: 'Para adoção' }, { value: 'adopted', label: `Adotad${end}` }]} />
          </Field>
          {form.isAdopted && <p className="-mt-2 text-sm font-medium text-playful-muted">Continua no site com o selo "Adotad{end}!", mas deixa de aparecer no questionário e na contagem "No Abrigo".</p>}
          <Field label="Onde está" htmlFor="dog-foster" hint="Cães em acolhimento continuam para adoção. O site mostra uma nota a dizer que a visita se combina com a equipa.">
            <select id="dog-foster" value={form.foster} onChange={(e) => set('foster', e.target.value)} className={inputClass}>
              {FOSTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              {!fosterKnown && <option value={form.foster}>{form.foster}</option>}
            </select>
          </Field>
        </Section>

        <Section title="Texto da página" description="É isto que as pessoas leem na página do cão.">
          <Field label="Frase curta (personalidade)" htmlFor="dog-personality" hint={`Aparece por baixo do nome. ${form.personality.length}/90 caracteres.`}>
            <input id="dog-personality" maxLength={90} value={form.personality} onChange={(e) => set('personality', e.target.value)} className={inputClass} placeholder="Ex: Meiga, calma e muito companheira" />
          </Field>
          <Field label="História" htmlFor="dog-story">
            <textarea id="dog-story" rows={9} value={form.story} onChange={(e) => set('story', e.target.value)} className={`${inputClass} resize-y leading-7`} placeholder="Como chegou ao abrigo, como é no dia a dia…" />
          </Field>
          <Field label="A saber antes de adotar (opcional)" htmlFor="dog-note" hint="Aparece numa caixa à parte. Ex: precisa de medicação, prefere casa sem outros cães.">
            <input id="dog-note" value={form.note} onChange={(e) => set('note', e.target.value)} className={inputClass} />
          </Field>
        </Section>

        <Section title="Compatibilidade">
          {SOCIAL_KEYS.map((key) => (
            <Field key={key} label={`Com ${key}`}>
              <Segmented name={`Com ${key}`} value={form.social[key]} onChange={(v) => setSocial(key, v)} options={[{ value: 'yes', label: 'Sociável' }, { value: 'no', label: 'Não sociável' }, { value: 'unknown', label: 'Não sabemos' }]} />
            </Field>
          ))}
        </Section>

        <Section title="Saúde">
          <div className="flex flex-wrap gap-3">
            {([['chipped', `Chipad${end}`], ['vaccinated', `Vacinad${end}`], ['sterilized', `${form.sterilizedWord === 'Castrad' ? 'Castrad' : 'Esterilizad'}${end}`]] as const).map(([key, label]) => (
              <label key={key} className={`flex min-h-[46px] cursor-pointer items-center gap-2.5 rounded-full border-2 px-4 text-sm font-bold ${form[key] ? 'border-nature-600 bg-nature-50 text-nature-700' : 'border-playful-line bg-white text-playful-ink'}`}>
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="h-5 w-5 accent-[#4c7e32]" />
                {label}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Questionário de adoção" description="Usado em capapvl.org/match para sugerir cães a quem procura. Responda como a equipa o conhece no dia a dia.">
          {!form.isAdopted && matchMissing.length > 0 && (
            <p className="rounded-2xl bg-playful-peach/60 px-4 py-3 text-sm font-semibold text-playful-ink">
              Enquanto faltar {matchMissing.join(' e ')}, este cão não aparece nas sugestões do questionário.
            </p>
          )}
          <Field label="Energia">
            <Segmented name="Energia" value={form.energia} onChange={(v) => set('energia', v)} options={[{ value: 1, label: `Calm${end}` }, { value: 2, label: `Equilibrad${end}` }, { value: 3, label: `Muito ativ${end}` }]} />
          </Field>
          <Field label="Com pessoas novas" hint="Quanto tempo leva a confiar em quem não conhece.">
            <Segmented name="Receio" value={form.receio} onChange={(v) => set('receio', v)} options={[{ value: 0, label: `Confiante` }, { value: 1, label: `Um pouco receos${end}` }, { value: 2, label: `Receos${end}` }, { value: 3, label: `Muito receos${end}` }]} />
          </Field>
          <Field label="Com galinhas, aves ou gado">
            <Segmented name="Aves" value={form.aves} onChange={(v) => set('aves', v)} options={[{ value: '', label: 'Não testado' }, { value: 'sim', label: 'Respeita' }, { value: 'nao', label: 'Não respeita' }]} />
          </Field>
          <div className="space-y-2.5">
            {([['carente', `Muito carente: sofre quando fica muito tempo sozinh${end}`], ['fuga', 'Já fugiu de casa: precisa de vedação alta'], ['padrinho', 'Tem padrinho ou madrinha']] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-playful-line/70 bg-white px-4 py-3 text-sm font-semibold text-playful-ink hover:border-playful-orange">
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[#944a00]" />
                {label}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Fotos" description="A primeira foto é a que aparece na lista de cães. Fotos na horizontal, com o cão bem visível, ficam melhor.">
          {photos.length > 0 && (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((url, i) => (
                <li key={url} className="relative">
                  <img src={url} alt={`Foto ${i + 1}`} className="aspect-square w-full rounded-2xl bg-playful-cream object-cover" />
                  {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-playful-ink/80 px-2 py-0.5 text-[11px] font-extrabold text-white">Principal</span>}
                  <button type="button" onClick={() => setPhotoToDelete(url)} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-playful-watermelon-dark shadow hover:bg-white playful-focus" aria-label="Apagar foto">
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {newPhotos.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-extrabold text-playful-ink">Novas fotos (enviadas quando guardar)</p>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {newPhotos.map((p, i) => (
                  <li key={p.url} className="relative">
                    <img src={p.url} alt="" className="aspect-square w-full rounded-2xl object-cover ring-2 ring-playful-orange" />
                    <button type="button" onClick={() => { URL.revokeObjectURL(p.url); setNewPhotos((prev) => prev.filter((_, j) => j !== i)); }} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-playful-ink shadow playful-focus" aria-label="Retirar foto">
                      <Icon name="x" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-1 rounded-3xl border-2 border-dashed border-playful-line bg-playful-canvas px-4 py-7 text-center hover:border-playful-orange playful-focus">
            <Icon name="camera" className="h-8 w-8 text-playful-orange-dark" />
            <span className="font-extrabold text-playful-ink">{photos.length || newPhotos.length ? 'Adicionar mais fotos' : 'Adicionar fotos'}</span>
            <span className="text-xs font-semibold text-playful-muted">JPG ou PNG, até {MAX_PHOTO_MB} MB cada. Pode escolher várias de uma vez.</span>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </Section>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-playful-line/70 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="hidden flex-1 text-sm font-semibold text-playful-muted sm:block">{dirty ? 'Tem alterações por guardar.' : 'Sem alterações.'}</p>
            <button type="button" onClick={leave} disabled={saving} className="min-h-[48px] flex-1 rounded-full border-2 border-playful-line px-5 font-bold text-playful-ink hover:bg-playful-cream playful-focus sm:flex-none">
              Cancelar
            </button>
            <button type="submit" disabled={saving || (!dirty && !!dog)} className="squishy flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-full bg-playful-orange-dark px-7 font-extrabold text-white shadow-pillowy hover:bg-[#7c3e00] disabled:opacity-50 playful-focus sm:flex-none">
              {saving && <Spinner />}{saving ? 'A guardar…' : dog ? 'Guardar alterações' : 'Adicionar ao site'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────── Shell ─────────────────────────── */

export default function AdminPanel(_props: { locale?: Locale }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [notice, setNotice] = useState('');
  const [route, setRoute] = useState<Route>({ view: 'list' });
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<Toast>(null);
  const [confirm, setConfirm] = useState<{ kind: 'adopt' | 'delete'; dog: Dog } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(capaApi?.hasToken()));
    setRoute(readRoute());
    setReady(true);
    const onHash = () => { setRoute(readRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('popstate', onHash); };
  }, []);

  useEffect(() => { if (loggedIn) loadDogs(); }, [loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  function authLost() {
    capaApi?.clearToken();
    setLoggedIn(false);
    setNotice(SESSION_EXPIRED);
  }

  async function loadDogs() {
    if (!capaApi) { setLoadError('O servidor não está configurado.'); return; }
    setLoading(true);
    setLoadError('');
    try {
      setDogs(await capaApi.getDogs(true));
    } catch (err) {
      setLoadError(friendlyError(err, 'Não foi possível carregar os cães. Verifique a ligação.'));
    } finally {
      setLoading(false);
    }
  }

  async function runConfirm() {
    if (!confirm || !capaApi) return;
    const { kind, dog } = confirm;
    setBusy(true);
    try {
      if (kind === 'adopt') {
        await capaApi.updateDog(dog.id, { is_adopted: !dog.is_adopted });
        setToast({ kind: 'ok', text: dog.is_adopted ? `${dog.name} voltou a estar para adoção.` : `${dog.name} está marcad${genderEnd(dog.sex)} como adotad${genderEnd(dog.sex)}. 🎉`, href: publicUrl(dog) });
      } else {
        await capaApi.deleteDog(dog.id);
        setToast({ kind: 'ok', text: `${dog.name} foi eliminad${genderEnd(dog.sex)} do site.` });
      }
      setConfirm(null);
      await loadDogs();
    } catch (err) {
      setConfirm(null);
      if (isAuthError(err)) return authLost();
      setToast({ kind: 'error', text: friendlyError(err, 'Não foi possível concluir. Tente novamente.') });
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    capaApi?.clearToken();
    setLoggedIn(false);
    setNotice('');
    go({ view: 'list' });
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-playful-canvas text-playful-muted"><Spinner className="h-8 w-8" /></div>;
  }
  if (!loggedIn) return <LoginScreen notice={notice} onLogin={() => { setNotice(''); setLoggedIn(true); }} />;

  const editing = route.view === 'edit' ? dogs.find((d) => d.id === route.id) ?? null : null;
  const end = confirm ? genderEnd(confirm.dog.sex) : 'o';

  return (
    <div className="min-h-screen bg-playful-canvas font-playful-body text-playful-ink">
      <header className="sticky top-0 z-50 border-b border-playful-line/60 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <a href="/caes" target="_blank" rel="noopener" className="hidden min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-bold text-playful-muted hover:bg-playful-cream hover:text-playful-ink sm:flex"><Icon name="eye" /> Ver o site</a>
            <button type="button" onClick={logout} className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-bold text-playful-muted hover:bg-playful-cream hover:text-playful-ink playful-focus"><Icon name="logout" /> Sair</button>
          </div>
        </div>
      </header>

      {route.view === 'list' && (
        <DogList
          dogs={dogs}
          loading={loading}
          loadError={loadError}
          onReload={loadDogs}
          onToggleAdopted={(dog) => setConfirm({ kind: 'adopt', dog })}
          onDelete={(dog) => setConfirm({ kind: 'delete', dog })}
        />
      )}
      {route.view === 'new' && (
        <DogEditor key="new" dog={null} existingNames={dogs.map((d) => d.name)} onAuthLost={authLost} onDone={(text, saved) => { setToast({ kind: 'ok', text, href: saved ? publicUrl(saved) : undefined }); go({ view: 'list' }); loadDogs(); }} />
      )}
      {route.view === 'edit' && (
        editing
          ? <DogEditor key={editing.id} dog={editing} existingNames={dogs.map((d) => d.name)} onAuthLost={authLost} onDone={(text, saved) => { setToast({ kind: 'ok', text, href: saved ? publicUrl(saved) : undefined }); go({ view: 'list' }); loadDogs(); }} />
          : <div className="flex min-h-[50vh] items-center justify-center gap-3 font-semibold text-playful-muted">{loading ? <><Spinner className="h-6 w-6" /> A carregar…</> : <span>Cão não encontrado. <button type="button" className="underline" onClick={() => go({ view: 'list' })}>Voltar à lista</button></span>}</div>
      )}

      {confirm?.kind === 'adopt' && (
        <ConfirmDialog
          title={confirm.dog.is_adopted ? `Pôr ${confirm.dog.name} de novo para adoção?` : `${confirm.dog.name} foi adotad${end}?`}
          body={confirm.dog.is_adopted
            ? `Volta a aparecer como disponível, no questionário e na contagem "No Abrigo".`
            : `A página fica no site com o selo "Adotad${end}!", e deixa de aparecer no questionário e na contagem "No Abrigo". Pode desfazer a qualquer momento.`}
          confirmLabel={confirm.dog.is_adopted ? 'Sim, pôr para adoção' : `Sim, marcar adotad${end}`}
          busy={busy}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === 'delete' && (
        <ConfirmDialog
          danger
          title={`Eliminar ${confirm.dog.name}?`}
          body={<>
            <p>A página e os dados de {confirm.dog.name} saem do site e não podem ser recuperados aqui.</p>
            {!confirm.dog.is_adopted && <p className="mt-2 font-bold text-playful-ink">Se {confirm.dog.sex === 'female' ? 'ela' : 'ele'} foi adotad{end}, use antes "Marcar adotad{end}".</p>}
          </>}
          confirmLabel="Eliminar"
          busy={busy}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      <ToastBar toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
