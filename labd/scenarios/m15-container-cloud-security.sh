#!/usr/bin/env bash
set -euo pipefail

# === Part 1: Leaked CI/CD build log ===
mkdir -p /opt/ci-runner
cat > /opt/ci-runner/build.log <<LOGEOF
=== CI/CD Pipeline Build Log (simulated) ===
Pipeline: deploy-main
Trigger: push to main
Runner: ubuntu-latest

Step 1: Checkout code
  Cloned repository at abc123def

Step 2: Install dependencies
  npm ci completed (47 packages)

Step 3: Run tests
  23 tests passed

Step 4: Build artifacts
  Built dist/ (42 MB)

Step 5: Deploy to staging (DEBUG MODE)
  Setting DEPLOY_TOKEN=...
  Setting AWS_ACCESS_KEY_ID=AKIA${FLAG_CI_SECRET}
  Setting AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG
  Setting DEPLOY_REGION=us-east-1
  Running: aws s3 sync dist/ s3://staging-bucket/
  Deployment complete
  env | grep -i secret
  AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG

Step 6: Notify Slack
  Notified #deploy channel

Build Status: SUCCESS
LOGEOF

chmod a+r /opt/ci-runner/build.log

# === Part 2: Mock IMDSv1 server ===
mkdir -p /opt/imds-lab
cat > /opt/imds-lab/imds-server.py <<PYEOF
import http.server, json

ROLE_ARN = "arn:aws:iam::123456789012:role/app-role"
FLAG_METADATA = "${FLAG_METADATA:-FLAG{metadata-default}}"

security_creds = {
    "Code": "Success",
    "LastUpdated": "2026-11-22T01:00:00Z",
    "Type": "AWS-HMAC",
    "AccessKeyId": "ASIA${FLAG_METADATA}",
    "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG+bPxRfiCY-${FLAG_METADATA}",
    "Token": "FwoGZXIvYXdzEBYaDHm_example_token",
    "Expiration": "2026-11-22T07:00:00Z"
}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    def do_GET(self):
        if self.path == "/latest/meta-data/iam/security-credentials/":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"app-role")
            return
        if self.path == "/latest/meta-data/iam/security-credentials/app-role":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(security_creds, indent=2).encode())
            return
        if self.path == "/latest/meta-data/":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"ami-id/\nami-manifest-path/\nhostname/\niam/\npublic-keys/\n")
            return
        self.send_response(404)
        self.end_headers()

print("IMDSv1 mock server starting on 127.0.0.1:8080 ...", flush=True)
http.server.ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
PYEOF

cat > /etc/systemd/system/imds-lab.service << 'UNIT'
[Unit]
Description=Dead3ars m15 Mock IMDSv1 Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/imds-lab/imds-server.py
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now imds-lab.service

# === Part 3: Container escape misconfiguration ===
mkdir -p /opt/deploy
cat > /opt/deploy/docker-compose.yml << 'COMPOSE'
version: "3.8"
services:
  app:
    image: app:latest
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /:/host-root:rw
    environment:
      - DEBUG=true
      - DOCKER_HOST=unix:///var/run/docker.sock
COMPOSE

cat > /opt/deploy/host-mount-audit.txt <<TXT
=== Container Mount Audit Report ===
Generated: 2026-11-22T02:00:00Z
Service: app

Privileged mode: YES - DANGER
Docker socket:   /var/run/docker.sock mounted - DANGER
Host mount:      / mounted read-write - DANGER
Audit Finding ID: ${FLAG_ESCAPE:-FLAG{escape-default}}

Risk: A container with --privileged + docker.sock mount
      can launch a new container with host filesystem access.
      This grants full root access to the underlying host OS.

Remediation:
  1. Remove privileged: true
  2. Drop all capabilities: cap_drop: [ALL]
  3. Remove docker.sock mount unless absolutely required
  4. Use read-only host mounts where possible
  5. Run as non-root USER in the container
TXT
chmod a+r /opt/deploy/docker-compose.yml /opt/deploy/host-mount-audit.txt

cat > /home/student/README-LAB.txt << 'TXT'
=== DEAD3ARS LAB: m15-container-cloud-security ===
Objectives (3 Flags):
1. [ci_secret]  Audit /opt/ci-runner/build.log for the unmasked deployment secret.
                  AWS_ACCESS_KEY_ID contains the flag in its last segment.
2. [metadata]   Query the local IMDSv1 endpoint at http://127.0.0.1:8080/latest/meta-data/
                  iam/security-credentials/ to retrieve temporary credentials.
                  The flag is embedded in the AccessKeyId field.
3. [escape]     Inspect /opt/deploy/docker-compose.yml and /opt/deploy/host-mount-audit.txt
                  to identify the host-escape misconfiguration.

Endpoints:
  GET http://127.0.0.1:8080/latest/meta-data/iam/security-credentials/
    -> Returns role name "app-role"
  GET http://127.0.0.1:8080/latest/meta-data/iam/security-credentials/app-role
    -> Returns JSON with AccessKeyId, SecretAccessKey, Token
TXT
chown student:student /home/student/README-LAB.txt
