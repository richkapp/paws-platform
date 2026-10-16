import { useEffect, useMemo, useState } from 'react';
import { capaDogs } from '../data/capaDogs';
import { capaApi, type Dog } from '../lib/capaApi';
import { SHELTER_EMAIL } from '../lib/capaContact';
import { fosterLabel, withArticle } from '../lib/dogFacts';
import type { Locale } from '../i18n';
import {
  PORTE_TXT,
  PORTE_TXT_EN,
  stepsFor,
  buildMessageEn,
  type MatchLocale,
  ageOf,
  buildMessage,
  conflicts,
  levelFor,
  rankDogs,
  toMatchDog,
  yearsWaiting,
  type Answers,
  type Contact,
  type MatchDog,
  type MatchResult,
  type Question,
} from '../lib/matchEngine';

const YEAR = new Date().getFullYear();

const UI = {
  pt: {
    years: (n: number) => `${n} ${n === 1 ? 'ano' : 'anos'}`,
    female: 'Fêmea', male: 'Macho', since: (y: number) => `no abrigo desde ${y}`,
    askMore: (ref: string) => `Quero saber mais sobre ${ref}`, viewProfile: 'Ver o perfil →',
    sponsor: ' Tem padrinho ou madrinha.',
    waitingUnit: (n: number): string => (n === 1 ? 'ano à espera' : 'anos à espera'),
    ageUnit: (n: number): string => (n === 1 ? 'ano de idade' : 'anos de idade'),
    baby: 'Chegou ainda bebé',
    contactEyebrow: 'Falar com a CAPA',
    inquiryTitle: (ref: string) => `Pedido de informações sobre ${ref}`,
    inquiryIntro: (fromQuiz: boolean) => `Preencha os seus dados. Montamos a mensagem${fromQuiz ? ' com as suas respostas' : ''}; envie-a por email ou copie-a para uma mensagem. A equipa responde e marca a visita.`,
    fName: 'Nome', fAge: 'A sua idade', fPhone: 'Telefone', fEmail: 'Email', fPlace: 'Localidade (freguesia e concelho)', fObs: 'Algo que queira acrescentar',
    minor: 'A adoção tem de ser feita por alguém com 18 anos ou mais. Pode fazer o pedido com um adulto da família, e são bem-vindos a visitar o abrigo e a ser voluntários.',
    privacy: 'Os dados servem apenas para a CAPA responder a este pedido. Não são guardados nesta página nem partilhados com terceiros.',
    sendEmail: 'Enviar por email', copy: 'Copiar mensagem',
    copied: 'Copiada. Cole no email ou numa mensagem para a CAPA.', copyFail: 'Não foi possível copiar automaticamente. Selecione o texto e copie.',
    emailLine: 'Email', social: 'Também pode enviar mensagem no Instagram ou no Facebook, @capapvl.',
    subject: (n: string) => `Adoção: ${n}`,
    fill: '(preencher)',
    shortMsg: (ref: string, c: Contact) => `Olá, equipa da CAPA.\n\nGostaria de saber mais sobre ${ref}.\n\n- Nome: ${c.nome || '(preencher)'}\n- Idade: ${c.idade || '(preencher)'}\n- Telefone: ${c.tel || '(preencher)'}\n- Email: ${c.email || '(preencher)'}\n- Localidade: ${c.local || '(preencher)'}\n${c.obs.trim() ? `\n${c.obs.trim()}\n` : ''}\nPodem dizer-me qual é o próximo passo para conhecer ${ref}?\n\nObrigado.`,
    back: 'Anterior', next: 'Continuar', seeDogs: 'Ver os cães',
    missing: (n: number): string => (n === 1 ? 'Falta 1 resposta' : `Faltam ${n} respostas`),
    resultEyebrow: 'O seu resultado',
    resultTitle: (n: number): string => (n === 1 ? 'Há um cão que pode encaixar na sua casa' : `Estes ${n} cães podem encaixar na sua casa`),
    resultSub: (pool: number, all: number) => `De ${pool} cães com ficha, ${all} são compatíveis com o que descreveu. Estes são os que ficaram mais perto.`,
    kidsNote: 'Indicou que há crianças em casa. As fichas não registam testes com crianças, por isso esta parte é sempre confirmada pela equipa antes de qualquer adoção.',
    farmNote: 'Indicou que tem aves ou gado. Isto é decisivo: já houve cães devolvidos ao abrigo por atacarem galinhas. Nenhuma adoção para uma casa com animais de quintal avança sem a equipa testar o cão primeiro. Diga-lhes sempre que os tem.',
    redo: 'Refazer o questionário', seeWaiting: 'Ver quem espera há mais tempo', howAdopt: 'Como funciona a adoção →',
    waitingEyebrow: 'Os que ninguém pediu',
    waitingTitle: (m: 'espera' | 'idade'): string => (m === 'espera' ? 'Quem espera há mais tempo' : 'Os mais idosos do abrigo'),
    waitingIntro: (m: 'espera' | 'idade', ten: number, seniors: number, pool: number) => m === 'espera'
      ? `São ${ten} os cães que esperam há dez anos ou mais. Alguns chegaram em bebés e nunca conheceram outra casa. Não são difíceis: são apenas os que ninguém pediu.`
      : `${seniors} dos ${pool} cães têm dez anos ou mais. Um cão idoso já vem com a personalidade formada, pede pouco e devolve tudo, e é quem tem menos tempo para esperar.`,
    tabWait: 'Há mais tempo à espera', tabAge: 'Os mais idosos',
    tie: 'As fichas registam só o ano de entrada, por isso quem entrou no mesmo ano fica empatado.',
    pending: (n: number, names: string) => ` E há ${n} cães com a ficha ainda incompleta (${names}) que podem estar à espera há tanto tempo como estes.`,
    doQuiz: 'Fazer o questionário',
    eyebrow: 'Encontra o teu patudo',
    h1a: 'Qual destes cães ', h1b: 'combina consigo?',
    lede: 'Quatro etapas sobre a sua casa, a sua rotina e o que procura. No fim mostramos os cães do abrigo que encaixam melhor, e explicamos porquê.',
    waitingCount: 'cães à espera de família', orWaiting: 'Ou veja quem espera há mais tempo →',
    step: (i: number, n: number) => `Etapa ${i} de ${n}`, result: 'Resultado',
    disclaimerStrong: 'Isto é uma sugestão, não uma decisão.',
    disclaimer: ' As fichas dizem muito, mas não dizem tudo: quem conhece cada cão é a equipa do abrigo. O resultado serve para começar a conversa e marcar uma visita, porque é no encontro que se vê se há ligação. Parte dos dados de temperamento ainda está a ser confirmada pela equipa. A compatibilidade com crianças, com outros animais e com aves de quintal é sempre confirmada pela equipa, caso a caso.',
  },
  en: {
    years: (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`,
    female: 'Female', male: 'Male', since: (y: number) => `at the shelter since ${y}`,
    askMore: (ref: string) => `I'd like to know more about ${ref}`, viewProfile: 'View profile →',
    sponsor: ' Has a sponsor.',
    waitingUnit: (n: number): string => (n === 1 ? 'year waiting' : 'years waiting'),
    ageUnit: (n: number): string => (n === 1 ? 'year old' : 'years old'),
    baby: 'Arrived as a puppy',
    contactEyebrow: 'Contact CAPA',
    inquiryTitle: (ref: string) => `Ask about ${ref}`,
    inquiryIntro: (fromQuiz: boolean) => `Fill in your details. We put the message together${fromQuiz ? ' with your answers' : ''}; send it by email or copy it into a message. The team will reply and arrange a visit.`,
    fName: 'Name', fAge: 'Your age', fPhone: 'Phone', fEmail: 'Email', fPlace: 'Location (parish and municipality)', fObs: 'Anything you would like to add',
    minor: 'Adopters must be 18 or older. You can make the request with an adult in your family, and you are welcome to visit the shelter and volunteer.',
    privacy: 'Your details are only used for CAPA to answer this request. They are not stored on this page or shared with anyone else.',
    sendEmail: 'Send by email', copy: 'Copy message',
    copied: 'Copied. Paste it into an email or a message to CAPA.', copyFail: 'Could not copy automatically. Select the text and copy it.',
    emailLine: 'Email', social: 'You can also message us on Instagram or Facebook, @capapvl.',
    subject: (n: string) => `Adoption: ${n}`,
    fill: '(to fill in)',
    shortMsg: (ref: string, c: Contact) => `Hello CAPA team,\n\nI would like to know more about ${ref}.\n\n- Name: ${c.nome || '(to fill in)'}\n- Age: ${c.idade || '(to fill in)'}\n- Phone: ${c.tel || '(to fill in)'}\n- Email: ${c.email || '(to fill in)'}\n- Location: ${c.local || '(to fill in)'}\n${c.obs.trim() ? `\n${c.obs.trim()}\n` : ''}\nCould you tell me the next step to meet ${ref}?\n\nThank you.`,
    back: 'Back', next: 'Continue', seeDogs: 'See the dogs',
    missing: (n: number): string => (n === 1 ? '1 answer missing' : `${n} answers missing`),
    resultEyebrow: 'Your result',
    resultTitle: (n: number): string => (n === 1 ? 'One dog could fit your home' : `These ${n} dogs could fit your home`),
    resultSub: (pool: number, all: number) => `Of ${pool} dogs with a profile, ${all} are compatible with what you described. These came closest.`,
    kidsNote: 'You said there are children at home. The profiles do not record tests with children, so the team always confirms this before any adoption.',
    farmNote: 'You said you keep poultry or livestock. This is decisive: dogs have been returned to the shelter for attacking chickens. No adoption into a home with farm animals goes ahead without the team testing the dog first. Always tell them you have them.',
    redo: 'Retake the quiz', seeWaiting: 'See who has waited longest', howAdopt: 'How adoption works →',
    waitingEyebrow: 'The ones nobody asked for',
    waitingTitle: (m: 'espera' | 'idade'): string => (m === 'espera' ? 'Who has waited longest' : 'The oldest dogs at the shelter'),
    waitingIntro: (m: 'espera' | 'idade', ten: number, seniors: number, pool: number) => m === 'espera'
      ? `${ten} dogs have waited ten years or more. Some arrived as puppies and have never known another home. They are not difficult: they are just the ones nobody asked for.`
      : `${seniors} of the ${pool} dogs are ten or older. An older dog comes with its personality formed, asks for little and gives everything back, and has the least time left to wait.`,
    tabWait: 'Waiting longest', tabAge: 'Oldest',
    tie: 'The profiles only record the year of arrival, so dogs that arrived in the same year are tied.',
    pending: (n: number, names: string) => ` There are also ${n} dogs with incomplete profiles (${names}) who may have waited just as long.`,
    doQuiz: 'Take the quiz',
    eyebrow: 'Find your match',
    h1a: 'Which of these dogs ', h1b: 'suits you?',
    lede: 'Four steps about your home, your routine and what you are looking for. At the end we show the shelter dogs that fit best, and explain why.',
    waitingCount: 'dogs waiting for a family', orWaiting: 'Or see who has waited longest →',
    step: (i: number, n: number) => `Step ${i} of ${n}`, result: 'Result',
    disclaimerStrong: 'This is a suggestion, not a decision.',
    disclaimer: ' The profiles say a lot, but not everything: the shelter team knows each dog. The result is a starting point for a conversation and a visit, because meeting is how you find out if there is a connection. Some temperament details are still being confirmed by the team. Compatibility with children, other animals and poultry is always confirmed by the team, case by case.',
  },
};

type View = { kind: 'quiz'; step: number } | { kind: 'results' } | { kind: 'waiting'; mode: 'espera' | 'idade' };

const card = 'rounded-[2rem] border border-playful-line bg-white/90 p-6 shadow-pillowy sm:p-8';
const primaryBtn = 'squishy playful-focus inline-flex items-center justify-center gap-2 rounded-full bg-playful-orange px-6 py-3 font-playful-display text-sm font-extrabold text-white shadow-squish disabled:cursor-not-allowed disabled:opacity-45';
const ghostBtn = 'playful-focus inline-flex items-center justify-center rounded-full border-2 border-playful-line bg-white px-5 py-2.5 text-sm font-extrabold text-playful-orange-dark shadow-sm hover:bg-playful-peach';

const sexOf = (d: MatchDog) => (d.sexo === 'F' ? 'female' : 'male');
const dogPath = (d: MatchDog, locale: MatchLocale) => (locale === 'en' ? `/en/dog?id=${d.id}` : `/cao?id=${d.id}`);
const refFor = (d: MatchDog, locale: MatchLocale) => (locale === 'en' ? d.nome : withArticle(d.nome, sexOf(d)));

function meta(d: MatchDog, L: typeof UI.pt, locale: MatchLocale) {
  const a = ageOf(d, YEAR);
  return [
    a !== null ? L.years(a) : null,
    (locale === 'en' ? PORTE_TXT_EN : PORTE_TXT)[d.porte],
    d.raca || null,
    d.sexo === 'F' ? L.female : L.male,
    d.desde ? L.since(d.desde) : null,
  ].filter(Boolean).join(' · ');
}

function QuestionField({ q, answers, set }: { q: Question; answers: Answers; set: (a: Answers) => void }) {
  const current = answers[q.id];
  return (
    <fieldset className="border-t border-playful-line pt-5 first:border-t-0 first:pt-0">
      <legend className="font-extrabold text-playful-ink">{q.title}</legend>
      {q.help && <p className="mt-1 text-sm font-medium text-playful-muted">{q.help}</p>}
      {q.text ? (
        <textarea
          rows={2}
          value={(current as string) ?? ''}
          placeholder={q.placeholder}
          onChange={(e) => set({ ...answers, [q.id]: e.target.value })}
          className="mt-3 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm"
        />
      ) : (
        <div className={`mt-3 flex gap-2 ${q.inline ? 'flex-row flex-wrap' : 'flex-col'}`}>
          {q.options!.map((opt) => {
            const checked = q.multi ? ((current as string[]) ?? []).includes(opt.value) : current === opt.value;
            const toggle = () => {
              if (!q.multi) return set({ ...answers, [q.id]: opt.value });
              const list = (current as string[]) ?? [];
              let next = checked ? list.filter((v) => v !== opt.value) : [...list, opt.value];
              if (!checked) next = opt.value === 'nenhum' ? ['nenhum'] : next.filter((v) => v !== 'nenhum');
              set({ ...answers, [q.id]: next });
            };
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 border-2 px-4 py-3 transition-colors ${q.inline ? 'rounded-full' : 'rounded-[1.2rem]'} ${checked ? 'border-playful-orange bg-playful-peach/60' : 'border-playful-line bg-white hover:bg-playful-canvas'}`}
              >
                <input
                  type={q.multi ? 'checkbox' : 'radio'}
                  name={q.id}
                  value={opt.value}
                  checked={checked}
                  onChange={toggle}
                  className={q.inline ? 'sr-only' : 'mt-1 h-4 w-4 accent-[var(--color-playful-orange)]'}
                />
                <span>
                  <span className="font-bold text-playful-ink">{opt.label}</span>
                  {opt.sub && <span className="block text-sm font-medium text-playful-muted">{opt.sub}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

function DogCardHead({ d, right, L, locale }: { d: MatchDog; right: React.ReactNode; L: typeof UI.pt; locale: MatchLocale }) {
  return (
    <div className="flex items-start gap-4">
      {d.foto ? (
        <img src={d.foto} alt="" className="h-20 w-20 flex-none rounded-[1.2rem] border-4 border-playful-cream object-cover" />
      ) : (
        <div className="flex h-20 w-20 flex-none items-center justify-center rounded-[1.2rem] bg-playful-cream text-3xl" aria-hidden="true">🐾</div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-playful-display text-2xl font-extrabold tracking-[-0.03em] text-playful-orange-dark">{d.nome}</h3>
        <p className="mt-1 text-sm font-semibold text-playful-muted">{meta(d, L, locale)}</p>
        {d.acolhimento && (
          <span className="mt-2 inline-block rounded-full bg-playful-peach px-3 py-1 text-xs font-extrabold text-playful-orange-dark">
            🏡 {fosterLabel(d.acolhimento, sexOf(d), locale)}
          </span>
        )}
      </div>
      <div className="flex-none text-right">{right}</div>
    </div>
  );
}

function Chips({ items, tone }: { items: string[]; tone: 'good' | 'warn' }) {
  if (!items.length) return null;
  const cls = tone === 'good' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-amber-50 text-amber-900 border-amber-200';
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span key={t} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${cls}`}>{t}</span>
      ))}
    </div>
  );
}

function DogActions({ d, onAsk, L, locale }: { d: MatchDog; onAsk: (d: MatchDog) => void; L: typeof UI.pt; locale: MatchLocale }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={primaryBtn} onClick={() => onAsk(d)} data-match-ask>
        {L.askMore(refFor(d, locale))}
      </button>
      <a href={dogPath(d, locale)} className="playful-focus text-sm font-extrabold text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4">
        {L.viewProfile}
      </a>
    </div>
  );
}

function ResultCard({ r, onAsk, L, locale }: { r: MatchResult; onAsk: (d: MatchDog) => void; L: typeof UI.pt; locale: MatchLocale }) {
  const d = r.d;
  const [, label, bars] = levelFor(r.score, locale);
  return (
    <article className={`${card} space-y-4`} data-match-result>
      <DogCardHead
        d={d}
        L={L}
        locale={locale}
        right={
          <>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-playful-orange-dark">{label}</p>
            <div className="mt-2 flex justify-end gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1.5 w-4 rounded-full ${i <= bars ? 'bg-playful-orange' : 'bg-playful-line'}`} />
              ))}
            </div>
          </>
        }
      />
      {d.personalidade && <p className="font-playful-display text-lg font-bold italic text-playful-ink">“{d.personalidade}”</p>}
      <Chips items={r.good} tone="good" />
      <Chips items={r.warn} tone="warn" />
      {d.historia && <p className="border-l-4 border-playful-peach pl-4 text-sm font-medium leading-7 text-playful-muted">{d.historia}</p>}
      {d.saude && <p className="text-xs font-semibold text-playful-muted/80">{d.saude}.{d.padrinho ? L.sponsor : ''}</p>}
      <DogActions d={d} onAsk={onAsk} L={L} locale={locale} />
    </article>
  );
}

