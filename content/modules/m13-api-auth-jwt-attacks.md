---
id: m13-api-auth-jwt-attacks
order: 13
title: "Modern API, OAuth, and JWT Security"
tier: core
minutes: 105
summary: >-
  Modern applications expose business logic directly over JSON APIs secured by bearer
  tokens rather than server-rendered HTML forms. You will exploit BOLA, mass assignment,
  and broken JWT verification against an isolated API inside your VM, then map each flaw
  to the server-side control that eliminates it.
objectives:
  - Identify and exploit Broken Object Level Authorization (BOLA) in a REST API.
  - Demonstrate mass assignment by injecting privileged fields into a profile update.
  - Explain and exploit JWT algorithm confusion (alg none) and weak HMAC signing keys.
  - Pair each API flaw with the OWASP API Security Top 10 category and server-side fix.
mitre: ["T1190", "T1550.001", "T1078"]
cwe: ["CWE-639", "CWE-915", "CWE-347", "CWE-285"]
csf: ["PR.AA-01", "PR.AA-05", "DE.CM-01"]
owasp: ["API1:2023", "API2:2023", "API3:2023"]
attackTechniques:
  - "Exploit Public-Facing Application (T1190)"
  - "Use Alternate Authentication Material: Application Access Token (T1550.001)"
  - "Valid Accounts (T1078)"
defenses:
  - Enforce object-level ownership checks on every resource endpoint next to the data query
  - Use explicit input allowlists (DTOs/schemas) so clients can never overwrite privileged fields like role or tier
  - Pin expected JWT algorithms server-side, reject alg=none, and use high-entropy keys or asymmetric RS256/EdDSA
  - Keep access tokens short-lived and log anomalous cross-tenant or role-elevation requests
lab:
  name: "Exploit a local REST API: BOLA, mass assignment, and JWT forgery"
  environment: sandbox
  brief: >-
    Launch your in-browser KVM VM, which runs a deliberately vulnerable Python REST API at
    http://127.0.0.1:8080 (source at /opt/api-lab/server.py). You will obtain a standard
    user JWT, exploit Broken Object Level Authorization, abuse mass assignment to elevate
    your account role, and forge an admin JWT using alg=none.
  steps:
    - do: "Click 'Launch Lab VM' above, open the terminal, and read ~/README-LAB.txt. Confirm the API responds at http://127.0.0.1:8080/health."
      expect: "The local API returns status ok and lists available endpoints."
    - do: "Log in as alice/alice123 via POST /api/login to obtain a bearer JWT, then query /api/invoices/1001 (BOLA) instead of your own invoice (/api/invoices/1002)."
      expect: "The API returns another tenant's invoice containing your unique FLAG{bola_...}."
    - do: "Update your profile via POST /api/profile with a JSON body that injects role='admin' (mass assignment), then query /api/staff/secret with your updated profile."
      expect: "The API accepts the injected role field and returns FLAG{mass_assign_...}."
    - do: "Forge a JWT with header {\"alg\":\"none\",\"typ\":\"JWT\"} and payload {\"sub\":\"admin\",\"role\":\"superadmin\"} (empty signature) against /api/superadmin."
      expect: "The server accepts the unsigned token and returns FLAG{jwt_...}."
    - do: "Inspect /opt/api-lab/server.py and record the exact server-side fix for each of the three vulnerabilities."
      expect: "Three concrete code-level remediations documented in your notes."
  success:
    - Captured all three API flags ([bola], [mass_assign], [jwt]) against the local target
    - Documented the schema allowlist, ownership check, and JWT algorithm-pinning fixes
  cleanup:
    - "Click 'Reset VM' or 'Stop VM' when finished. All traffic remained strictly on loopback."
ethics:
  boundary: >-
    Never test API authorization boundaries, token forgery, or object enumeration against
    third-party services or accounts you do not own and have written permission to assess.
  legal: >-
    Accessing another user's records by changing an object ID or forging a bearer token
    without authorization constitutes unauthorized access under the CFAA and Computer Misuse Act.
  disclosure: >-
    Report BOLA or token-validation bugs privately with minimal proof (a single redacted
    test account ID) rather than bulk-dumping customer records.
