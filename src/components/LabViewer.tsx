'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';

interface LabViewerProps {
  labId: string;
  mode: 'ro' | 'rw';
  defaultView?: 'desktop' | 'terminal';
  heightClass?: string;
  compact?: boolean;
}

export function LabViewer({
  labId,
  mode,
  defaultView = 'desktop',
  heightClass = 'h-[560px]',
  compact = false,
}: LabViewerProps) {
  const [view, setView] = useState<'desktop' | 'terminal'>(defaultView);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errMsg, setErrMsg] = useState<string>('');
  const [nonce, setNonce] = useState(0);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const retryCountRef = useRef(0);

  const vncContainerRef = useRef<HTMLDivElement | null>(null);
  const termContainerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rfbRef = useRef<{
    disconnect: () => void;
    clipboardPasteFrom?: (text: string) => void;
    sendKey?: (keysym: number, code?: string, down?: boolean) => void;
  } | null>(null);

  const fetchTicket = useCallback(async () => {
    const res = await fetch(`/api/labs/${labId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ticket', mode }),
    });
    const data = (await res.json().catch(() => ({}))) as { ticket?: string; error?: string };
    if (!res.ok || !data.ticket) {
      throw new Error(data.error || 'Failed to get session ticket');
    }
    return data.ticket;
  }, [labId, mode]);

  // Desktop (noVNC) connection
  useEffect(() => {
    if (view !== 'desktop') return;
    let cancelled = false;
    let rfb: {
      disconnect: () => void;
      scaleViewport: boolean;
      viewOnly: boolean;
      clipboardPasteFrom?: (text: string) => void;
      sendKey?: (keysym: number, code?: string, down?: boolean) => void;
    } | null = null;

    (async () => {
      try {
        await Promise.resolve();
        if (cancelled) return;
        setStatus('connecting');
        setErrMsg('');
        const ticket = await fetchTicket();
        if (cancelled || !vncContainerRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import('@novnc/novnc');
        const RFB = mod.default ?? mod;
        if (cancelled || !vncContainerRef.current) return;

        vncContainerRef.current.innerHTML = '';
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${proto}//${window.location.host}/ws/vnc/${labId}?ticket=${encodeURIComponent(ticket)}`;

        const instance = new RFB(vncContainerRef.current, url, { wsProtocols: ['binary'] });
        instance.scaleViewport = true;
        instance.viewOnly = mode === 'ro';
        instance.background = '#090b0f';

        instance.addEventListener('connect', () => {
          if (!cancelled) {
            retryCountRef.current = 0;
            setErrMsg('');
            setStatus('connected');
          }
        });
        instance.addEventListener('disconnect', (e: CustomEvent<{ clean?: boolean }>) => {
          if (!cancelled) {
            if (!e.detail?.clean && retryCountRef.current < 4) {
              retryCountRef.current += 1;
              setStatus('connecting');
              setErrMsg(`Waiting for VM desktop to finish booting… (attempt ${retryCountRef.current}/4)`);
              setTimeout(() => {
                if (!cancelled) setNonce((n) => n + 1);
              }, 3000);
            } else {
              setStatus('disconnected');
              if (!e.detail?.clean) {
                setErrMsg('VM desktop disconnected — click Reconnect to resume.');
              }
            }
          }
        });

        rfb = instance;
        rfbRef.current = instance;
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setErrMsg(err instanceof Error ? err.message : 'Unable to connect to VM desktop');
        }
      }
    })();

    return () => {
      cancelled = true;
      rfbRef.current = null;
      try {
        rfb?.disconnect();
      } catch {}
    };
  }, [view, labId, mode, nonce, fetchTicket]);

  // Serial Terminal (xterm.js) connection
  useEffect(() => {
    if (view !== 'terminal') return;
    let cancelled = false;
    let ws: WebSocket | null = null;
    let term: { dispose: () => void; write: (d: string | Uint8Array) => void; onData: (cb: (d: string) => void) => void } | null = null;
    let onResize: (() => void) | null = null;

    (async () => {
      try {
        await Promise.resolve();
        if (cancelled) return;
        setStatus('connecting');
        setErrMsg('');
        const ticket = await fetchTicket();
        if (cancelled || !termContainerRef.current) return;

        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
        ]);
        if (cancelled || !termContainerRef.current) return;

        termContainerRef.current.innerHTML = '';
        const t = new Terminal({
          cursorBlink: mode === 'rw',
          disableStdin: mode === 'ro',
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          theme: {
            background: '#090b0f',
            foreground: '#e6edf3',
            cursor: '#ff3b4e',
          },
        });
        const fit = new FitAddon();
        t.loadAddon(fit);
        t.open(termContainerRef.current);
        fit.fit();

        onResize = () => fit.fit();
        window.addEventListener('resize', onResize);

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${proto}//${window.location.host}/ws/lab/${labId}?ticket=${encodeURIComponent(ticket)}`;
        const sock = new WebSocket(url);
        sock.binaryType = 'arraybuffer';

        sock.onopen = () => {
          if (!cancelled) {
            setStatus('connected');
            if (mode === 'rw') sock.send('\n');
          }
        };
        sock.onmessage = (ev) => {
          if (typeof ev.data === 'string') {
            t.write(ev.data);
          } else {
            t.write(new Uint8Array(ev.data));
          }
        };
        sock.onclose = () => {
          if (!cancelled) setStatus('disconnected');
        };
        sock.onerror = () => {
          if (!cancelled) {
            setStatus('error');
            setErrMsg('Serial console WebSocket error');
          }
        };

        t.onData((data) => {
          if (mode === 'rw' && sock.readyState === WebSocket.OPEN) {
            sock.send(data);
          }
        });

        ws = sock;
        term = t;
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setErrMsg(err instanceof Error ? err.message : 'Unable to connect to terminal');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener('resize', onResize);
      try { ws?.close(); } catch {}
      try { term?.dispose(); } catch {}
    };
  }, [view, labId, mode, nonce, fetchTicket]);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrapperRef.current.requestFullscreen().catch(() => {});
    }
  };

  const sendPaste = () => {
    const rfb = rfbRef.current;
    if (!rfb || !pasteText) return;
    if (rfb.clipboardPasteFrom) {
      rfb.clipboardPasteFrom(pasteText);
    }
    // Also type ASCII characters directly for apps without clipboard sync
    if (rfb.sendKey) {
      for (const ch of pasteText) {
        const code = ch.charCodeAt(0);
        if (code === 10) {
          rfb.sendKey(0xff0d);
        } else if (code >= 32 && code <= 126) {
          rfb.sendKey(code);
        }
      }
    }
    setPasteText('');
    setPasteOpen(false);
  };

  return (
    <div ref={wrapperRef} className="overflow-hidden rounded-xl border border-line bg-[#090b0f]">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('desktop')}
              className={`rounded px-2.5 py-1 font-mono transition ${
                view === 'desktop'
                  ? 'bg-accent text-white'
                  : 'border border-line text-muted hover:text-ink'
              }`}
            >
              GUI Desktop
            </button>
            <button
              type="button"
              onClick={() => setView('terminal')}
              className={`rounded px-2.5 py-1 font-mono transition ${
                view === 'terminal'
                  ? 'bg-accent text-white'
                  : 'border border-line text-muted hover:text-ink'
              }`}
            >
              Serial Terminal
            </button>
            <span className="ml-2 font-mono text-[11px] text-muted">
              {status === 'connected' && <span className="text-accent-2">● live</span>}
              {status === 'connecting' && <span className="text-warn">● connecting…</span>}
              {status === 'disconnected' && <span className="text-muted">○ disconnected</span>}
              {status === 'error' && <span className="text-accent">● error</span>}
              {mode === 'ro' && <span className="ml-2 rounded bg-warn/20 px-1.5 py-0.5 text-warn">READ-ONLY</span>}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {view === 'desktop' && mode === 'rw' && (
              <button
                type="button"
                onClick={() => setPasteOpen((v) => !v)}
                className="rounded border border-line px-2 py-1 font-mono text-muted hover:border-accent hover:text-ink"
              >
                Paste Text
              </button>
            )}
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="rounded border border-line px-2 py-1 font-mono text-muted hover:border-accent hover:text-ink"
            >
              Reconnect
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded border border-line px-2 py-1 font-mono text-muted hover:border-accent hover:text-ink"
            >
              Fullscreen
            </button>
          </div>
        </div>
      )}

      {pasteOpen && !compact && (
        <div className="flex items-center gap-2 border-b border-line bg-panel-2 px-3 py-2">
          <input
            type="text"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste command or URL to type into VM…"
            className="w-full rounded border border-line bg-panel px-2.5 py-1 font-mono text-xs text-ink outline-none focus:border-accent"
          />
          <button type="button" onClick={sendPaste} className="dz-btn dz-btn-primary py-1 text-xs">
            Send
          </button>
        </div>
      )}

      {errMsg && !compact && (
        <div className="border-b border-line bg-accent/10 px-3 py-2 font-mono text-xs text-accent">
          {errMsg}
        </div>
      )}

      <div className={`relative w-full ${heightClass}`}>
        <div
          ref={vncContainerRef}
          className={`h-full w-full ${view === 'desktop' ? 'block' : 'hidden'}`}
        />
        <div
          ref={termContainerRef}
          className={`h-full w-full p-2 ${view === 'terminal' ? 'block' : 'hidden'}`}
        />
      </div>
    </div>
  );
}
