#!/usr/bin/env bash
set -euo pipefail

mkdir -p /opt/api-lab
cat > /opt/api-lab/server.py <<PYEOF
import http.server, json, urllib.parse, hashlib, hmac, base64, time

SECRET = "dead3ars-jwt-secret-do-not-use-in-prod"

users = {
    "alice": {"username": "alice", "password": "alice123", "role": "user", "secret": "FLAG_PLACEHOLDER_BOLA"},
    "bob":   {"username": "bob",   "password": "bob123",  "role": "user", "secret": "FLAG_PLACEHOLDER_MASS"},
}
invoices = {
    1001: {"id": 1001, "tenant": "tenant-alpha", "amount": 4200.00, "status": "paid"},
    1002: {"id": 1002, "tenant": "tenant-beta",  "amount": 1500.00, "status": "unpaid"},
    1003: {"id": 1003, "tenant": "tenant-gamma", "amount": 8900.00, "status": "paid"},
}
profiles = {
    "alice": {"username": "alice", "role": "user", "email": "alice@example.com"},
    "bob":   {"username": "bob",   "role": "user", "email": "bob@example.com"},
}

def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def b64url_decode(s):
    pad = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + ("=" * pad))

def make_jwt(payload_dict):
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64url(json.dumps(payload_dict).encode())
    sig = hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    return f"{header}.{payload}.{b64url(sig)}"

def verify_jwt(token):
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header = json.loads(b64url_decode(parts[0]))
        payload = json.loads(b64url_decode(parts[1]))
        algo = header.get("alg", "HS256")
        if algo == "none":
            return payload
        if algo == "HS256":
            sig_check = hmac.new(SECRET.encode(), f"{parts[0]}.{parts[1]}".encode(), hashlib.sha256).digest()
            sig_given = b64url_decode(parts[2])
            if not hmac.compare_digest(sig_check, sig_given):
                return None
            return payload
        return None
    except Exception:
        return None

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(body)
        except Exception:
            data = {}
        if self.path == "/api/login":
            user = data.get("username", "")
            pw = data.get("password", "")
            if user in users and users[user]["password"] == pw:
                token = make_jwt({"sub": user, "role": users[user]["role"]})
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"token": token, "user": user}).encode())
                return
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid credentials"}).encode())
            return
        if self.path == "/api/profile":
            token = (self.headers.get("Authorization") or "").replace("Bearer ", "")
            profile = verify_jwt(token)
            if not profile:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode())
                return
            username = profile.get("sub")
            if username in profiles:
                p = profiles[username]
                if "name" in data:
                    p["name"] = data["name"]
                if "role" in data:
                    p["role"] = data["role"]
                if "email" in data:
                    p["email"] = data["email"]
                new_token = make_jwt({"sub": username, "role": p["role"]})
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"profile": p, "token": new_token}).encode())
                return
        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"error":"not found"}')
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(u.query)
        if u.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "endpoints": ["/health", "/api/login", "/api/invoices/:id", "/api/profile", "/api/staff/secret", "/api/superadmin"]}).encode())
            return
        if u.path.startswith("/api/invoices/"):
            token = (self.headers.get("Authorization") or "").replace("Bearer ", "")
            profile = verify_jwt(token)
            if not profile:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode())
                return
            inv_id = int(u.path.split("/")[-1])
            inv = invoices.get(inv_id)
            if inv:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                flag = "FLAG_PLACEHOLDER_BOLA" if inv_id == 1001 else "FLAG_PLACEHOLDER_MASS"
                self.wfile.write(json.dumps({"invoice": inv, "flag": flag}).encode())
                return
            self.send_response(404)
            self.end_headers()
            return
        if u.path == "/api/profile":
            token = (self.headers.get("Authorization") or "").replace("Bearer ", "")
            profile = verify_jwt(token)
            if not profile:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode())
                return
            username = profile.get("sub")
            if username in profiles:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"profile": profiles[username]}).encode())
                return
        if u.path == "/api/staff/secret":
            token = (self.headers.get("Authorization") or "").replace("Bearer ", "")
            profile = verify_jwt(token)
            if not profile:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode())
                return
            username = profile.get("sub")
            if username in profiles and profiles[username].get("role") == "admin":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"secret": "FLAG_PLACEHOLDER_MASS"}).encode())
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Staff area. No secret for you."}).encode())
            return
        if u.path == "/api/superadmin":
            token = (self.headers.get("Authorization") or "").replace("Bearer ", "")
            profile = verify_jwt(token)
            if profile and profile.get("role") == "superadmin":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"superadmin": True, "flag": "FLAG_PLACEHOLDER_JWT"}).encode())
                return
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Forbidden: superadmin JWT required"}).encode())
            return
        self.send_response(404)
        self.end_headers()

print("API server starting on 127.0.0.1:8080 ...", flush=True)
http.server.ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
PYEOF

sed -i "s/FLAG_PLACEHOLDER_BOLA/${FLAG_BOLA:-FLAG{bola-default}}/g" /opt/api-lab/server.py
sed -i "s/FLAG_PLACEHOLDER_MASS/${FLAG_MASS_ASSIGN:-FLAG{mass_assign-default}}/g" /opt/api-lab/server.py
sed -i "s/FLAG_PLACEHOLDER_JWT/${FLAG_JWT:-FLAG{jwt-default}}/g" /opt/api-lab/server.py

cat > /etc/systemd/system/api-lab.service <<UNIT
[Unit]
Description=Dead3ars m13 Vulnerable API Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/api-lab/server.py
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now api-lab.service

cat > /home/student/README-LAB.txt <<TXT
=== DEAD3ARS LAB: m13-api-auth-jwt-attacks ===
Target API: http://127.0.0.1:8080 (open in Firefox or query with curl)
Source code: /opt/api-lab/server.py

Objectives (3 Flags):
1. [bola]     Log in as alice/alice123 (POST /api/login), then query /api/invoices/1001
              instead of your own /api/invoices/1002 to trigger Broken Object Level Auth.
2. [mass_assign] Update your profile via POST /api/profile with {"role": "admin"},
              then query /api/staff/secret with your elevated profile.
3. [jwt]      Forge an unsigned JWT with {"alg":"none","typ":"JWT"} against /api/superadmin
              to extract the superadmin flag.

Endpoints:
  GET  /health                          - API health check
  POST /api/login                       - Login (username/password -> JWT)
  GET  /api/invoices/:id                - Invoice lookup (BOLA)
  GET  /api/profile                     - Read own profile
  POST /api/profile                     - Update profile (mass assignment)
  GET  /api/staff/secret                - Staff area (requires role=admin)
  GET  /api/superadmin                  - Superadmin (requires alg:none JWT)
TXT
chown student:student /home/student/README-LAB.txt