assessment:
  - q: "What makes Broken Object Level Authorization (BOLA / API1) the most common API vulnerability?"
    options:
      - "Developers often authenticate the caller's token but forget to verify that the caller owns the specific object ID requested."
      - "JSON cannot carry authorization headers."
      - "REST APIs do not support TLS."
      - "Browsers strip bearer tokens on GET requests."
    answer: 0
    explain: >-
      Authentication proves who is calling, not what they are allowed to touch. Without a
      per-object ownership or tenant check tied to the authenticated user ID, any valid
      token can read or modify other users' records simply by changing an identifier.
  - q: "How does mass assignment (CWE-915) lead to privilege escalation?"
    options:
      - "By sending oversized HTTP headers that overflow the server."
      - "By binding client-supplied JSON fields directly onto internal user models, allowing attackers to set sensitive fields like role or is_admin."
      - "By flooding the database with concurrent connections."
      - "By forcing the API to return XML instead of JSON."
    answer: 1
    explain: >-
      When an API blindly merges request JSON into a database record or object without an
      explicit field allowlist (DTO/schema), an attacker can include unexposed attributes
      such as role, verified, or credit_balance.
  - q: "Why is accepting the 'alg' header from an untrusted JWT dangerous?"
    options:
      - "It increases token size by several kilobytes."
      - "An attacker can specify alg=none (skipping signature checks) or switch RS256 to HS256 using the server's public key as the HMAC secret."
      - "It disables HTTPS on the API gateway."
      - "It exposes the database password inside the header."
    answer: 1
    explain: >-
      A JWT header is attacker-controlled input until verified. The server must enforce a
      strict allowlist of expected algorithms configured server-side, never trusting the
      token's own alg claim to decide how to verify it.
  - q: "Which control is the primary defense against mass assignment?"
    options:
      - "Hiding the role field in the frontend form."
      - "Validating and picking only explicitly permitted fields on the server before writing to storage."
      - "Base64-encoding the JSON body."
      - "Rate-limiting POST requests to 10 per minute."
    answer: 1
    explain: >-
      Frontend restrictions are trivially bypassed with curl. Only server-side allowlisting
      of writable fields guarantees that privileged columns cannot be modified by clients.
  - q: "What is the best practice for limiting the blast radius of a stolen JWT access token?"
    options:
      - "Store the JWT in a public URL query parameter."
      - "Use short token lifetimes, rotate refresh tokens with revocation support, and bind high-risk actions to fresh authentication."
      - "Set the expiration to 1 year so users never re-authenticate."
      - "Use a 4-character HMAC secret for faster verification."
    answer: 1
    explain: >-
      Because stateless JWTs remain valid until expiry unless checked against a revocation
      list, short access-token TTLs paired with revocable refresh tokens sharply reduce the
      window an attacker gets from a leaked token.
---

## Scenario

A SaaS billing team ships a clean React frontend backed by a stateless JSON REST API.
Every endpoint checks for a valid `Authorization: Bearer` header, so the team assumes
authorization is handled. Within a week of launch, a single authenticated user enumerates
every invoice in the database, promotes their own account to `admin` via a profile update,
and mints an unsigned `superadmin` token.

## Attacker's view

APIs are self-documenting and forgiving. The attacker logs in with a normal account,
captures their JWT, and probes three predictable seams:

1. **Object IDs (BOLA):** Swap `/api/invoices/1002` for `/api/invoices/1001`. If the
   query only filters by `WHERE id = ?` instead of `WHERE id = ? AND owner_id = ?`, the
   server hands over another tenant's data.
2. **Writable models (Mass Assignment):** Inspect the JSON returned by `GET /api/profile`
   — it includes `"role": "user"`. Send `{"name": "Alice", "role": "admin"}` to
   `POST /api/profile` and see if the backend writes every key it receives.
3. **Token verification (JWT):** Decode the base64url header and payload. Test whether the
   verifier accepts `"alg": "none"` with an empty signature, or brute-force a weak HMAC
   secret offline.

## Defender's view

Every API route needs three independent guarantees enforced server-side:

* **Strict token verification:** Pin the allowed algorithm (`HS256` with a 256-bit secret or
  asymmetric `RS256`/`EdDSA`), verify `exp`/`iss`/`aud`, and never accept `alg: none`.
* **Explicit input schemas:** Parse request bodies through a strict schema (e.g. `zod` or
  Pydantic) that strips unknown fields before touching the database.
* **Object-level authorization:** Scope every read/write query by the authenticated caller's
  `user_id` or `tenant_id`, and emit structured audit logs whenever a user requests an
  object they do not own.

## Key concepts

* **BOLA (API1:2023):** Missing ownership check on an object identifier — the API-era
  evolution of IDOR.
* **Mass Assignment (API3:2023 / CWE-915):** Accepting unvalidated client properties into
  internal models.
* **JWT `alg: none` & Key Confusion (CWE-347):** Letting untrusted token headers dictate
  cryptographic verification logic.
