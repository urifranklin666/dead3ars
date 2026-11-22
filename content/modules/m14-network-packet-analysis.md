---
id: m14-network-packet-analysis
order: 14
title: "Network Traffic and Packet Forensics"
tier: core
minutes: 105
summary: >-
  Host logs can be truncated or disabled, but packets on the wire do not lie. You will
  dissect a captured incident PCAP inside your isolated VM using tcpdump and Python,
  uncovering cleartext credential theft, HTTP data staging, and covert DNS tunneling.
objectives:
  - Filter and inspect packet captures using tcpdump BPF expressions and protocol dissectors.
  - Identify cleartext credentials and unencrypted session traffic on the wire.
  - Detect covert data exfiltration hidden inside HTTP payloads and DNS subdomain queries.
  - Propose network-level controls (TLS enforcement, egress DNS filtering) that close each path.
mitre: ["T1040", "T1071.001", "T1071.004", "T1048.003"]
cwe: ["CWE-319", "CWE-523"]
csf: ["DE.CM-01", "DE.AE-02", "PR.DS-02"]
owasp: []
attackTechniques:
  - "Network Sniffing (T1040)"
  - "Application Layer Protocol: Web Protocols (T1071.001)"
  - "Application Layer Protocol: DNS (T1071.004)"
  - "Exfiltration Over Unencrypted Non-C2 Protocol (T1048.003)"
defenses:
  - Enforce TLS 1.2/1.3 across all internal and external services so credentials never traverse in cleartext
  - Route all egress DNS through internal recursive resolvers with anomaly detection for high-entropy or oversized labels
  - Restrict outbound egress by default (deny-all firewall with explicit allowlists) to break covert C2 channels
  - Retain flow metadata (NetFlow/Zeek) alongside targeted packet captures for rapid incident reconstruction
lab:
  name: "Dissect an incident PCAP for credentials, HTTP exfil, and DNS tunneling"
  environment: analysis
  brief: >-
    Launch your in-browser KVM VM to analyze a pre-captured network PCAP at
    /var/captures/incident.pcap. Using tcpdump and strings/Python, you will extract a
    leaked cleartext credential, recover an HTTP exfiltration payload, and decode a covert
    DNS-tunneling query.
  steps:
    - do: "Click 'Launch Lab VM' above, open the terminal, and inspect /var/captures/incident.pcap and ~/README-LAB.txt."
      expect: "You confirm the PCAP file exists and list packet summaries with 'tcpdump -nn -r /var/captures/incident.pcap'."
    - do: "Filter for cleartext authentication traffic on TCP port 21/80 ('tcpdump -A -nn -r /var/captures/incident.pcap port 21 or port 80') to find the leaked credential flag."
      expect: "You spot an unencrypted login containing FLAG{creds_...} and submit it above."
    - do: "Inspect the HTTP POST traffic in the capture to locate the exfiltrated data payload and recover the [http_exfil] flag."
      expect: "You extract FLAG{http_exfil_...} from the POST body."
    - do: "Filter DNS queries ('tcpdump -nn -r /var/captures/incident.pcap port 53') to spot an unusually long subdomain label encoding data, and decode/extract the [dns_tunnel] flag."
      expect: "You uncover FLAG{dns_tunnel_...} hidden in the DNS query name."
    - do: "In your notes, list the network detection signature (Zeek/Suricata or DNS length/entropy heuristic) that would alert on each of the three findings."
      expect: "Three concrete network-layer detections documented."
  success:
    - Extracted all three network forensic flags ([creds], [http_exfil], [dns_tunnel]) from incident.pcap
    - Documented network detections and egress controls for each channel
  cleanup:
    - "The capture under /var/captures/ is read-only. Click 'Stop VM' when finished."
ethics:
  boundary: >-
    Only capture or inspect network traffic on networks you own or have explicit written
    authorization to monitor. Never run passive sniffers on shared, public, or workplace LANs.
  legal: >-
    Intercepting communications on a network without authorization violates wiretapping
    statutes (such as the US Wiretap Act / ECPA) in addition to computer-intrusion laws.
  disclosure: >-
    Treat packet captures as sensitive data — PCAPs frequently contain real passwords,
    session cookies, and personal information that must be stored encrypted and purged on schedule.
