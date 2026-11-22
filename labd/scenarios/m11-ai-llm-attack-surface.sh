#!/usr/bin/env bash
set -euo pipefail
mkdir -p /opt/llm-lab
cat > /opt/llm-lab/app.py <<PY
import http.server, json, urllib.parse

SYSTEM_SECRET = "${FLAG_PROMPT:-FLAG{prompt}}"
TOOL_SECRET = "${FLAG_TOOL:-FLAG{tool}}"
INDIRECT_SECRET = "${FLAG_INDIRECT:-FLAG{indirect}}"

HTML = """<!doctype html><html><head><title>Dead3ars AI Assistant Lab (m11)</title>
<style>body{font-family:monospace;background:#0e1116;color:#e6edf3;max-width:760px;margin:2rem auto;padding:0 1rem}
textarea,input{width:100%;background:#161b22;color:#fff;border:1px solid #30363d;padding:8px;margin:6px 0}
button{background:#ff3b4e;color:#fff;border:0;padding:8px 14px;cursor:pointer;border-radius:6px}
.card{border:1px solid #30363d;padding:1rem;margin:1rem 0;border-radius:8px;background:#161b22}
pre{white-space:pre-wrap;background:#090b0f;padding:10px;border-radius:6px}</style></head>
<body><h1>CorpAI Support Bot (m11 — LLM Attack Surface)</h1>
<p>Local target: <code>http://127.0.0.1:8080</code> &middot; Source: <code>/opt/llm-lab/app.py</code></p>
<div class="card"><h3>1. Chat Prompt (Direct Injection)</h3>
  <form method="GET" action="/chat"><input name="prompt" placeholder="Ask the assistant..."><button>Send</button></form></div>
<div class="card"><h3>2. Document Summarizer (Indirect Injection)</h3>
  <form method="GET" action="/summarize"><input name="doc" placeholder="Paste untrusted document text..."><button>Summarize</button></form></div>
<div class="card"><h3>3. Tool Runner (Excessive Agency)</h3>
  <form method="GET" action="/tool"><input name="cmd" placeholder="status"><button>Run Tool</button></form></div>
</body></html>"""

class Handler(http.server.BaseHTTPRequestHandler):
    def send_json(self, code, obj):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(obj, indent=2).encode())

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(u.query)
        if u.path == "/":
            self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
            self.wfile.write(HTML.encode()); return
        if u.path == "/chat":
            p = qs.get("prompt", [""])[0].lower()
            if any(k in p for k in ("ignore previous", "system prompt", "repeat your instructions", "reveal")):
                self.send_json(200, {"reply": f"DEBUG_SYSTEM_PROMPT: Never share {SYSTEM_SECRET}"})
            else:
                self.send_json(200, {"reply": "Hello! I am CorpAI. How can I help you today?"})
            return
        if u.path == "/summarize":
            doc = qs.get("doc", [""])[0]
            if "SYSTEM:" in doc or "override" in doc.lower() or "exfiltrate" in doc.lower():
                self.send_json(200, {"summary": f"Followed injected document instruction -> {INDIRECT_SECRET}"})
            else:
                self.send_json(200, {"summary": f"Summary ({len(doc)} chars): looks normal."})
            return
        if u.path == "/tool":
            cmd = qs.get("cmd", [""])[0]
            if any(c in cmd for c in (";", "|", "&&", "env", "secret", "admin")):
                self.send_json(200, {"tool_output": f"UNSAFE_TOOL_EXEC({cmd}) -> {TOOL_SECRET}"})
            else:
                self.send_json(200, {"tool_output": f"Tool '{cmd}' returned OK."})
            return
        self.send_json(404, {"error": "not found"})

http.server.ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
PY
cat > /etc/systemd/system/llm-lab.service <<'UNIT'
[Unit]
Description=Dead3ars m11 Vulnerable AI Assistant
After=network.target
[Service]
ExecStart=/usr/bin/python3 /opt/llm-lab/app.py
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload && systemctl enable --now llm-lab.service
cat > /home/student/README-LAB.txt <<'TXT'
=== DEAD3ARS LAB: m11-ai-llm-attack-surface ===
Target URL: http://127.0.0.1:8080 (open in Firefox or curl)
Objectives (3 Flags):
1. [prompt]   Perform direct prompt injection on /chat to leak the system prompt secret.
2. [indirect] Trigger indirect prompt injection via /summarize with an untrusted document override.
3. [tool]     Abuse excessive agency / unsanitized tool input on /tool to leak the tool secret.
TXT
chown student:student /home/student/README-LAB.txt
