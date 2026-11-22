---
id: m15-container-cloud-security
order: 15
title: "Containers, CI/CD, and Cloud Identity"
tier: advanced
minutes: 120
summary: >-
  Modern compromises rarely stop at a single Linux box — they pivot through CI/CD build
  logs, cloud instance metadata endpoints (IMDS), and over-privileged container mounts.
  You will exploit a simulated CI/CD pipeline, IMDSv1 metadata service, and container
  misconfiguration inside your VM, then lock down each boundary.
objectives:
  - Identify how leaked CI/CD environment variables and build artifacts expose cloud credentials.
  - Demonstrate credential theft via an unprotected instance metadata service (IMDSv1).
  - Explain why mounting /var/run/docker.sock or running privileged containers grants host root.
  - Specify the cloud/container hardening controls (IMDSv2, least-privilege IAM, rootless/non-privileged containers).
mitre: ["T1552.005", "T1611", "T1552.001", "T1195.002"]
cwe: ["CWE-250", "CWE-522", "CWE-918"]
csf: ["PR.AA-05", "PR.IR-01", "DE.CM-09"]
owasp: []
attackTechniques:
  - "Unsecured Credentials: Cloud Instance Metadata API (T1552.005)"
  - "Escape to Host (T1611)"
  - "Unsecured Credentials: Credentials In Files (T1552.001)"
  - "Compromise Software Supply Chain (T1195.002)"
defenses:
  - Enforce IMDSv2 (session-token required, hop limit 1) to block SSRF and container-based metadata theft
  - Never mount /var/run/docker.sock into untrusted workloads; run containers non-root with read-only rootfs and dropped capabilities
  - Use short-lived OIDC federation in CI/CD instead of static long-lived cloud keys, and mask secrets in build logs
  - Scope IAM roles to least privilege with explicit deny guardrails and alert on credentials used from unexpected IPs
lab:
  name: "Pivot through CI/CD leaks, IMDSv1 metadata, and container misconfigs"
  environment: sandbox
  brief: >-
    Launch your in-browser KVM VM, which simulates a cloud workload host: a leaked CI/CD
    build log in /opt/ci-runner/, a local mock Cloud Metadata Service (IMDSv1) at
    http://127.0.0.1:8080, and a misconfigured container deployment spec in /opt/deploy/.
  steps:
    - do: "Click 'Launch Lab VM' above, open the terminal, and read ~/README-LAB.txt."
      expect: "You see the simulated cloud/CI host paths and local metadata endpoint."
    - do: "Audit /opt/ci-runner/build.log and pipeline artifacts to find an unmasked deployment secret and submit the [ci_secret] flag."
      expect: "You uncover FLAG{ci_secret_...} leaked by a verbose debug step."
    - do: "Query the local mock IMDSv1 endpoint at http://127.0.0.1:8080/latest/meta-data/iam/security-credentials/ (with curl) to retrieve temporary cloud role credentials and the [metadata] flag."
      expect: "IMDSv1 returns role credentials without requiring a session token, revealing FLAG{metadata_...}."
    - do: "Inspect /opt/deploy/docker-compose.yml and /opt/deploy/host-mount-audit.txt to identify the host-escape misconfiguration (privileged + host root/socket mount) and capture the [escape] flag."
      expect: "You identify the exact escape vector and capture FLAG{escape_...}."
    - do: "In your notes, write the hardened version of the compose file (non-root user, cap_drop: ALL, no socket mount) and explain how IMDSv2 hop-limit=1 stops container metadata theft."
      expect: "Hardened container spec and IMDSv2 explanation documented."
  success:
    - Captured all three cloud/container flags ([ci_secret], [metadata], [escape])
    - Documented hardened container and IMDSv2/OIDC controls
  cleanup:
    - "Click 'Stop VM' when finished. No real cloud accounts or external endpoints were touched."
ethics:
  boundary: >-
    Never query cloud metadata endpoints, probe CI/CD runners, or attempt container escapes
    on cloud infrastructure or build systems without explicit written authorization.
  legal: >-
    Using stolen cloud IAM session tokens or escaping a shared container host without
    permission violates computer fraud laws and cloud provider terms of service.
  disclosure: >-
    If you discover leaked CI tokens in a public repository, notify the owner immediately
    so they can revoke and rotate the credentials — never test whether the key works.
