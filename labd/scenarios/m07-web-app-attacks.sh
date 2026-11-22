#!/usr/bin/env bash
set -euo pipefail
[ -n "${FLAG_SQLI:-}" ] || FLAG_SQLI=\'FLAG{sqli-default}\'
[ -n "${FLAG_IDOR:-}" ] || FLAG_IDOR=\'FLAG{idor-default}\'
[ -n "${FLAG_AUTH:-}" ] || FLAG_AUTH=\'FLAG{auth-default}\'

mkdir -p /opt/vulnapp
cat > /opt/vulnapp/server.py <<PY
import http.server, json, sqlite3, urllib.parse

DB_PATH = "/opt/vulnapp/app.db"
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.executescript("""
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, secret TEXT);
  CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, owner_id INTEGER, title TEXT, body TEXT);
  DELETE FROM users;
  DELETE FROM notes;
""")
cur.executemany("INSERT INTO users VALUES (?,?,?,?,?)", [
    (1, "admin", "Sup3rS3cretAdmin!", "admin", "${FLAG_SQLI}"),
    (2, "alice", "alice123", "user", "just a regular user"),
    (3, "bob", "bob123", "user", "nothing here"),
])
cur.executemany("INSERT INTO notes VALUES (?,?,?,?)", [
    (1, 1, "Admin Vault", "Internal audit token: ${FLAG_IDOR}"),
    (2, 2, "Alice Note", "Remember to rotate keys on Friday."),
    (3, 3, "Bob Note", "Lunch at noon."),
])
conn.commit()

HTML = """<!doctype html><html><head><title>Dead3ars Target App (m07)</title>
<style>body{font-family:monospace;background:#0e1116;color:#e6edf3;max-width:760px;margin:2rem auto;padding:0 1rem}
a,button{color:#ff5566;cursor:pointer} input{background:#161b22;color:#fff;border:1px solid #30363d;padding:6px;margin-right:6px}
.card{border:1px solid #30363d;padding:1rem;margin:1rem 0;border-radius:8px;background:#161b22}</style></head>
<body><h1>Blackwire Vulnerable Portal (m07)</h1>
<p>Target running locally at <code>http://127.0.0.1:8080</code> &middot; Source: <code>/opt/vulnapp/server.py</code></p>
<div class="card"><h3>1. User Directory Search</h3>
  <form action="/search"><input name="q" placeholder="alice"><button>Search</button></form></div>
<div class="card"><h3>2. Login (alice / alice123)</h3>
  <form method="GET" action="/login"><input name="u" value="alice"><input name="p" value="alice123"><button>Login</button></form></div>
<div class="card"><h3>3. Notes &amp; Admin</h3>
  <a href="/notes?id=2">View Note #2</a> | <a href="/admin">Admin Panel</a></div>
</body></html>"""

class Handler(http.server.BaseHTTPRequestHandler):
    def send_json(self, code, obj, extra_headers=None):
        body = json.dumps(obj, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def parse_cookies(self):
        out = {}
        for part in self.headers.get("Cookie", "").split(";"):
            if "=" in part:
                k, v = part.strip().split("=", 1)
                out[k] = urllib.parse.unquote(v)
        return out

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(u.query)
        cookies = self.parse_cookies()

        if u.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(HTML.encode())
            return

        # VULN 1: SQL Injection in /search
        if u.path == "/search":
            q = qs.get("q", [""])[0]
            try:
                rows = [dict(r) for r in conn.execute("SELECT id, username, role FROM users WHERE username LIKE '%" + q + "%'").fetchall()]
                self.send_json(200, {"query": q, "results": rows})
            except Exception as e:
                self.send_json(500, {"error": str(e)})
            return

        # VULN 3: Weak unsigned cookie auth
        if u.path == "/login":
            user = qs.get("u", [""])[0]
            pw = qs.get("p", [""])[0]
            row = conn.execute("SELECT id, username, role FROM users WHERE username=? AND password=?", (user, pw)).fetchone()
            if not row:
                self.send_json(401, {"error": "Invalid credentials"})
                return
            self.send_json(200, {"ok": True, "loggedInAs": row["username"], "role": row["role"]},
                           {"Set-Cookie": f"session={row['username']}:{row['role']}; Path=/"})
            return

        # VULN 2: IDOR — no owner check on note id
        if u.path == "/notes":
            try:
                nid = int(qs.get("id", ["2"])[0])
            except ValueError:
                nid = 2
            row = conn.execute("SELECT * FROM notes WHERE id=?", (nid,)).fetchone()
            if row:
                self.send_json(200, dict(row))
            else:
                self.send_json(404, {"error": "not found"})
            return

        if u.path == "/admin":
            sess = cookies.get("session", "")
            if sess.endswith(":admin"):
                self.send_json(200, {"admin": True, "flag": "${FLAG_AUTH}"})
            else:
                self.send_json(403, {"error": "Forbidden: admin session required", "currentSession": sess or None})
            return

        self.send_json(404, {"error": "not found"})

http.server.ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
PY

cat > /etc/systemd/system/vulnapp.service <<'UNIT'
[Unit]
Description=Blackwire m07 Vulnerable Web App
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/vulnapp/server.py
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now vulnapp.service

cat > /home/student/README-LAB.txt <<'TXT'
=== BLACKWIRE LAB: m07-web-app-attacks ===
Target URL: http://127.0.0.1:8080 (open in Firefox or query with curl)
Source code: /opt/vulnapp/server.py

Objectives (3 Flags):
1. [sqli] Exploit SQL injection on /search (e.g. UNION SELECT id,secret,role FROM users--) to extract the admin secret.
2. [idor] Exploit Broken Access Control on /notes?id=1 to read Admin Vault.
3. [auth] Exploit weak session cookie handling (session=admin:admin) to access /admin.
TXT
chown student:student /home/student/README-LAB.txt