function WaitingCard({ d, mode, onAsk, L, locale }: { d: MatchDog; mode: 'espera' | 'idade'; onAsk: (d: MatchDog) => void; L: typeof UI.pt; locale: MatchLocale }) {
  const n = mode === 'espera' ? yearsWaiting(d, YEAR) : ageOf(d, YEAR);
  const unit = mode === 'espera' ? L.waitingUnit(n ?? 0) : L.ageUnit(n ?? 0);
  const baby = d.nasc && d.desde && d.nasc >= d.desde - 1;
  return (
    <article className={`${card} space-y-4`} data-match-waiting>
      <DogCardHead
        d={d}
        L={L}
        locale={locale}
        right={
          <>
            <span className="block font-playful-display text-3xl font-extrabold leading-none text-playful-orange">{n}</span>
            <span className="mt-1 block text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-playful-muted">{unit}</span>
          </>
        }
      />
      {baby && <span className="inline-block rounded-full bg-playful-peach px-3 py-1 text-xs font-extrabold text-playful-orange-dark">{L.baby}</span>}
      {d.personalidade && <p className="font-playful-display text-lg font-bold italic text-playful-ink">“{d.personalidade}”</p>}
      {d.nota && <Chips items={[d.nota]} tone="warn" />}
      {d.historia && <p className="border-l-4 border-playful-peach pl-4 text-sm font-medium leading-7 text-playful-muted">{d.historia}</p>}
      <DogActions d={d} onAsk={onAsk} L={L} locale={locale} />
    </article>
  );
}

