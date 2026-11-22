import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { WebSocketServer } from 'ws';

const HOST = process.env.LABD_HOST || '0.0.0.0';
const PORT = Number(process.env.LABD_PORT || 8845);
const SECRET = process.env.LABD_SECRET || '';
const MAX_LABS = Number(process.env.LABD_MAX_LABS || 20);
const IDLE_SECONDS = Number(process.env.LABD_IDLE_SECONDS || 1200);
const MAX_TTL_SECONDS = Number(process.env.LABD_MAX_TTL_SECONDS || 7200);
const IMAGES_DIR = process.env.LABD_IMAGES_DIR || '/data/dead3ars-labs/images';
const OVERLAYS_DIR = process.env.LABD_OVERLAYS_DIR || '/data/dead3ars-labs/overlays';
const TRANSCRIPTS_DIR = '/data/dead3ars-labs/transcripts';
const RUN_DIR = process.env.LABD_RUN_DIR || '/run/dead3ars-labd';
const SCENARIOS_DIR = '/opt/dead3ars-labd/scenarios';

if (!SECRET) {
  console.error('LABD_SECRET is required');
  process.exit(1);
}

fs.mkdirSync(OVERLAYS_DIR, { recursive: true });
fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
fs.mkdirSync(RUN_DIR, { recursive: true });

const labs = new Map();

function verifySecret(req) {
  const got = req.headers['x-labd-secret'];
  if (typeof got !== 'string' || got.length !== SECRET.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(SECRET));
}

function verifyTicket(ticketStr) {
  if (!ticketStr || !ticketStr.includes('.')) return null;
  const [payloadB64, sigB64] = ticketStr.split('.', 2);
  const expected = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  if (sigB64.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function baseImagePath() {
  const gui = path.join(IMAGES_DIR, 'base-gui.qcow2');
  if (fs.existsSync(gui)) return gui;
  const fallback = path.join(IMAGES_DIR, 'debian12-cloud.qcow2');
  if (fs.existsSync(fallback)) return fallback;
  throw new Error('No base VM image found in ' + IMAGES_DIR);
}

function sendQmp(qmpSock, executeCmd) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(qmpSock);
    let step = 0;
    let buf = '';
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('QMP timeout')); }, 4000);
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        if (step === 0) {
          step = 1;
          sock.write('{"execute":"qmp_capabilities"}\n');
        } else if (step === 1) {
          step = 2;
          sock.write(JSON.stringify({ execute: executeCmd }) + '\n');
        } else if (step === 2) {
          clearTimeout(timer);
          sock.end();
          resolve(line);
        }
      }
    });
    sock.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function buildCloudInitIso(labDir, labId, moduleId, flags) {
  const scenarioPath = path.join(SCENARIOS_DIR, `${moduleId}.sh`);
  const scenarioBody = fs.existsSync(scenarioPath)
    ? fs.readFileSync(scenarioPath, 'utf8')
    : '#!/usr/bin/env bash\necho "No scenario script for ' + moduleId + '"\n';

  const envExports = Object.entries(flags || {})
    .map(([k, v]) => `export FLAG_${k.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}='${String(v).replace(/'/g, "'\\''")}'`)
    .join('\n');

  const runnerScript = `#!/usr/bin/env bash\nset -euo pipefail\n${envExports}\n/usr/local/sbin/run-scenario.sh\n`;
  const metaData = `instance-id: ${labId}\nlocal-hostname: dead3ars-${moduleId.slice(0, 12).replace(/-+$/, '')}\n`;
  const userData = `#cloud-config
write_files:
  - path: /usr/local/sbin/run-scenario.sh
    permissions: '0700'
    encoding: b64
    content: ${Buffer.from(scenarioBody, 'utf8').toString('base64')}
  - path: /usr/local/sbin/seed-env.sh
    permissions: '0700'
    encoding: b64
    content: ${Buffer.from(runnerScript, 'utf8').toString('base64')}
runcmd:
  - /usr/local/sbin/seed-env.sh
  - rm -f /usr/local/sbin/seed-env.sh /usr/local/sbin/run-scenario.sh
`;

  const ciDir = path.join(labDir, 'cidata');
  fs.mkdirSync(ciDir, { recursive: true });
  fs.writeFileSync(path.join(ciDir, 'meta-data'), metaData);
  fs.writeFileSync(path.join(ciDir, 'user-data'), userData);
  const isoPath = path.join(labDir, 'seed.iso');
  execFileSync('xorriso', [
    '-as', 'mkisofs', '-o', isoPath, '-V', 'cidata', '-J', '-R',
    path.join(ciDir, 'user-data'), path.join(ciDir, 'meta-data'),
  ], { stdio: 'ignore' });
  return isoPath;
}

