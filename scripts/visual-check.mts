/*
 * Visual sanity check over the Chrome DevTools Protocol.
 *
 * A screenshot cannot be asserted, and a CSS bundle existing does not prove the
 * page is styled — the failure this guards against is a page that renders but is
 * invisible, hidden, or unstyled (a stray `display:none` or a missing theme
 * token). So this reads the *computed* style of real elements on each page and
 * asserts on the numbers.
 *
 *   npm run dev               # in one terminal
 *   npm run test:visual       # in another
 *
 * Chrome is launched headless with remote debugging; no npm dependency is used
 * (Node's global WebSocket does the talking).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.DZ_BASE ?? 'http://localhost:3000';
const PORT = 9333;
const CHROME =
  process.env.DZ_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) passed++;
  else failed++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` -- ${detail}` : ''}`);
}

const profile = mkdtempSync(join(tmpdir(), 'dz-visual-'));
let chrome: ChildProcess | undefined;

async function waitForDevtools(): Promise<{ ws: string }> {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = (await res.json()) as { type: string; webSocketDebuggerUrl: string; url: string }[];
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return { ws: page.webSocketDebuggerUrl };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

/* Minimal CDP client: send a command, resolve on the matching id. */
function cdp(ws: WebSocket) {
  let next = 0;
  const pending = new Map<number, (v: unknown) => void>();
  const events = new Map<string, ((p: unknown) => void)[]>();

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String((ev as MessageEvent).data)) as {
      id?: number;
      result?: unknown;
      error?: unknown;
      method?: string;
      params?: unknown;
    };
    if (msg.id !== undefined) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve?.(msg.error ? { __error: msg.error } : msg.result);
      return;
    }
    if (msg.method) {
      for (const fn of events.get(msg.method) ?? []) fn(msg.params);
    }
  });

  return {
    send<T = unknown>(method: string, params?: unknown): Promise<T> {
      const id = ++next;
      return new Promise<T>((resolve) => {
        pending.set(id, resolve as (v: unknown) => void);
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    once(method: string): Promise<unknown> {
      return new Promise((resolve) => {
        const list = events.get(method) ?? [];
        const fn = (p: unknown) => {
          events.set(method, (events.get(method) ?? []).filter((f) => f !== fn));
          resolve(p);
        };
        list.push(fn);
        events.set(method, list);
      });
    },
  };
}

interface Probe {
  bodyBg: string;
  bodyColor: string;
  h1: { text: string; display: string; fontSize: number };
  primaryButton: { display: string; bg: string; opacity: number } | null;
  card: { display: string; border: string } | null;
  mainTextLength: number;
  hiddenContentCount: number;
  blurApplied: boolean;
  styleSheetCount: number;
  accentToken: string;
}

const PROBE = `(() => {
  const g = (sel) => document.querySelector(sel);
  const cs = (el) => el ? getComputedStyle(el) : null;
  const body = cs(document.body);
  const h1El = g('h1');
  const h1 = cs(h1El);
  const btn = g('.dz-btn-primary');
  const btnCs = cs(btn);
  const card = g('.dz-card');
  const cardCs = cs(card);
  const main = g('main');

  // Any element that holds text but computes to display:none is a bug of the
  // "invisible page" family, so count them rather than trusting one selector.
  let hidden = 0;
  for (const el of document.querySelectorAll('main *')) {
    const own = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0,
    );
    if (own && cs(el).display === 'none') hidden++;
  }

  let blur = false;
  for (const el of document.querySelectorAll('main *')) {
    const s = cs(el);
    if ((s.backdropFilter && s.backdropFilter !== 'none') || (s.filter && s.filter.includes('blur'))) {
      blur = true;
    }
  }

  return JSON.stringify({
    bodyBg: body ? body.backgroundColor : '',
    bodyColor: body ? body.color : '',
    h1: {
      text: h1El ? (h1El.textContent ?? '').trim().slice(0, 60) : '',
      display: h1 ? h1.display : 'none',
      fontSize: h1 ? parseFloat(h1.fontSize) : 0,
    },
    primaryButton: btn ? { display: btnCs.display, bg: btnCs.backgroundColor, opacity: parseFloat(btnCs.opacity) } : null,
    card: card ? { display: cardCs.display, border: cardCs.borderTopColor } : null,
    mainTextLength: main ? (main.innerText ?? '').length : 0,
    hiddenContentCount: hidden,
    blurApplied: blur,
    styleSheetCount: document.styleSheets.length,
    accentToken: getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
  });
})()`;

async function probe(path: string): Promise<Probe> {
  const client = cdp(ws!);
  const loaded = client.once('Page.loadEventFired');
  await client.send('Page.navigate', { url: `${BASE}${path}` });
  await loaded;
  /* One frame of settling so webfonts and hydration have landed. */
  await new Promise((r) => setTimeout(r, 400));
  const res = await client.send<{ result: { value: string } }>('Runtime.evaluate', {
    expression: PROBE,
    returnByValue: true,
  });
  return JSON.parse(res.result.value) as Probe;
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

let ws: WebSocket | undefined;

try {
  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,1600',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const { ws: wsUrl } = await waitForDevtools();
  ws = new WebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    ws!.addEventListener('open', () => resolve());
    ws!.addEventListener('error', () => reject(new Error('CDP socket failed')));
  });

  console.log(`\ndead3ars visual check against ${BASE}\n`);
  const client = cdp(ws);
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  /* ---------- landing page ---------- */

  const home = await probe('/');
  check('a stylesheet is loaded', home.styleSheetCount > 0, `${home.styleSheetCount} sheet(s)`);
  check('the theme token resolves', home.accentToken === '#35d0e8', home.accentToken || '(empty)');
  check('body has a real background, not transparent', home.bodyBg !== TRANSPARENT, home.bodyBg);
  check('body text is not transparent', home.bodyColor !== TRANSPARENT, home.bodyColor);
  check('the h1 is rendered at heading size', home.h1.display !== 'none' && home.h1.fontSize >= 30, `${home.h1.display} / ${home.h1.fontSize}px`);
  check('the h1 has text', home.h1.text.length > 10, home.h1.text);
  check('the primary button is visible', home.primaryButton !== null && home.primaryButton.display !== 'none');
  check(
    'the primary button is filled with accent',
    home.primaryButton?.bg === 'rgb(53, 208, 232)',
    home.primaryButton?.bg ?? 'none',
  );
  check('a card is rendered with a border', home.card !== null && home.card.display !== 'none', home.card?.border ?? 'none');
  check('the page has substantial text', home.mainTextLength > 400, `${home.mainTextLength} chars`);
  check('no text-bearing element is display:none', home.hiddenContentCount === 0, `${home.hiddenContentCount} hidden`);
  check('nothing is blurred', home.blurApplied === false);

  /* ---------- module page: the rendered markdown (within the free preview) ---------- */

  const mod = await probe('/modules/m03-threat-landscape');
  check('module page loads a stylesheet', mod.styleSheetCount > 0);
  check('module page is not blank', mod.mainTextLength > 2000, `${mod.mainTextLength} chars`);
  check('module page hides no text elements', mod.hiddenContentCount === 0, `${mod.hiddenContentCount} hidden`);
  check('module page is not blurred', mod.blurApplied === false);
  check(
    'module page renders the lab as a visible card',
    mod.card !== null && mod.card.display !== 'none',
    mod.card?.display ?? 'none',
  );

  /* ---------- a locked module still renders its gate ---------- */

  const locked = await probe('/modules/m11-ai-llm-attack-surface');
  check('locked module page renders its gate', locked.mainTextLength > 300, `${locked.mainTextLength} chars`);
  check('locked module page is styled', locked.bodyBg !== TRANSPARENT);
  check('locked module page is not blurred', locked.blurApplied === false);

  /* ---------- auth page: form controls visible ---------- */

  const login = await probe('/login');
  check('login page renders its button', login.primaryButton?.display !== 'none');
  check('login page is not blank', login.mainTextLength > 50, `${login.mainTextLength} chars`);
  check('login page hides nothing', login.hiddenContentCount === 0);
  check('login page renders the headings it should', login.h1.text === 'Sign in', login.h1.text);

  console.log(`\n${failed === 0 ? 'ALL GREEN' : `${failed} FAILURE(S)`}  (${passed} passed, ${failed} failed)\n`);
} catch (e) {
  console.error(`\nvisual check could not run: ${e instanceof Error ? e.message : String(e)}\n`);
  failed++;
} finally {
  ws?.close();
  chrome?.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* the profile dir is a temp dir; a failure to remove it is not worth failing on */
  }
}

process.exit(failed === 0 ? 0 : 1);