function Inquiry({ d, answers, fromQuiz, L, locale }: { d: MatchDog; answers: Answers; fromQuiz: boolean; L: typeof UI.pt; locale: MatchLocale }) {
  const [c, setC] = useState<Contact>({ nome: '', idade: '', tel: '', email: '', local: '', obs: '' });
  const [copied, setCopied] = useState('');
  const ref = refFor(d, locale);
  const message = fromQuiz
    ? (locale === 'en' ? buildMessageEn(ref, answers, c) : buildMessage(ref, answers, c))
    : L.shortMsg(ref, c);
  const minor = c.idade.trim() !== '' && Number(c.idade) < 18;
  const mailto = `mailto:${SHELTER_EMAIL}?subject=${encodeURIComponent(L.subject(d.nome))}&body=${encodeURIComponent(message)}`;
  const input = 'mt-2 w-full rounded-[1.2rem] border border-playful-line bg-white px-4 py-3 text-base font-semibold text-playful-ink shadow-sm';
  const field = (key: keyof Contact, label: string, type = 'text', autoComplete?: string) => (
    <label className="block text-sm font-extrabold text-playful-orange-dark">
      {label}
      <input type={type} value={c[key]} autoComplete={autoComplete} onChange={(e) => setC({ ...c, [key]: e.target.value })} className={input} />
    </label>
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(L.copied);
    } catch {
      setCopied(L.copyFail);
    }
  }

  return (
    <section className={`${card} space-y-5`} id="pedido" data-match-inquiry>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{L.contactEyebrow}</p>
        <h2 className="mt-2 font-playful-display text-3xl font-extrabold tracking-[-0.03em] text-playful-orange-dark">{L.inquiryTitle(ref)}</h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-playful-muted">
          {L.inquiryIntro(fromQuiz)}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('nome', L.fName, 'text', 'name')}
        {field('idade', L.fAge, 'number')}
        {field('tel', L.fPhone, 'tel', 'tel')}
        {field('email', L.fEmail, 'email', 'email')}
      </div>
      {field('local', L.fPlace)}
      <label className="block text-sm font-extrabold text-playful-orange-dark">
        {L.fObs}
        <textarea rows={3} value={c.obs} onChange={(e) => setC({ ...c, obs: e.target.value })} className={input} />
      </label>
      {minor && (
        <p className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
          {L.minor}
        </p>
      )}
      <p className="text-xs font-semibold text-playful-muted">
        {L.privacy}
      </p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-[1.25rem] border border-playful-line bg-playful-canvas p-4 font-sans text-sm leading-6 text-playful-ink" data-match-message>
        {message}
      </pre>
      <div className="flex flex-wrap items-center gap-3">
        <a href={mailto} className={primaryBtn} data-match-mailto>{L.sendEmail}</a>
        <button type="button" onClick={copy} className={ghostBtn}>{L.copy}</button>
        {copied && <span className="text-sm font-bold text-green-800" aria-live="polite">{copied}</span>}
      </div>
      <p className="text-sm font-semibold text-playful-muted">
        {L.emailLine} <span className="select-all font-extrabold text-playful-ink">{SHELTER_EMAIL}</span>. {L.social}
      </p>
    </section>
  );
}