function appendTranscript(lab, chunk) {
  if (lab.transcriptBytes > 524288) return; // 512KB cap per lab
  lab.transcriptBytes += chunk.length;
  fs.appendFile(lab.transcriptPath, chunk, () => {});
}

function connectSerial(lab) {
  if (lab.stopped) return;
  const sock = net.createConnection(lab.ttySock);
  lab.serialSock = sock;

  sock.on('data', (chunk) => {
    lab.lastActivityAt = Date.now();
    appendTranscript(lab, chunk);
    lab.scrollback = Buffer.concat([lab.scrollback, chunk]);
    if (lab.scrollback.length > 65536) {
      lab.scrollback = lab.scrollback.subarray(lab.scrollback.length - 65536);
    }
    for (const client of lab.ttyClients) {
      if (client.ws.readyState === 1) client.ws.send(chunk);
    }
  });

  sock.on('error', () => {
    if (!lab.stopped) setTimeout(() => connectSerial(lab), 500);
  });
  sock.on('close', () => {
    if (!lab.stopped && lab.serialSock === sock) {
      setTimeout(() => connectSerial(lab), 500);
    }
  });
}

function getProcRssMb(pid) {
  try {
    const statm = fs.readFileSync(`/proc/${pid}/statm`, 'utf8').trim().split(/\s+/);
    const pages = Number(statm[1] || 0);
    return Math.round((pages * 4096) / (1024 * 1024));
  } catch {
    return 0;
  }
}