assessment:
  - q: "Why do attackers frequently use DNS (UDP/53) for covert command-and-control or exfiltration?"
    options:
      - "DNS packets are always encrypted with AES-256."
      - "Outbound DNS resolution is almost universally permitted through firewalls even when direct HTTP/TCP egress is blocked."
      - "DNS supports gigabyte-sized single packets."
      - "DNS queries never appear in packet captures."
    answer: 1
    explain: >-
      Even tightly segmented networks usually allow internal hosts to resolve domain names.
      Encoding data into subdomain labels lets an attacker smuggle small payloads out
      through recursive resolvers unless DNS egress is monitored and restricted.
  - q: "Which tcpdump flag prints packet payloads in ASCII so you can read unencrypted HTTP or FTP traffic?"
    options:
      - "-A"
      - "-c"
      - "-i"
      - "-w"
    answer: 0
    explain: >-
      tcpdump -A prints each packet's payload in ASCII (and -X prints both hex and ASCII),
      making cleartext protocols immediately readable during triage.
  - q: "What is the strongest indicator of DNS tunneling in passive DNS logs?"
    options:
      - "Queries for google.com returning A records."
      - "High-volume, high-entropy, unusually long unique subdomains sent to a single rarely-seen root domain."
      - "A single MX lookup for a mail server."
      - "Cached NXDOMAIN responses for a typoed URL."
    answer: 1
    explain: >-
      Tunneling tools encode binary chunks (base32/hex) into unique left-most labels so
      resolvers cannot serve cached answers, producing unmistakable bursts of long,
      high-entropy subdomains under one domain.
  - q: "Why does TLS eliminate passive credential sniffing on a local segment, and what remains visible?"
    options:
      - "TLS encrypts the entire Ethernet frame including MAC addresses."
      - "TLS encrypts application payloads (passwords, paths, bodies), while IP addresses, ports, packet sizes, timing, and SNI/certificate metadata remain visible."
      - "TLS makes all traffic look like DNS."
      - "TLS prevents firewalls from seeing destination IP addresses."
    answer: 1
    explain: >-
      Network defenders still rely on flow metadata, timing/beaconing cadence, JA3/JA4 TLS
      fingerprints, and SNI/DNS correlation even when payloads are encrypted.
  - q: "What is the most effective preventive control against cleartext credential exposure on internal networks?"
    options:
      - "Changing default TCP port numbers."
      - "Disabling legacy cleartext protocols (FTP, Telnet, plain HTTP) and mandating authenticated TLS everywhere."
      - "Compressing payloads with gzip."
      - "Turning off ARP on switches."
    answer: 1
    explain: >-
      Security by port obscurity fails immediately under packet inspection. Replacing
      cleartext protocols with TLS/SSH removes the exposure entirely.
---

## Scenario

An intrusion detection sensor flags unusual outbound DNS volume from a build server at
03:15 UTC. The host's local bash history was cleared, but a span-port packet capture
(`incident.pcap`) recorded three minutes of traffic. Your job is to reconstruct what left
the network directly from the wire.

## Attacker's view

When an internal service still speaks plain HTTP or FTP, passive sniffing on the segment
yields valid credentials with zero exploit noise. Once inside, the attacker stages small
sensitive files over HTTP POST to blend in with web traffic, and falls back to DNS
subdomain queries (`<encoded-chunk>.exfil.invalid`) when strict egress proxies block
unknown HTTP hosts.

## Defender's view

You do not need full packet capture everywhere to catch these patterns — Zeek/NetFlow logs
plus DNS resolver telemetry reveal:

* **Cleartext auth:** Any internal `USER`/`PASS` or HTTP `Authorization: Basic` on non-TLS
  ports is an immediate hygiene finding.
* **Anomalous HTTP egress:** Direct-to-IP POST requests or rare User-Agents from servers
  that should never initiate outbound web connections.
* **DNS tunneling:** Spikes in unique subdomain counts, label lengths > 40 chars, and high
  Shannon entropy targeting a single root domain.

## Key concepts

* **BPF Filtering:** Isolating relevant streams (`port 53`, `tcp port 80`, `host ...`)
  before inspecting payloads.
* **Cleartext Exposure (CWE-319):** Credentials and secrets sent without transport encryption.
* **Covert Channels (T1071.004):** Abusing permitted protocols like DNS to bypass egress rules.
