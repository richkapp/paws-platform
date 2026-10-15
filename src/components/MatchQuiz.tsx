import { useEffect, useMemo, useState } from 'react';
import { capaDogs } from '../data/capaDogs';
import { capaApi, type Dog } from '../lib/capaApi';
import { SHELTER_EMAIL } from '../lib/capaContact';
import { fosterLabel, withArticle } from '../lib/dogFacts';
import {
  PORTE_TXT,
  STEPS,
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
type View = { kind: 'quiz'; step: number } | { kind: 'results' } | { kind: 'waiting'; mode: 'espera' | 'idade' };

const card = 'rounded-[2rem] border border-playful-line bg-white/90 p-6 shadow-pillowy sm:p-8';
const primaryBtn = 'squishy playful-focus inline-flex items-center justify-center gap-2 rounded-full bg-playful-orange px-6 py-3 font-playful-display text-sm font-extrabold text-white shadow-squish disabled:cursor-not-allowed disabled:opacity-45';
const ghostBtn = 'playful-focus inline-flex items-center justify-center rounded-full border-2 border-playful-line bg-white px-5 py-2.5 text-sm font-extrabold text-playful-orange-dark shadow-sm hover:bg-playful-peach';

const sexOf = (d: MatchDog) => (d.sexo === 'F' ? 'female' : 'male');
const dogPath = (d: MatchDog) => `/cao?id=${d.id}`;

function meta(d: MatchDog, withSince = true) {
  const a = ageOf(d, YEAR);
  return [
    a !== null ? `${a} ${a === 1 ? 'ano' : 'anos'}` : null,
    PORTE_TXT[d.porte],
    d.raca || null,
    d.sexo === 'F' ? 'Fêmea' : 'Macho',
    withSince && d.desde ? `no abrigo desde ${d.desde}` : null,
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

function DogCardHead({ d, right }: { d: MatchDog; right: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      {d.foto ? (
        <img src={d.foto} alt="" className="h-20 w-20 flex-none rounded-[1.2rem] border-4 border-playful-cream object-cover" />
      ) : (
        <div className="flex h-20 w-20 flex-none items-center justify-center rounded-[1.2rem] bg-playful-cream text-3xl" aria-hidden="true">🐾</div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-playful-display text-2xl font-extrabold tracking-[-0.03em] text-playful-orange-dark">{d.nome}</h3>
        <p className="mt-1 text-sm font-semibold text-playful-muted">{meta(d)}</p>
        {d.acolhimento && (
          <span className="mt-2 inline-block rounded-full bg-playful-peach px-3 py-1 text-xs font-extrabold text-playful-orange-dark">
            🏡 {fosterLabel(d.acolhimento, sexOf(d), 'pt')}
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

function DogActions({ d, onAsk }: { d: MatchDog; onAsk: (d: MatchDog) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={primaryBtn} onClick={() => onAsk(d)} data-match-ask>
        Quero saber mais sobre {withArticle(d.nome, sexOf(d))}
      </button>
      <a href={dogPath(d)} className="playful-focus text-sm font-extrabold text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4">
        Ver o perfil →
      </a>
    </div>
  );
}

function ResultCard({ r, onAsk }: { r: MatchResult; onAsk: (d: MatchDog) => void }) {
  const d = r.d;
  const [, label, bars] = levelFor(r.score);
  return (
    <article className={`${card} space-y-4`} data-match-result>
      <DogCardHead
        d={d}
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
      {d.saude && <p className="text-xs font-semibold text-playful-muted/80">{d.saude}.{d.padrinho ? ' Tem padrinho ou madrinha.' : ''}</p>}
      <DogActions d={d} onAsk={onAsk} />
    </article>
  );
}

function WaitingCard({ d, mode, onAsk }: { d: MatchDog; mode: 'espera' | 'idade'; onAsk: (d: MatchDog) => void }) {
  const n = mode === 'espera' ? yearsWaiting(d, YEAR) : ageOf(d, YEAR);
  const unit = mode === 'espera' ? (n === 1 ? 'ano à espera' : 'anos à espera') : n === 1 ? 'ano de idade' : 'anos de idade';
  const baby = d.nasc && d.desde && d.nasc >= d.desde - 1;
  return (
    <article className={`${card} space-y-4`} data-match-waiting>
      <DogCardHead
        d={d}
        right={
          <>
            <span className="block font-playful-display text-3xl font-extrabold leading-none text-playful-orange">{n}</span>
            <span className="mt-1 block text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-playful-muted">{unit}</span>
          </>
        }
      />
      {baby && <span className="inline-block rounded-full bg-playful-peach px-3 py-1 text-xs font-extrabold text-playful-orange-dark">Chegou ainda bebé</span>}
      {d.personalidade && <p className="font-playful-display text-lg font-bold italic text-playful-ink">“{d.personalidade}”</p>}
      {d.nota && <Chips items={[d.nota]} tone="warn" />}
      {d.historia && <p className="border-l-4 border-playful-peach pl-4 text-sm font-medium leading-7 text-playful-muted">{d.historia}</p>}
      <DogActions d={d} onAsk={onAsk} />
    </article>
  );
}

function Inquiry({ d, answers, fromQuiz }: { d: MatchDog; answers: Answers; fromQuiz: boolean }) {
  const [c, setC] = useState<Contact>({ nome: '', idade: '', tel: '', email: '', local: '', obs: '' });
  const [copied, setCopied] = useState('');
  const ref = withArticle(d.nome, sexOf(d));
  const message = fromQuiz
    ? buildMessage(ref, answers, c)
    : `Olá, equipa da CAPA.\n\nGostaria de saber mais sobre ${ref}.\n\n- Nome: ${c.nome || '(preencher)'}\n- Idade: ${c.idade || '(preencher)'}\n- Telefone: ${c.tel || '(preencher)'}\n- Email: ${c.email || '(preencher)'}\n- Localidade: ${c.local || '(preencher)'}\n${c.obs.trim() ? `\n${c.obs.trim()}\n` : ''}\nPodem dizer-me qual é o próximo passo para conhecer ${ref}?\n\nObrigado.`;
  const minor = c.idade.trim() !== '' && Number(c.idade) < 18;
  const mailto = `mailto:${SHELTER_EMAIL}?subject=${encodeURIComponent(`Adoção: ${d.nome}`)}&body=${encodeURIComponent(message)}`;
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
      setCopied('Copiada. Cole no email ou numa mensagem para a CAPA.');
    } catch {
      setCopied('Não foi possível copiar automaticamente. Selecione o texto e copie.');
    }
  }

  return (
    <section className={`${card} space-y-5`} id="pedido" data-match-inquiry>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">Falar com a CAPA</p>
        <h2 className="mt-2 font-playful-display text-3xl font-extrabold tracking-[-0.03em] text-playful-orange-dark">Pedido de informações sobre {ref}</h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-playful-muted">
          Preencha os seus dados. Montamos a mensagem{fromQuiz ? ' com as suas respostas' : ''}; envie-a por email ou copie-a para uma mensagem. A equipa responde e marca a visita.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('nome', 'Nome', 'text', 'name')}
        {field('idade', 'A sua idade', 'number')}
        {field('tel', 'Telefone', 'tel', 'tel')}
        {field('email', 'Email', 'email', 'email')}
      </div>
      {field('local', 'Localidade (freguesia e concelho)')}
      <label className="block text-sm font-extrabold text-playful-orange-dark">
        Algo que queira acrescentar
        <textarea rows={3} value={c.obs} onChange={(e) => setC({ ...c, obs: e.target.value })} className={input} />
      </label>
      {minor && (
        <p className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
          A adoção tem de ser feita por alguém com 18 anos ou mais. Pode fazer o pedido com um adulto da família, e são bem-vindos a visitar o abrigo e a ser voluntários.
        </p>
      )}
      <p className="text-xs font-semibold text-playful-muted">
        Os dados servem apenas para a CAPA responder a este pedido. Não são guardados nesta página nem partilhados com terceiros.
      </p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-[1.25rem] border border-playful-line bg-playful-canvas p-4 font-sans text-sm leading-6 text-playful-ink" data-match-message>
        {message}
      </pre>
      <div className="flex flex-wrap items-center gap-3">
        <a href={mailto} className={primaryBtn} data-match-mailto>Enviar por email</a>
        <button type="button" onClick={copy} className={ghostBtn}>Copiar mensagem</button>
        {copied && <span className="text-sm font-bold text-green-800" aria-live="polite">{copied}</span>}
      </div>
      <p className="text-sm font-semibold text-playful-muted">
        Email <span className="select-all font-extrabold text-playful-ink">{SHELTER_EMAIL}</span>. Também pode enviar mensagem no Instagram ou no Facebook, @capapvl.
      </p>
    </section>
  );
}

export default function MatchQuiz() {
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
          {view.step > 0 && <button type="button" className={ghostBtn} onClick={() => setView({ kind: 'quiz', step: view.step - 1 })}>Anterior</button>}
          <button
            type="button"
            className={primaryBtn}
            disabled={missing > 0}
            data-match-next
            onClick={() => { setAsking(null); setView(last ? { kind: 'results' } : { kind: 'quiz', step: view.step + 1 }); }}
          >
            {last ? 'Ver os cães' : 'Continuar'}
          </button>
          {missing > 0 && <span className="text-sm font-semibold text-playful-muted">{missing === 1 ? 'Falta 1 resposta' : `Faltam ${missing} respostas`}</span>}
        </div>
      </section>
    );
  } else if (view.kind === 'results') {
    const { all, shown } = rankDogs(pool, answers, YEAR);
    const notes = conflicts(answers);
    body = (
      <div className="space-y-6" data-match-results>
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">O seu resultado</p>
          <h2 className="font-playful-display text-4xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">
            {shown.length === 1 ? 'Há um cão que pode encaixar na sua casa' : `Estes ${shown.length} cães podem encaixar na sua casa`}
          </h2>
          <p className="font-semibold text-playful-muted">De {pool.length} cães com ficha, {all.length} são compatíveis com o que descreveu. Estes são os que ficaram mais perto.</p>
          {answers.criancas !== 'nenhuma' && (
            <p className="rounded-[1.25rem] bg-white/85 px-4 py-3 text-sm font-semibold leading-6 text-playful-muted">
              Indicou que há crianças em casa. As fichas não registam testes com crianças, por isso esta parte é sempre confirmada pela equipa antes de qualquer adoção.
            </p>
          )}
          {(answers.animais ?? []).includes('quinta') && (
            <p className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
              Indicou que tem aves ou gado. Isto é decisivo: já houve cães devolvidos ao abrigo por atacarem galinhas. Nenhuma adoção para uma casa com animais de quintal avança sem a equipa testar o cão primeiro. Diga-lhes sempre que os tem.
            </p>
          )}
          {notes.map((n) => (
            <p key={n} className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">{n}</p>
          ))}
        </div>
        {shown.map((r) => <ResultCard key={r.d.id} r={r} onAsk={ask(true)} />)}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={ghostBtn} onClick={() => { setAsking(null); setView({ kind: 'quiz', step: 0 }); }}>Refazer o questionário</button>
          <button type="button" className={ghostBtn} onClick={() => { setAsking(null); setView({ kind: 'waiting', mode: 'espera' }); }}>Ver quem espera há mais tempo</button>
          <a href="/adocao" className="playful-focus text-sm font-extrabold text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4">Como funciona a adoção →</a>
        </div>
        {asking && <Inquiry d={asking.d} answers={answers} fromQuiz={asking.fromQuiz} />}
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
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-playful-orange-dark">Os que ninguém pediu</p>
          <h2 className="font-playful-display text-4xl font-extrabold tracking-[-0.04em] text-playful-orange-dark">{mode === 'espera' ? 'Quem espera há mais tempo' : 'Os mais idosos do abrigo'}</h2>
          <p className="font-semibold leading-7 text-playful-muted">
            {mode === 'espera'
              ? `São ${tenYears} os cães que esperam há dez anos ou mais. Alguns chegaram em bebés e nunca conheceram outra casa. Não são difíceis: são apenas os que ninguém pediu.`
              : `${seniors} dos ${pool.length} cães têm dez anos ou mais. Um cão idoso já vem com a personalidade formada, pede pouco e devolve tudo, e é quem tem menos tempo para esperar.`}
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
              {m === 'espera' ? 'Há mais tempo à espera' : 'Os mais idosos'}
            </button>
          ))}
        </div>
        {list.map((d) => <WaitingCard key={d.id} d={d} mode={mode} onAsk={ask(answered)} />)}
        <p className="text-xs font-semibold leading-6 text-playful-muted">
          As fichas registam só o ano de entrada, por isso quem entrou no mesmo ano fica empatado.
          {pending.length ? ` E há ${pending.length} cães com a ficha ainda incompleta (${pending.join(', ')}) que podem estar à espera há tanto tempo como estes.` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primaryBtn} onClick={() => { setAsking(null); setView({ kind: 'quiz', step: 0 }); }}>Fazer o questionário</button>
          <a href="/adocao" className="playful-focus text-sm font-extrabold text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4">Como funciona a adoção →</a>
        </div>
        {asking && <Inquiry d={asking.d} answers={answers} fromQuiz={asking.fromQuiz} />}
      </div>
    );
  }

  const progress = view.kind === 'quiz' ? ((view.step + 1) / STEPS.length) * 100 : 100;

  return (
    <div className="relative mx-auto max-w-3xl space-y-8" data-match-quiz>
      <header className="space-y-4 text-center sm:text-left">
        <p className="inline-flex -rotate-2 items-center gap-2 rounded-full border border-playful-line bg-playful-peach px-5 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-playful-orange-dark shadow-pillowy">
          <span aria-hidden="true">🐾</span> Encontra o teu patudo
        </p>
        <h1 className="font-playful-display text-5xl font-extrabold leading-[0.95] tracking-[-0.06em] text-playful-ink sm:text-6xl">
          Qual destes cães <span className="text-playful-orange">combina consigo?</span>
        </h1>
        <p className="text-lg font-medium leading-8 text-playful-muted">
          Quatro etapas sobre a sua casa, a sua rotina e o que procura. No fim mostramos os cães do abrigo que encaixam melhor, e explicamos porquê.
        </p>
        <p className="font-semibold text-playful-muted">
          <span className="font-playful-display text-2xl font-extrabold text-playful-orange-dark">{pool.length}</span> cães à espera de família
          {view.kind === 'quiz' && (
            <>
              {' · '}
              <button type="button" className="playful-focus font-extrabold text-playful-orange-dark underline decoration-playful-orange/40 decoration-2 underline-offset-4" onClick={() => setView({ kind: 'waiting', mode: 'espera' })}>
                Ou veja quem espera há mais tempo →
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
          <span className="text-xs font-extrabold text-playful-muted">{view.kind === 'quiz' ? `Etapa ${view.step + 1} de ${STEPS.length}` : 'Resultado'}</span>
        </div>
      )}

      {body}

      <section className="rounded-[2rem] border-2 border-dashed border-playful-line bg-white/70 p-6 text-sm font-semibold leading-7 text-playful-muted">
        <strong className="text-playful-ink">Isto é uma sugestão, não uma decisão.</strong> As fichas dizem muito, mas não dizem tudo: quem conhece cada cão é a equipa do abrigo. O resultado serve para começar a conversa e marcar uma visita, porque é no encontro que se vê se há ligação. A compatibilidade com crianças, com outros animais e com aves de quintal é sempre confirmada pela equipa, caso a caso.
      </section>
    </div>
  );
}
