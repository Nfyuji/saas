import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API = process.env.API_URL || 'http://localhost:3001/api';
const WIDTHS = [320, 375, 768, 1024, 1440, 1920, 2560];

const port = 9222 + Math.floor(Math.random() * 200);
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'bos-resp-'));

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, data }));
      })
      .on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function waitForDebugger(retries = 50) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await get(`http://127.0.0.1:${port}/json/version`);
      return JSON.parse(data).webSocketDebuggerUrl;
    } catch {
      await sleep(200);
    }
  }
  throw new Error('Chrome debugger not ready');
}

async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', (e) => rej(e));
  });

  let id = 0;
  const pending = new Map();
  const events = new Map();

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method && events.has(msg.method)) {
      for (const fn of events.get(msg.method)) fn(msg.params);
    }
  });

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      const payload = { id: msgId, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });

  const on = (method, fn) => {
    if (!events.has(method)) events.set(method, new Set());
    events.get(method).add(fn);
    return () => events.get(method).delete(fn);
  };

  return { ws, send, on };
}

async function main() {
  let auth = null;
  try {
    const login = await post(`${API}/auth/login`, {
      email: 'demo@businessos.ai',
      password: '123456',
    });
    if (login.data?.accessToken) {
      auth = { token: login.data.accessToken, user: login.data.user };
    }
  } catch {
    console.warn('Auth API unavailable — checking public pages only');
  }

  const pages = ['/', '/login', '/register'];
  if (auth) {
    pages.push('/dashboard', '/dashboard/inbox', '/dashboard/customers');
  }

  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userData}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    const browserWs = await waitForDebugger();
    const browser = await cdpConnect(browserWs);

    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await browser.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    const s = (method, params) => browser.send(method, params, sessionId);

    await s('Page.enable');
    await s('Runtime.enable');

    if (auth) {
      await s('Page.navigate', { url: BASE });
      await sleep(500);
      await s('Runtime.evaluate', {
        expression: `localStorage.setItem('token', ${JSON.stringify(auth.token)}); localStorage.setItem('user', ${JSON.stringify(JSON.stringify(auth.user))});`,
      });
    }

    const issues = [];

    for (const width of WIDTHS) {
      const height = width < 1024 ? 844 : 1000;
      await s('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: width,
        screenHeight: height,
      });

      for (const page of pages) {
        await s('Page.navigate', { url: `${BASE}${page}` });
        await sleep(900);
        // Re-apply after navigation (some Chrome versions reset)
        await s('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
          screenWidth: width,
          screenHeight: height,
        });
        await sleep(250);

        const { result } = await s('Runtime.evaluate', {
          expression: `(() => {
            const w = window.innerWidth;
            const doc = document.documentElement;
            const body = document.body;
            const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
            const overflowX = scrollW - w;
            const clipped = [...document.querySelectorAll('h1,h2,p,button,.mode-card,.action-bar,.app-topbar')]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 2 && (r.right > w + 2 || r.left < -2);
              })
              .slice(0, 6)
              .map((el) => el.className?.toString?.().slice(0, 24) || el.tagName);
            return { inner: w, scrollW, overflowX, clipped, title: document.title };
          })()`,
          returnByValue: true,
        });

        const v = result.value;
        const widthMismatch = Math.abs(v.inner - width) > 2;
        const bad = v.overflowX > 2 || v.clipped.length > 0 || widthMismatch;
        const line = `${width}px ${page} → inner=${v.inner} overflowX=${v.overflowX}${
          v.clipped.length ? ` clipped=${JSON.stringify(v.clipped)}` : ''
        }`;
        console.log(bad ? `FAIL ${line}` : `OK   ${line}`);
        if (bad) issues.push(line);
      }
    }

    browser.ws.close();
    if (issues.length) {
      console.error(`\n${issues.length} responsive issue(s)`);
      process.exitCode = 1;
    } else {
      console.log('\nAll checked viewports OK');
    }
  } finally {
    chrome.kill();
    try {
      fs.rmSync(userData, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