assessment:
  - q: "Why does mounting /var/run/docker.sock inside a container effectively grant root access to the host?"
    options:
      - "The Docker daemon listens on root-level privileges, so any process that can talk to its socket can launch a privileged container mounting the host's / filesystem."
      - "It disables the host's SSH firewall."
      - "It copies /etc/shadow into the container automatically."
      - "It converts the container into a KVM virtual machine."
    answer: 0
    explain: >-
      Access to the Docker daemon socket is equivalent to root on the host: a container can
      ask the daemon to start a new container with --privileged and -v /:/host, giving full
      read/write access to the underlying host OS.
  - q: "How does IMDSv2 defend against SSRF and container-based metadata credential theft?"
    options:
      - "By moving the metadata IP to 8.8.8.8."
      - "By requiring a PUT request with a custom header to obtain a short-lived session token and enforcing an IP TTL hop limit of 1."
      - "By disabling IAM roles completely."
      - "By requiring a hardware YubiKey on every HTTP call."
    answer: 1
    explain: >-
      Simple GET-only SSRF cannot issue a PUT with custom headers, and a hop limit of 1
      prevents routed container packets from reaching the host metadata service.
  - q: "What is the primary security advantage of OIDC federation over static IAM keys in CI/CD pipelines?"
    options:
      - "OIDC tokens never expire."
      - "OIDC issues short-lived, workflow-scoped credentials dynamically, eliminating long-lived static secrets stored in CI settings."
      - "OIDC eliminates the need for version control."
      - "OIDC encrypts Docker images automatically."
    answer: 1
    explain: >-
      Static cloud access keys sit in CI vaults until rotated and can be exfiltrated from
      a single compromised build. OIDC tokens are minted per job and expire in minutes.
  - q: "Which container runtime hardening combination best limits post-exploitation impact inside a container?"
    options:
      - "Running as root with --privileged."
      - "Non-root USER, read-only root filesystem, cap_drop: ALL, and no-new-privileges."
      - "Disabling SELinux and AppArmor."
      - "Sharing the host PID and network namespaces."
    answer: 1
    explain: >-
      Dropping Linux capabilities, running non-root, and mounting the root filesystem
      read-only drastically reduces both host-escape primitives and in-container persistence.
  - q: "Why is 'printenv' or 'set -x' dangerous inside CI/CD build scripts?"
    options:
      - "It slows down the build by 50%."
      - "It can dump injected secrets into persistent build logs readable by anyone with repo or CI viewer access."
      - "It deletes the git history."
      - "It disables TLS verification."
    answer: 1
    explain: >-
      Debug tracing frequently prints environment variables and interpolated command lines
      before log-masking filters can redact derived or encoded values.
---

## Scenario

A fast-moving engineering team deploys microservices in containers built by a CI/CD
pipeline. A single SSRF bug or leaked build log would normally be a minor headache — until
the attacker discovers the host still serves IMDSv1 metadata credentials and a helper
container mounts `/var/run/docker.sock`.

## Attacker's view

Cloud and container environments turn configuration mistakes into instant lateral movement:

1. **CI/CD logs:** Search build output for `env`, debug traces, or hardcoded deploy tokens.
2. **IMDSv1 (`169.254.169.254`):** Issue a single unauthenticated `GET` to retrieve
   temporary IAM credentials attached to the instance profile.
3. **Container escape:** Check `id`, `capsh --print`, and mounts (`mount | grep docker.sock`).
   A mounted Docker socket or `--privileged` flag turns a container foothold into host root
   in one command.

## Defender's view

Treat container boundaries as defense-in-depth, not hard hypervisor walls:

* **Enforce IMDSv2** with `HttpPutResponseHopLimit=1` across every cloud instance.
* **Lock down containers:** Non-root user, `read_only: true`, `cap_drop: [ALL]`,
  `security_opt: [no-new-privileges:true]`, and never expose the Docker socket.
* **Short-lived CI identity:** Replace static cloud keys with OIDC workload identity
  scoped to specific branches and environments.

## Key concepts

* **IMDSv1 vs IMDSv2 (T1552.005):** Session-oriented metadata requests with hop-limit enforcement.
* **Container Escape (T1611):** Abusing host mounts, sockets, or Linux capabilities (`CAP_SYS_ADMIN`).
* **CI/CD Secret Hygiene:** Eliminating static keys and unmasked debug traces.
