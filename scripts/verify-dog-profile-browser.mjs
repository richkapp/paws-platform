#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createServer } from 'node:net';

const chromium = process.env.CHROMIUM || '/snap/bin/chromium';
const baseUrl = (process.env.PROFILE_BASE_URL || process.argv[2] || 'http://127.0.0.1:4321').replace(/\/$/, '');

const profiles = [
  {
    name: 'athos-pt-desktop',
    path: '/cao/?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
    dog: 'Athos',
    width: 1440,
    height: 1000,
    alternatePath: '/en/dog?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
  },
  {
    name: 'athos-pt-mobile',
    path: '/cao/?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
    dog: 'Athos',
    width: 390,
    height: 900,
    alternatePath: '/en/dog?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
  },
  {
    name: 'mouse-adopted-mobile',
    path: '/cao/?id=bf86e87a-b518-4dd2-8726-c45965726acf',
    dog: 'Mouse',
    width: 390,
    height: 900,
    adoptedLabel: 'Adotada!',
    alternatePath: '/en/dog?id=bf86e87a-b518-4dd2-8726-c45965726acf',
  },
  {
    name: 'alana-long-story-desktop',
    path: '/cao/?id=ea404451-14d2-48be-94a6-e3784be6ac33',
    dog: 'Alana',
    width: 1440,
    height: 1000,
  },
  {
    name: 'athos-en-mobile',
    path: '/en/dog/?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
    dog: 'Athos',
    width: 390,
    height: 900,
    alternatePath: '/cao?id=5fd31126-e731-45a8-ae30-b662d83ce4f5',
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not allocate a local CDP port')));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

function waitForExit(proc, timeoutMs) {
  if (!proc || proc.exitCode !== null) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => proc.once('exit', resolve)),
    sleep(timeoutMs),
  ]);
}

const port = await getFreePort();
const profileDir = `/tmp/capa-profile-browser-${port}-${Date.now()}`;
let browser = null;
let browserExit = null;
let browserError = null;
let stderr = '';
let ws = null;
let nextId = 1;
const pending = new Map();
const loadWaiters = new Set();

async function stopBrowser() {
  if (!browser || browser.exitCode !== null) return;
  browser.kill('SIGTERM');
  await waitForExit(browser, 2000);
  if (browser.exitCode === null) {
    browser.kill('SIGKILL');
    await waitForExit(browser, 1000);
  }
}

async function getJsonVersion() {
  for (let i = 0; i < 90; i += 1) {
    if (browserError) throw browserError;
    if (browserExit) throw new Error(`Chrome exited before CDP became ready: ${JSON.stringify(browserExit)}\nstderr:\n${stderr}`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      // Retry until Chromium exposes CDP.
    }
    await sleep(100);
  }
  throw new Error(`Chrome CDP not ready. stderr:\n${stderr}`);
}