function startLab({ labId, userId, moduleId, flags, ramMb = 1536, vcpus = 2 }) {
  if (labs.size >= MAX_LABS) {
    throw Object.assign(new Error(`Max concurrent labs (${MAX_LABS}) reached`), { status: 429 });
  }
  const baseImg = baseImagePath();
  const labDir = path.join(OVERLAYS_DIR, labId);
  fs.rmSync(labDir, { recursive: true, force: true });
  fs.mkdirSync(labDir, { recursive: true });

  const diskPath = path.join(labDir, 'disk.qcow2');
  execFileSync('qemu-img', ['create', '-f', 'qcow2', '-b', baseImg, '-F', 'qcow2', diskPath], { stdio: 'ignore' });
  const isoPath = buildCloudInitIso(labDir, labId, moduleId, flags);

  const ttySock = path.join(RUN_DIR, `${labId}.tty`);
  const vncSock = path.join(RUN_DIR, `${labId}.vnc`);
  const qmpSock = path.join(RUN_DIR, `${labId}.qmp`);
  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${labId}.log`);
  fs.rmSync(ttySock, { force: true });
  fs.rmSync(vncSock, { force: true });
  fs.rmSync(qmpSock, { force: true });

  const args = [
    '-enable-kvm',
    '-cpu', 'host',
    '-smp', String(vcpus),
    '-m', String(ramMb),
    '-drive', `file=${diskPath},format=qcow2,if=virtio`,
    '-cdrom', isoPath,
    '-nic', 'none',
    '-device', 'virtio-vga,xres=1280,yres=800',
    '-vnc', `unix:${vncSock},share=force-shared`,
    '-chardev', `socket,id=tty0,path=${ttySock},server=on,wait=off`,
    '-serial', 'chardev:tty0',
    '-qmp', `unix:${qmpSock},server=on,wait=off`,
    '-display', 'none',
    '-no-reboot',
  ];

  const proc = spawn('qemu-system-x86_64', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const now = Date.now();
  const lab = {
    labId,
    userId,
    moduleId,
    flags: flags || {},
    ramMb,
    vcpus,
    labDir,
    ttySock,
    vncSock,
    qmpSock,
    transcriptPath,
    transcriptBytes: 0,
    proc,
    serialSock: null,
    scrollback: Buffer.alloc(0),
    ttyClients: new Set(),
    vncClients: new Set(),
    startedAt: now,
    lastActivityAt: now,
    expiresAt: now + MAX_TTL_SECONDS * 1000,
    paused: false,
    stopped: false,
    stderr: '',
  };

  proc.stderr.on('data', (d) => {
    lab.stderr = (lab.stderr + d.toString('utf8')).slice(-2000);
  });

  proc.on('exit', () => {
    cleanupLab(labId, 'exited');
  });

  labs.set(labId, lab);
  setTimeout(() => connectSerial(lab), 400);
  return summarizeLab(lab);
}

function summarizeLab(lab) {
  const watchers = [...lab.ttyClients, ...lab.vncClients].filter((c) => c.role !== 'student').length;
  return {
    labId: lab.labId,
    userId: lab.userId,
    moduleId: lab.moduleId,
    status: lab.stopped ? 'stopped' : lab.paused ? 'paused' : 'running',
    paused: lab.paused,
    pid: lab.proc?.pid || null,
    rssMb: lab.proc?.pid ? getProcRssMb(lab.proc.pid) : 0,
    ramMb: lab.ramMb,
    vcpus: lab.vcpus,
    startedAt: new Date(lab.startedAt).toISOString(),
    lastActivityAt: new Date(lab.lastActivityAt).toISOString(),
    expiresAt: new Date(lab.expiresAt).toISOString(),
    idleSeconds: Math.floor((Date.now() - lab.lastActivityAt) / 1000),
    ttyClients: lab.ttyClients.size,
    vncClients: lab.vncClients.size,
    teacherWatchers: watchers,
    vncReady: fs.existsSync(lab.vncSock),
  };
}

function cleanupLab(labId, reason = 'stopped') {
  const lab = labs.get(labId);
  if (!lab || lab.stopped) return false;
  lab.stopped = true;
  labs.delete(labId);

  for (const c of [...lab.ttyClients, ...lab.vncClients]) {
    try { c.ws.close(1000, reason); } catch {}
  }
  try { lab.serialSock?.destroy(); } catch {}
  try { lab.proc?.kill('SIGTERM'); } catch {}
  setTimeout(() => {
    try { lab.proc?.kill('SIGKILL'); } catch {}
    try { fs.rmSync(lab.ttySock, { force: true }); } catch {}
    try { fs.rmSync(lab.vncSock, { force: true }); } catch {}
    try { fs.rmSync(lab.qmpSock, { force: true }); } catch {}
    try { fs.rmSync(lab.labDir, { recursive: true, force: true }); } catch {}
  }, 1000);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [labId, lab] of labs.entries()) {
    const idleSec = (now - lab.lastActivityAt) / 1000;
    if (now >= lab.expiresAt) {
      cleanupLab(labId, 'ttl_expired');
    } else if (!lab.paused && idleSec >= IDLE_SECONDS && lab.ttyClients.size === 0 && lab.vncClients.size === 0) {
      cleanupLab(labId, 'idle_timeout');
    }
  }
}, 30000);

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (u.pathname === '/health') {
    const hasGui = fs.existsSync(path.join(IMAGES_DIR, 'base-gui.qcow2'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, activeLabs: labs.size, maxLabs: MAX_LABS, guiImageReady: hasGui }));
    return;
  }

  if (!verifySecret(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  try {
    if (req.method === 'GET' && u.pathname === '/labs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        labs: [...labs.values()].map(summarizeLab),
        maxLabs: MAX_LABS,
        guiImageReady: fs.existsSync(path.join(IMAGES_DIR, 'base-gui.qcow2')),
      }));
      return;
    }

    if (req.method === 'POST' && u.pathname === '/labs') {
      const body = await readJson(req);
      const { labId, userId, moduleId, flags, ramMb, vcpus } = body;
      if (!labId || !moduleId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'labId and moduleId required' }));
        return;
      }
      if (labs.has(labId)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(summarizeLab(labs.get(labId))));
        return;
      }
      const info = startLab({ labId, userId, moduleId, flags, ramMb, vcpus });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(info));
      return;
    }

    if (req.method === 'POST' && (u.pathname === '/labs/pause-all' || u.pathname === '/labs/resume-all')) {
      const pause = u.pathname === '/labs/pause-all';
      let count = 0;
      for (const lab of labs.values()) {
        try {
          await sendQmp(lab.qmpSock, pause ? 'stop' : 'cont');
          lab.paused = pause;
          count++;
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, count, paused: pause }));
      return;
    }

    const m = u.pathname.match(/^\/labs\/([a-zA-Z0-9_-]+)(?:\/(reset|pause|resume|transcript))?$/);
    if (m) {
      const [, labId, sub] = m;
      if (req.method === 'GET' && sub === 'transcript') {
        const tp = path.join(TRANSCRIPTS_DIR, `${labId}.log`);
        const text = fs.existsSync(tp) ? fs.readFileSync(tp, 'utf8').slice(-65536) : '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ labId, transcript: text }));
        return;
      }
      if (req.method === 'GET' && !sub) {
        const lab = labs.get(labId);
        if (!lab) { res.writeHead(404); res.end(JSON.stringify({ error: 'not found' })); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(summarizeLab(lab)));
        return;
      }
      if (req.method === 'POST' && (sub === 'pause' || sub === 'resume')) {
        const lab = labs.get(labId);
        if (!lab) { res.writeHead(404); res.end(JSON.stringify({ error: 'not found' })); return; }
        const pause = sub === 'pause';
        await sendQmp(lab.qmpSock, pause ? 'stop' : 'cont');
        lab.paused = pause;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(summarizeLab(lab)));
        return;
      }
      if (req.method === 'POST' && sub === 'reset') {
        const prev = labs.get(labId);
        const body = await readJson(req);
        const opts = prev
          ? { labId, userId: prev.userId, moduleId: prev.moduleId, flags: body.flags || prev.flags, ramMb: prev.ramMb, vcpus: prev.vcpus }
          : body;
        if (prev) cleanupLab(labId, 'reset');
        await new Promise((r) => setTimeout(r, 1200));
        const info = startLab(opts);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(info));
        return;
      }
      if (req.method === 'DELETE' && !sub) {
        cleanupLab(labId, 'stopped_by_api');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
    }

    if (req.method === 'DELETE' && u.pathname === '/labs') {
      const count = labs.size;
      for (const id of [...labs.keys()]) cleanupLab(id, 'kill_all');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, stopped: count }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  } catch (err) {
    console.error('[labd error]', err);
    res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'internal error' }));
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const m = u.pathname.match(/^\/ws\/(lab|vnc)\/([a-zA-Z0-9_-]+)$/);
  if (!m) { socket.destroy(); return; }

  const [, kind, labId] = m;
  const ticket = verifyTicket(u.searchParams.get('ticket'));
  if (!ticket || ticket.labId !== labId) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const lab = labs.get(labId);
  if (!lab || lab.stopped) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    const client = { ws, userId: ticket.userId, role: ticket.role, mode: ticket.mode || 'ro' };
    const pingTimer = setInterval(() => {
      if (ws.readyState === 1) ws.ping();
    }, 25000);

    if (kind === 'lab') {
      lab.ttyClients.add(client);
      if (lab.scrollback.length > 0) ws.send(lab.scrollback);
      ws.on('message', (data) => {
        if (client.mode !== 'rw') return;
        lab.lastActivityAt = Date.now();
        if (lab.serialSock && !lab.serialSock.destroyed) {
          lab.serialSock.write(data);
        }
      });
      ws.on('close', () => {
        clearInterval(pingTimer);
        lab.ttyClients.delete(client);
      });
    } else if (kind === 'vnc') {
      lab.vncClients.add(client);
      const vncSock = net.createConnection(lab.vncSock);
      vncSock.on('data', (chunk) => {
        if (ws.readyState === 1) ws.send(chunk);
      });
      ws.on('message', (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        if (client.mode !== 'rw' && buf.length > 0 && (buf[0] === 4 || buf[0] === 5)) {
          return;
        }
        lab.lastActivityAt = Date.now();
        if (!vncSock.destroyed) vncSock.write(buf);
      });
      vncSock.on('close', () => { try { ws.close(); } catch {} });
      vncSock.on('error', () => { try { ws.close(1011, 'vnc socket error'); } catch {} });
      ws.on('close', () => {
        clearInterval(pingTimer);
        lab.vncClients.delete(client);
        try { vncSock.destroy(); } catch {}
      });
    }
  });
});

process.on('SIGTERM', () => {
  for (const id of [...labs.keys()]) cleanupLab(id, 'daemon_shutdown');
  setTimeout(() => process.exit(0), 1200);
});

server.listen(PORT, HOST, () => {
  console.log(`[dead3ars-labd] listening on http://${HOST}:${PORT} (maxLabs=${MAX_LABS})`);
});