export default function MatchQuiz({ locale = 'pt' }: { locale?: Locale }) {
  const L = UI[locale];
  const STEPS = stepsFor(locale);
  const adoptPath = locale === 'en' ? '/en/adopt' : '/adocao';
  const [dogs, setDogs] = useState<Dog[]>(capaDogs);
  const [answers, setAnswers] = useState<Answers>({});
  const [view, setView] = useState<View>({ kind: 'quiz', step: 0 });
  const [asking, setAsking] = useState<{ d: MatchDog; fromQuiz: boolean } | null>(null);

  useEffect(() => {
    if (!capaApi) return;
    capaApi.getDogs(false).then((data) => { if (data.length) setDogs(data); }).catch(() => undefined);
  }, []);

  const pool = useMemo(() => dogs.map(toMatchDog).filter((d): d is MatchDog => d !== null), [dogs]);
  const pending = useMemo(() => dogs.filter((d) => !d.is_adopted && !toMatchDog(d)).map((d) => d.name), [dogs]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  useEffect(() => {
    if (asking) document.getElementById('pedido')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [asking]);

  const ask = (fromQuiz: boolean) => (d: MatchDog) => setAsking({ d, fromQuiz });

  let body: React.ReactNode;
  if (view.kind === 'quiz') {
    const step = STEPS[view.step];
    const missing = step.questions.filter((q) => !q.text && (q.multi ? !(answers[q.id] as string[] | undefined)?.length : !answers[q.id])).length;
    const last = view.step === STEPS.length - 1;
    body = (
      <section className={`${card} space-y-6`} data-match-step={view.step + 1}>
        <div>
          <h2 className="font-playful-display text-3xl font-extrabold tracking-[-0.03em] text-playful-orange-dark">{step.title}</h2>
          <p className="mt-1 font-semibold text-playful-muted">{step.sub}</p>
        </div>
        {step.questions.map((q) => <QuestionField key={q.id} q={q} answers={answers} set={setAnswers} />)}
        <div className="flex flex-wrap items-center gap-3 border-t border-playful-line pt-5">
          {view.step > 0 && <button type="button" className={ghostBtn} onClick={() => setView({ kind: 'quiz', step: view.step - 1 })}>{L.back}</button>}
          <button
            type="button"
            className={primaryBtn}
            disabled={missing > 0}
            data-match-next
            onClick={() => { setAsking(null); setView(last ? { kind: 'results' } : { kind: 'quiz', step: view.step + 1 }); }}
          >
            {last ? L.seeDogs : L.next}
          </button>
          {missing > 0 && <span className="text-sm font-semibold text-playful-muted">{L.missing(missing)}</span>}
        </div>
      </section>
    );
  } else if (view.kind === 'results') {
    const { all, shown } = rankDogs(pool, answers, YEAR, locale);
    const notes = conflicts(answers, locale);
    body = (
      <div className="space-y-6" data-match-results>
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{L.resultEyebrow}</p>
          <h2 className="font-playful-display text-4xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">
            {L.resultTitle(shown.length)}
          </h2>
          <p className="font-semibold text-playful-muted">{L.resultSub(pool.length, all.length)}</p>
          {answers.criancas !== 'nenhuma' && (
            <p className="rounded-[1.25rem] bg-white/85 px-4 py-3 text-sm font-semibold leading-6 text-playful-muted">
              {L.kidsNote}
            </p>
          )}
          {(answers.animais ?? []).includes('quinta') && (
            <p className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
              {L.farmNote}
            </p>
          )}
          {notes.map((n) => (
            <p key={n} className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">{n}</p>
          ))}
        </div>
        {shown.map((r) => <ResultCard key={r.d.id} r={r} onAsk={ask(true)} L={L} locale={locale} />)}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={ghostBtn} onClick={() => { setAsking(null); setView({ kind: 'quiz', step: 0 }); }}>{L.redo}</button>
          <button type="button" className={ghostBtn} onClick={() => { setAsking(null); setView({ kind: 'waiting', mode: 'espera' }); }}>{L.seeWaiting}</button>
          <a href={adoptPath} className="playful-focus text-sm font-extrabold text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4">{L.howAdopt}</a>
        </div>
        {asking && <Inquiry d={asking.d} answers={answers} fromQuiz={asking.fromQuiz} L={L} locale={locale} />}
      </div>
    );
  } else {
    const mode = view.mode;
    const list = mode === 'espera'
      ? pool.filter((d) => yearsWaiting(d, YEAR) !== null).sort((a, b) => yearsWaiting(b, YEAR)! - yearsWaiting(a, YEAR)! || a.nome.localeCompare(b.nome, 'pt')).slice(0, 12)
      : pool.filter((d) => (ageOf(d, YEAR) ?? 0) >= 10).sort((a, b) => ageOf(b, YEAR)! - ageOf(a, YEAR)! || a.nome.localeCompare(b.nome, 'pt')).slice(0, 12);
    const tenYears = pool.filter((d) => (yearsWaiting(d, YEAR) ?? 0) >= 10).length;
    const seniors = pool.filter((d) => (ageOf(d, YEAR) ?? 0) >= 10).length;
    const answered = STEPS.every((s) => s.questions.every((q) => q.text || (q.multi ? (answers[q.id] as string[] | undefined)?.length : answers[q.id])));
    body = (
      <div className="space-y-6" data-match-waiting-view>
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">{L.waitingEyebrow}</p>
          <h2 className="font-playful-display text-4xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">{L.waitingTitle(mode)}</h2>
          <p className="font-semibold leading-7 text-playful-muted">
            {L.waitingIntro(mode, tenYears, seniors, pool.length)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['espera', 'idade'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => { setAsking(null); setView({ kind: 'waiting', mode: m }); }}
              className={`playful-focus rounded-full px-5 py-2.5 text-sm font-extrabold ${mode === m ? 'bg-playful-orange-dark text-white shadow-squish' : 'border border-playful-line bg-white text-playful-muted shadow-sm'}`}
            >
              {m === 'espera' ? L.tabWait : L.tabAge}
            </button>
          ))}
        </div>
        {list.map((d) => <WaitingCard key={d.id} d={d} mode={mode} onAsk={ask(answered)} L={L} locale={locale} />)}
        <p className="text-xs font-semibold leading-6 text-playful-muted">
          {L.tie}
          {pending.length ? L.pending(pending.length, pending.join(', ')) : ''}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primaryBtn} onClick={() => { setAsking(null); setView({ kind: 'quiz', step: 0 }); }}>{L.doQuiz}</button>
          <a href={adoptPath} className="playful-focus text-sm font-extrabold text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4">{L.howAdopt}</a>
        </div>
        {asking && <Inquiry d={asking.d} answers={answers} fromQuiz={asking.fromQuiz} L={L} locale={locale} />}
      </div>
    );
  }

  const progress = view.kind === 'quiz' ? ((view.step + 1) / STEPS.length) * 100 : 100;

  return (
    <div className="relative mx-auto max-w-3xl space-y-8" data-match-quiz>
      <header className="space-y-4 text-center sm:text-left">
        <p className="inline-flex -rotate-2 items-center gap-2 rounded-full border border-playful-line bg-playful-peach px-5 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-playful-orange-dark shadow-pillowy">
          <span aria-hidden="true">🐾</span> {L.eyebrow}
        </p>
        <h1 className="font-playful-display text-5xl font-extrabold leading-[0.95] tracking-[-0.06em] text-playful-ink sm:text-6xl">
          {L.h1a}<span className="text-playful-orange">{L.h1b}</span>
        </h1>
        <p className="text-lg font-medium leading-8 text-playful-muted">
          {L.lede}
        </p>
        <p className="font-semibold text-playful-muted">
          <span className="font-playful-display text-2xl font-extrabold text-playful-orange-dark">{pool.length}</span> {L.waitingCount}
          {view.kind === 'quiz' && (
            <>
              {' · '}
              <button type="button" className="playful-focus font-extrabold text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4" onClick={() => setView({ kind: 'waiting', mode: 'espera' })}>
                {L.orWaiting}
              </button>
            </>
          )}
        </p>
      </header>

      {view.kind !== 'waiting' && (
        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-playful-line">
            <div className="h-full rounded-full bg-playful-orange transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-extrabold text-playful-muted">{view.kind === 'quiz' ? L.step(view.step + 1, STEPS.length) : L.result}</span>
        </div>
      )}

      {body}

      <section className="rounded-[2rem] border-2 border-dashed border-playful-line bg-white/70 p-6 text-sm font-semibold leading-7 text-playful-muted">
        <strong className="text-playful-ink">{L.disclaimerStrong}</strong>{L.disclaimer}
      </section>
    </div>
  );
}