function send(method, params = {}) {
  if (!ws) throw new Error(`Cannot call ${method}: websocket is not connected`);
  if (browserError) throw browserError;
  if (browserExit) throw new Error(`Chrome exited during verifier run: ${JSON.stringify(browserExit)}\nstderr:\n${stderr}`);

  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function navigateAndWait(url) {
  const loaded = new Promise((resolve) => {
    const timer = setTimeout(() => {
      loadWaiters.delete(done);
      resolve(false);
    }, 8000);
    const done = () => {
      clearTimeout(timer);
      loadWaiters.delete(done);
      resolve(true);
    };
    loadWaiters.add(done);
  });

  await send('Page.navigate', { url });
  await loaded;
  await sleep(2600);
}

async function runProfile(profile) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: profile.width,
    height: profile.height,
    deviceScaleFactor: 1,
    mobile: profile.width < 700,
  });

  const url = `${baseUrl}${profile.path}`;
  await navigateAndWait(url);

  const result = await evaluate(`(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const profile = document.querySelector('[data-dog-profile]');
    const gallery = document.querySelector('[data-dog-profile-gallery]');
    const title = document.querySelector('#dog-profile-heading')?.textContent?.trim() || '';
    const mainImage = gallery?.querySelector('img');
    const galleryFrame = gallery?.querySelector('[data-dog-profile-gallery-frame]');
    const visitCta = document.querySelector('[data-dog-profile] [data-visit-source="dog"]');
    const visitButton = document.querySelector('[data-dog-profile] [data-visit-open="dog"]');
    const adoptionButton = document.querySelector('[data-adoption-open]');
    const adoptionSection = document.querySelector('[data-dog-profile] section[aria-labelledby="dog-adopt-heading"]');
    const adoptionButtonRow = adoptionButton?.parentElement;
    const adoptionProcessLink = adoptionSection?.querySelector('a[href]');
    const heading = document.querySelector('#dog-profile-heading');
    const mobileControls = gallery?.querySelector('[data-gallery-mobile-controls]');
    const mobilePrev = gallery?.querySelector('[data-gallery-prev="mobile"]');
    const mobileNext = gallery?.querySelector('[data-gallery-next="mobile"]');
    const desktopPrev = gallery?.querySelector('[data-gallery-prev="desktop"]');
    const desktopNext = gallery?.querySelector('[data-gallery-next="desktop"]');
    const isVisible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const galleryLabels = [...(gallery?.querySelectorAll('span') || [])]
      .map((node) => node.textContent.trim())
      .filter(Boolean);
    const languageHrefs = [...document.querySelectorAll('a[aria-label="Português"], a[aria-label="English"]')]
      .map((node) => node.getAttribute('href'))
      .filter(Boolean);
    return {
      url: location.href,
      title,
      hasProfile: Boolean(profile),
      hasGallery: Boolean(gallery),
      profileRect: rect(profile),
      galleryRect: rect(gallery),
      galleryFrameRect: rect(galleryFrame),
      visitCtaRect: rect(visitCta),
      visitButtonRect: rect(visitButton),
      visitButtonText: visitButton?.textContent?.trim() || '',
      visitButtonVisible: isVisible(visitButton),
      adoptionButtonText: adoptionButton?.textContent?.trim() || '',
      adoptionButtonVisible: isVisible(adoptionButton),
      adoptionButtonRect: rect(adoptionButton),
      adoptionButtonRowRect: rect(adoptionButtonRow),
      adoptionProcessText: adoptionProcessLink?.textContent?.trim() || '',
      adoptionProcessVisible: isVisible(adoptionProcessLink),
      adoptionProcessRect: rect(adoptionProcessLink),
      headingRect: rect(heading),
      mainImageRect: rect(mainImage),
      mobileControlsRect: rect(mobileControls),
      mobilePrevRect: rect(mobilePrev),
      mobileNextRect: rect(mobileNext),
      desktopPrevRect: rect(desktopPrev),
      desktopNextRect: rect(desktopNext),
      mobileControlsVisible: isVisible(mobileControls),
      mobilePrevVisible: isVisible(mobilePrev),
      mobileNextVisible: isVisible(mobileNext),
      desktopPrevVisible: isVisible(desktopPrev),
      desktopNextVisible: isVisible(desktopNext),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      galleryLabels,
      languageHrefs,
    };
  })()`);

  const failures = [];
  if (!result.hasProfile) failures.push('missing profile root');
  if (!result.hasGallery) failures.push('missing gallery root');
  if (result.title !== profile.dog) failures.push(`expected dog title ${profile.dog}, got ${result.title}`);
  if (result.scrollWidth > result.innerWidth + 1) failures.push(`horizontal overflow ${result.scrollWidth} > ${result.innerWidth}`);
  if (result.galleryRect && result.profileRect && result.galleryRect.w > result.profileRect.w + 1) {
    failures.push(`gallery wider than profile ${result.galleryRect.w} > ${result.profileRect.w}`);
  }
  if (result.mainImageRect && result.galleryRect && result.mainImageRect.w > result.galleryRect.w + 1) {
    failures.push(`main image wider than gallery ${result.mainImageRect.w} > ${result.galleryRect.w}`);
  }
  if (profile.width < 700) {
    if (!result.mobileControlsVisible || !result.mobilePrevVisible || !result.mobileNextVisible) {
      failures.push('mobile gallery controls are not visible below the photo');
    }
    if (result.desktopPrevVisible || result.desktopNextVisible) {
      failures.push('desktop overlay arrows are visible on mobile');
    }
    if (result.galleryFrameRect && result.mobileControlsRect && result.mobileControlsRect.y < result.galleryFrameRect.y + result.galleryFrameRect.h - 1) {
      failures.push(`mobile gallery controls overlap image frame ${result.mobileControlsRect.y} < ${result.galleryFrameRect.y + result.galleryFrameRect.h}`);
    }
    for (const [label, buttonRect] of [['mobile previous', result.mobilePrevRect], ['mobile next', result.mobileNextRect]]) {
      if (!buttonRect) failures.push(`${label} button missing rect`);
      else if (buttonRect.w > 48 || buttonRect.h > 48) failures.push(`${label} button too large on mobile ${buttonRect.w}x${buttonRect.h}`);
    }
  } else {
    if (!result.desktopPrevVisible || !result.desktopNextVisible) {
      failures.push('desktop gallery overlay arrows are not visible on desktop');
    }
    if (result.mobileControlsVisible) {
      failures.push('mobile gallery controls are visible on desktop');
    }
  }
  if (profile.adoptedLabel && !result.galleryLabels.includes(profile.adoptedLabel)) {
    failures.push(`missing adopted label ${profile.adoptedLabel}`);
  }
  if (profile.adoptedLabel) {
    if (result.visitButtonVisible) failures.push('visit scheduling button is visible for an adopted dog');
    if (result.adoptionButtonVisible) failures.push('adoption request button is visible for an adopted dog');
  } else {
    const expectedVisitLabel = profile.path.startsWith('/en/') ? 'Schedule a visit' : 'Agendar visita';
    if (!result.visitButtonVisible) failures.push('missing visit scheduling button');
    if (!result.visitButtonText.includes(expectedVisitLabel)) failures.push(`visit button label missing ${expectedVisitLabel}: ${result.visitButtonText}`);
    const expectedAdoptionLabel = profile.path.startsWith('/en/') ? 'Send adoption request' : 'Enviar pedido de adoção';
    if (!result.adoptionButtonVisible) failures.push('missing adoption request button');
    if (!result.adoptionButtonText.includes(expectedAdoptionLabel)) failures.push(`adoption button label missing ${expectedAdoptionLabel}: ${result.adoptionButtonText}`);
    if (!result.adoptionProcessVisible) failures.push('missing adoption process link');
    if (profile.width < 700 && result.adoptionButtonRowRect && result.adoptionButtonRect && result.adoptionProcessRect) {
      const expectedButtonWidth = result.adoptionButtonRowRect.w;
      for (const [label, buttonRect] of [['adoption request', result.adoptionButtonRect], ['adoption process', result.adoptionProcessRect]]) {
        if (Math.abs(buttonRect.w - expectedButtonWidth) > 2) {
          failures.push(`${label} button is not full-width/aligned on mobile: ${buttonRect.w} vs row ${expectedButtonWidth}`);
        }
        if (Math.abs(buttonRect.x - result.adoptionButtonRowRect.x) > 2) {
          failures.push(`${label} button is not aligned to row start on mobile: ${buttonRect.x} vs row ${result.adoptionButtonRowRect.x}`);
        }
      }
    }
    if (result.galleryRect && result.visitCtaRect && result.visitCtaRect.y < result.galleryRect.y + result.galleryRect.h - 1) {
      failures.push(`visit CTA is not below the gallery ${result.visitCtaRect.y} < ${result.galleryRect.y + result.galleryRect.h}`);
    }
    if (profile.width < 700 && result.headingRect && result.visitCtaRect && result.headingRect.y < result.visitCtaRect.y + result.visitCtaRect.h - 1) {
      failures.push(`visit CTA is not above the dog info heading on mobile ${result.headingRect.y} < ${result.visitCtaRect.y + result.visitCtaRect.h}`);
    }
  }
  if (profile.alternatePath && !result.languageHrefs.includes(profile.alternatePath)) {
    failures.push(`missing language switch href ${profile.alternatePath}; got ${result.languageHrefs.join(', ')}`);
  }

  if (!profile.adoptedLabel) {
    await evaluate(`(() => {
      window.__capaFormSubmissions = [];
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init = {}) => {
        const requestUrl = typeof input === 'string' ? input : input?.url || '';
        if (String(requestUrl).includes('/forms/submit')) {
          let payload = {};
          try { payload = JSON.parse(init?.body || '{}'); } catch {}
          window.__capaFormSubmissions.push(payload);
          return Promise.resolve(new Response(JSON.stringify({ ok: true, submissionId: 'profile-browser-smoke', emailSent: true }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }));
        }
        return originalFetch(input, init);
      };
      return true;
    })()`);
  }

  let visitSubmission = null;
  if (!profile.adoptedLabel && result.visitButtonVisible) {
    visitSubmission = await evaluate(`(async () => {
      const openButton = document.querySelector('[data-dog-profile] [data-visit-open="dog"]');
      openButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
      const modal = document.querySelector('[data-visit-modal]');
      const form = document.querySelector('[data-visit-form]');
      if (!modal || !form) return { ok: false, reason: 'missing visit modal/form' };
      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, h: r.height };
      };
      const panel = document.querySelector('[data-visit-modal-panel]');
      const close = document.querySelector('[data-visit-close]');
      const title = document.querySelector('[data-visit-modal-title]');
      const visitTimeInput = form.querySelector('[name="visit_time"]');
      form.dataset.skipMailLaunch = 'true';
      form.querySelector('[name="visit_name"]').value = 'QA Visitor';
      form.querySelector('[name="visit_email"]').value = 'qa-visitor@example.com';
      form.querySelector('[name="visit_phone"]').value = '+351 930 000 000';
      visitTimeInput.value = '05/07/2026 10:30';
      form.querySelector('[name="visit_message"]').value = 'Browser smoke test visit request';
      form.requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 550));
      const mailto = document.querySelector('[data-visit-mailto]')?.getAttribute('href') || '';
      const noteVisible = Boolean(document.querySelector('[data-visit-mailto-note]'));
      const successVisible = Boolean(document.querySelector('[data-visit-success]'));
      const payload = window.__capaFormSubmissions.find((entry) => entry.kind === 'visit' && entry.source === 'dog') || null;
      const openGeometry = {
        modalRect: rect(modal),
        panelRect: rect(panel),
        closeRect: rect(close),
        titleRect: rect(title),
        viewportHeight: window.innerHeight,
      };
      document.querySelector('[data-visit-close]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        ok: true,
        modalOpen: Boolean(modal),
        ...openGeometry,
        noteVisible,
        successVisible,
        visitTimeInputType: visitTimeInput?.getAttribute('type') || '',
        visitTimeInputPlaceholder: visitTimeInput?.getAttribute('placeholder') || '',
        visitTimeInputPattern: visitTimeInput?.getAttribute('pattern') || '',
        payload,
        mailto,
        modalClosed: !document.querySelector('[data-visit-modal]'),
      };
    })()`);

    if (!visitSubmission.ok) failures.push(`visit modal failed: ${visitSubmission.reason}`);
    if (visitSubmission.panelRect && visitSubmission.panelRect.top < -1) failures.push(`visit modal panel is clipped above viewport: ${JSON.stringify(visitSubmission)}`);
    if (visitSubmission.closeRect && visitSubmission.closeRect.top < -1) failures.push(`visit modal close button is clipped above viewport: ${JSON.stringify(visitSubmission)}`);
    if (visitSubmission.titleRect && visitSubmission.titleRect.top < -1) failures.push(`visit modal title is clipped above viewport: ${JSON.stringify(visitSubmission)}`);
    if (!visitSubmission.successVisible) failures.push(`visit backend success state did not appear: ${JSON.stringify(visitSubmission)}`);
    if (visitSubmission.noteVisible) failures.push(`visit fallback note appeared despite backend success: ${JSON.stringify(visitSubmission)}`);
    if (!visitSubmission.payload || visitSubmission.payload.kind !== 'visit' || visitSubmission.payload.contextValue !== profile.dog) failures.push(`visit backend payload missing dog context: ${JSON.stringify(visitSubmission)}`);
    if (visitSubmission.visitTimeInputType !== 'text') failures.push(`visit time input should be text to avoid browser-localized US datetime controls: ${JSON.stringify(visitSubmission)}`);
    if (!visitSubmission.visitTimeInputPlaceholder.startsWith('dd/mm/')) failures.push(`visit time placeholder is not European day/month/year: ${JSON.stringify(visitSubmission)}`);
    if (visitSubmission.payload?.preferredTime !== '05/07/2026 10:30') failures.push(`visit payload did not preserve European 24h date/time: ${JSON.stringify(visitSubmission)}`);
    if (!visitSubmission.modalClosed) failures.push('visit modal did not close after verifier');
  }

  let adoptionSubmission = null;
  if (!profile.adoptedLabel && result.adoptionButtonVisible) {
    adoptionSubmission = await evaluate(`(async () => {
      const openButton = document.querySelector('[data-adoption-open]');
      openButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
      const modal = document.querySelector('[data-adoption-modal]');
      const form = document.querySelector('[data-adoption-form]');
      if (!modal || !form) return { ok: false, reason: 'missing adoption modal/form' };
      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, h: r.height };
      };
      const panel = document.querySelector('[data-adoption-modal-panel]');
      const close = document.querySelector('[data-adoption-close]');
      form.dataset.skipMailLaunch = 'true';
      form.querySelector('[name="adoption_name"]').value = 'QA Adopter';
      form.querySelector('[name="adoption_email"]').value = 'qa-adopter@example.com';
      form.querySelector('[name="adoption_phone"]').value = '+351 931 000 000';
      form.querySelector('[name="adoption_message"]').value = 'Browser smoke test adoption request';
      form.requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 550));
      const mailto = document.querySelector('[data-adoption-mailto]')?.getAttribute('href') || '';
      const noteVisible = Boolean(document.querySelector('[data-adoption-mailto-note]'));
      const successVisible = Boolean(document.querySelector('[data-adoption-success]'));
      const payload = window.__capaFormSubmissions.find((entry) => entry.kind === 'adoption_interest') || null;
      const openGeometry = {
        panelRect: rect(panel),
        closeRect: rect(close),
      };
      close?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        ok: true,
        ...openGeometry,
        noteVisible,
        successVisible,
        payload,
        mailto,
        modalClosed: !document.querySelector('[data-adoption-modal]'),
      };
    })()`);

    if (!adoptionSubmission.ok) failures.push(`adoption modal failed: ${adoptionSubmission.reason}`);
    if (adoptionSubmission.panelRect && adoptionSubmission.panelRect.top < -1) failures.push(`adoption modal panel is clipped above viewport: ${JSON.stringify(adoptionSubmission)}`);
    if (adoptionSubmission.closeRect && adoptionSubmission.closeRect.top < -1) failures.push(`adoption modal close button is clipped above viewport: ${JSON.stringify(adoptionSubmission)}`);
    if (!adoptionSubmission.successVisible) failures.push(`adoption backend success state did not appear: ${JSON.stringify(adoptionSubmission)}`);
    if (adoptionSubmission.noteVisible) failures.push(`adoption fallback note appeared despite backend success: ${JSON.stringify(adoptionSubmission)}`);
    if (!adoptionSubmission.payload || adoptionSubmission.payload.kind !== 'adoption_interest' || adoptionSubmission.payload.contextValue !== profile.dog) failures.push(`adoption backend payload missing dog context: ${JSON.stringify(adoptionSubmission)}`);
    if (!adoptionSubmission.modalClosed) failures.push('adoption modal did not close after verifier');
  }

  return {
    name: profile.name,
    ok: failures.length === 0,
    failures,
    url: result.url,
    title: result.title,
    galleryWidth: result.galleryRect?.w,
    profileWidth: result.profileRect?.w,
    imageWidth: result.mainImageRect?.w,
    visitCtaRect: result.visitCtaRect,
    visitButtonRect: result.visitButtonRect,
    visitButtonVisible: result.visitButtonVisible,
    visitButtonText: result.visitButtonText,
    adoptionButtonVisible: result.adoptionButtonVisible,
    adoptionButtonText: result.adoptionButtonText,
    adoptionButtonRect: result.adoptionButtonRect,
    adoptionButtonRowRect: result.adoptionButtonRowRect,
    adoptionProcessVisible: result.adoptionProcessVisible,
    adoptionProcessRect: result.adoptionProcessRect,
    visitSubmission,
    adoptionSubmission,
    galleryFrameRect: result.galleryFrameRect,
    mobileControlsRect: result.mobileControlsRect,
    mobilePrevRect: result.mobilePrevRect,
    mobileNextRect: result.mobileNextRect,
    mobileControlsVisible: result.mobileControlsVisible,
    desktopPrevVisible: result.desktopPrevVisible,
    desktopNextVisible: result.desktopNextVisible,
    scrollWidth: result.scrollWidth,
    innerWidth: result.innerWidth,
    galleryLabels: result.galleryLabels,
    languageHrefs: result.languageHrefs,
  };
}

try {
  browser = spawn(chromium, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  browser.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  browser.once('error', (error) => { browserError = error; });
  browser.once('exit', (code, signal) => { browserExit = { code, signal }; });

  const version = await getJsonVersion();
  const targetsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error(`No page CDP target. Browser version: ${JSON.stringify(version)}`);

  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, method } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
      else resolve(message.result);
    }
    if (message.method === 'Page.loadEventFired') {
      for (const waiter of [...loadWaiters]) waiter();
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');

  const results = [];
  for (const profile of profiles) {
    results.push(await runProfile(profile));
  }

  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, baseUrl, port, results }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
} finally {
  for (const { reject, method } of pending.values()) {
    reject(new Error(`${method}: dog profile verifier shutting down`));
  }
  pending.clear();
  loadWaiters.clear();
  try { ws?.close(); } catch {}
  await stopBrowser();
  rmSync(profileDir, { recursive: true, force: true });
}
