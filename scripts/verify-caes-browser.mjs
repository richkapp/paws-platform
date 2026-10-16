import { spawn } from 'node:child_process';

const chromium = process.env.CHROMIUM || '/snap/bin/chromium';
const url = process.argv[2];
const locale = process.argv[3] || 'pt';
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 1000);
const port = Number(process.argv[6] || 9440);
const searchName = process.argv[7] || 'Mouse';

if (!url) {
  console.error('usage: node scripts/verify-caes-browser.mjs <url> [pt|en] [width] [height] [port] [searchName]');
  process.exit(2);
}

const expected = locale === 'en'
  ? { search: searchName, one: '1 dog found', adopted: 'Adopted!', all: 'All' }
  : { search: searchName, one: '1 cão encontrado', adopted: 'Adotad[ao]!', all: 'Todos' };

const profileDir = `/tmp/capa-caes-browser-${port}-${Date.now()}`;
const browser = spawn(chromium, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let stderr = '';
browser.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

async function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function getJsonVersion() {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Chrome CDP not ready. stderr:\n${stderr}`);
}

let nextId = 1;
const pending = new Map();
function send(ws, method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
  });
}

const version = await getJsonVersion();
const targetsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
const targets = await targetsRes.json();
const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
if (!pageTarget) throw new Error(`No page CDP target. Browser version: ${JSON.stringify(version)}`);
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let loaded = false;
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject, method } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${method}: ${JSON.stringify(msg.error)}`));
    else resolve(msg.result);
  }
  if (msg.method === 'Page.loadEventFired') loaded = true;
});

async function evaluate(expression) {
  const result = await send(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

try {
  await send(ws, 'Page.enable');
  await send(ws, 'Runtime.enable');
  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send(ws, 'Page.navigate', { url });
  for (let i = 0; i < 120 && !loaded; i += 1) await sleep(100);
  await sleep(1500);

  const initial = await evaluate(`(async () => {
    for (let i = 0; i < 80; i++) {
      const cards = document.querySelectorAll('[data-dog-card]').length;
      if (cards >= 90) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const cards = [...document.querySelectorAll('[data-dog-card]')];
    return {
      cards: cards.length,
      adopted: cards.filter((card) => new RegExp(${JSON.stringify(expected.adopted)}).test(card.textContent)).length,
      adoptedAria: cards.filter((card) => new RegExp(${JSON.stringify(expected.adopted)}).test(card.getAttribute('aria-label') ?? '')).length,
      hasSearch: Boolean(document.querySelector('#dog-search')),
      hasAllLabel: document.body.innerText.includes(${JSON.stringify(expected.all)}),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);

  if (initial.cards !== 100) throw new Error(`Expected 100 dog cards, got ${initial.cards}`);
  if (initial.adopted !== 10) throw new Error(`Expected 10 adopted badges, got ${initial.adopted}`);
  if (initial.adoptedAria !== 10) throw new Error(`Expected 10 adopted accessible labels, got ${initial.adoptedAria}`);
  if (!initial.hasSearch) throw new Error('Missing #dog-search input');
  if (!initial.hasAllLabel) throw new Error(`Missing filter label ${expected.all}`);
  if (initial.overflow) throw new Error('Page has horizontal overflow');

  const searchResult = await evaluate(`(async () => {
    const input = document.querySelector('#dog-search');
    input.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    valueSetter.call(input, ${JSON.stringify(expected.search)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 500));
    const cards = [...document.querySelectorAll('[data-dog-card]')];
    return {
      cards: cards.length,
      hasOneResultText: document.body.innerText.includes(${JSON.stringify(expected.one)}),
      adopted: cards.filter((card) => new RegExp(${JSON.stringify(expected.adopted)}).test(card.textContent)).length,
      adoptedAria: cards.filter((card) => new RegExp(${JSON.stringify(expected.adopted)}).test(card.getAttribute('aria-label') ?? '')).length,
      target: cards.some((card) => card.textContent.includes(${JSON.stringify(expected.search)})),
    };
  })()`);

  if (searchResult.cards !== 1) throw new Error(`Search expected 1 card, got ${searchResult.cards}`);
  if (!searchResult.hasOneResultText) throw new Error(`Search missing results text ${expected.one}`);
  if (searchResult.adopted !== 1) throw new Error(`Search expected one adopted badge, got ${searchResult.adopted}`);
  if (searchResult.adoptedAria !== 1) throw new Error(`Search expected one adopted accessible label, got ${searchResult.adoptedAria}`);
  if (!searchResult.target) throw new Error(`Search did not keep ${expected.search} card visible`);

  const reveal = await evaluate(`(async () => {
    const input = document.querySelector('#dog-search');
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    valueSetter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const step = Math.max(420, Math.floor(window.innerHeight * 0.72));
    for (let y = 0; y <= height + step; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    window.scrollTo(0, height);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const items = [...document.querySelectorAll('[data-reveal]')];
    return {
      total: items.length,
      visible: items.filter((item) => item.classList.contains('is-visible')).length,
      hidden: items.filter((item) => item.classList.contains('playful-reveal') && !item.classList.contains('is-visible')).length,
      cards: document.querySelectorAll('[data-dog-card]').length,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  })()`);

  if (reveal.cards !== 100) throw new Error(`Post-reset expected 100 cards, got ${reveal.cards}`);
  if (reveal.hidden !== 0) throw new Error(`Reveal left ${reveal.hidden} hidden element(s)`);
  if (reveal.overflow) throw new Error('Page has horizontal overflow after scrolling');

  console.log(JSON.stringify({ ok: true, url, locale, width, initial, searchResult, reveal }, null, 2));
} finally {
  ws.close();
  browser.kill('SIGTERM');
}
