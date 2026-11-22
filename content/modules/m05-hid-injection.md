---
id: m05-hid-injection
order: 5
title: "Hardware Attacks and HID Injection"
tier: core
minutes: 90
summary: >-
  The keyboard is a trusted input device, and any device that claims to be one inherits
  that trust. You will build and run a Digispark-class programmable HID on a lab VM, then
  detect it with the telemetry a defender actually has.
objectives:
  - Explain why USB HID injection bypasses most endpoint defenses.
  - Build and flash a payload for an ATtiny85 board, respecting the platform's constraints.
  - Correlate the injection with the process-creation events it causes.
  - Describe the defensive controls that reduce HID trust, and their limits.
mitre: ["T1200", "T1059.001", "T1547.001", "T1555", "T1069.001"]
cwe: ["CWE-1299"]
csf: ["PR.AA-01", "PR.PS-01", "DE.CM-01"]
owasp: []
attackTechniques:
  - "Hardware Additions (T1200)"
  - "Command and Scripting Interpreter: PowerShell (T1059.001)"
  - "Boot or Logon Autostart Execution: Registry Run Keys (T1547.001)"
  - "Credentials from Password Stores (T1555)"
  - "Permission Groups Discovery: Local Groups (T1069.001)"
defenses:
  - Device-control policy restricting which device classes may attach, with authorisation for managed hardware
  - Process-creation logging, so the consequence of injection is recorded even though the keystrokes are not
  - Alerting on logon-autostart registry writes from a shell launched moments earlier
  - Physical access control and port locking on unattended machines
lab:
  name: "Analyze a BadUSB HID payload and rogue USB audit log"
  environment: sandbox
  brief: >-
    Launch your in-browser KVM VM to examine a captured DuckyScript HID injection payload
    and kernel USB enumeration log in /opt/hid-samples/. You will safely deobfuscate the
    stage-2 command without executing it, identify the rogue HID device fingerprint, and
    document the defensive controls that block unauthorized keyboards.
  steps:
    - do: "Click 'Launch Lab VM' above, open the terminal, and read ~/README-LAB.txt and list /opt/hid-samples/."
      expect: "You see payload.dd (DuckyScript) and usb-audit.log."
    - do: "Inspect /opt/hid-samples/payload.dd. Note the initial DELAY, the GUI r keystroke sequence, and the base64-encoded stage-2 string."
      expect: "You can explain why the payload pauses before typing and how it mimics a human pressing Win+R."
    - do: "Decode the base64 string safely (e.g. 'echo <b64> | base64 -d') without executing it to capture the [decode] flag."
      expect: "You recover your unique FLAG{decode_...} and submit it above."
    - do: "Inspect /opt/hid-samples/usb-audit.log to identify the vendor/product IDs (Teensyduino HID) and extract the SerialNumber for the [usb] flag."
      expect: "You capture your unique FLAG{usb_...} and note the idVendor/idProduct fields a USBGuard policy would block."
    - do: "Record in your notes how USBGuard / device-control allowlists and process-creation logging (explorer.exe spawning a shell) work together as defense-in-depth."
      expect: "Both preventive (USB allowlist) and detective (process ancestry) controls documented."
  success:
    - Decoded the obfuscated DuckyScript stage-2 payload safely and captured [decode]
    - Identified the rogue HID device attributes in usb-audit.log and captured [usb]
    - Documented preventive and detective controls for HID injection
  cleanup:
    - "Click 'Stop VM' when finished. Never run untrusted DuckyScript payloads on a real host."
ethics:
  boundary: >-
    The board stays attached to the lab VM only. A programmable HID device is
    indistinguishable from a keyboard, so running it against a machine you do not own is
    functionally identical to sitting at that machine and typing - which is unauthorized
    access. The point of this module is the detection diff, and that requires an owned VM
    anyway.
  legal: >-
    Introducing a device or a payload to a computer you do not own or have written
    authorization to test is unauthorized access under the CFAA, the UK Computer Misuse Act,
    and equivalent statutes, and is aggravated by the fact that it is concealed. Hardware
    attacks also frequently fall under laws about computer misuse and, in some contexts,
    device tampering - the physical act does not make it less criminal, it makes it more so.
  disclosure: >-
    If you discover a HID trust issue in a real product - for instance, a device-class
    authorization weakness in an operating system or a kiosk - report it privately to the
    vendor. Do not demonstrate it on hardware you do not own, and do not leave a device
    plugged into a machine that is not yours.
assessment:
  - q: "Why does USB HID injection bypass most endpoint defense?"
    options:
      - "Because the payload is encrypted."
      - "Because the operating system trusts its keyboard, and the injected keystrokes arrive through that same trusted, driver-signed path as a human's."
      - "Because HID devices cannot be logged."
      - "Because it exploits a memory-corruption bug in the USB stack."
    answer: 1
    explain: >-
      The attack does not break into the input path; it uses it legitimately. The device is a
      keyboard as far as the OS is concerned, so there is no exploit to detect. This is why
      defense has to look at the consequences - processes created, keys written, connections
      opened - rather than at the input itself.
  - q: "Which ATT&CK technique ID covers the physical introduction of a malicious USB device?"
    options:
      - "T1200 Hardware Additions"
      - "T1091 Replication Through Removable Media"
      - "T1547.001 Registry Run Keys"
      - "T1059.001 PowerShell"
    answer: 0
    explain: >-
      T1200 is the introduction of hardware. T1091 is the related but distinct technique of
      spreading via removable media, which is about propagation rather than initial
      introduction. Being precise here matters in a report because the mitigations differ:
      port control and physical security address T1200, while disabling autorun and scanning
      media addresses T1091.
  - q: "You flash a payload and nothing is typed on the VM. Of these causes, which is the most common for a Digispark-class board?"
    options:
      - "The ATtiny85 has insufficient memory."
      - "The host did not finish enumerating the device before the sketch began typing, or the sketch used a plain delay() that starved the USB stack."
      - "The board is broken."
      - "Windows requires a driver for HID keyboards."
    answer: 1
    explain: >-
      Timing and USB servicing are the classic failure modes. The board enumerates the moment
      it is powered, so the sketch must poll the USB stack for a few seconds first, and it must
      keep polling between keystrokes - on this platform that means the library's own delay
      function, not the standard one.
  - q: "Which single event is the strongest defensive signal in this exercise?"
    options:
      - "The Calculator window appearing."
      - "The USB device being plugged in."
      - "The registry value being written under the Run key."
      - "The PowerShell process starting."
    answer: 2
    explain: >-
      Writing to a logon autostart location is a persistence action with almost no legitimate
      explanation coming from a Run-dialog-launched shell. Process creation is expected from
      any injection; the Run-key write tells you the injection had a lasting goal. The device
      plug-in event is useful corroboration but is easy to miss and noisy on its own.
  - q: "Which defensive control most directly reduces the HID trust problem, and what is its practical limit?"
    options:
      - "Antivirus - it will block all keyboard devices."
      - "Device control policy that restricts which device classes may attach, limited because trusted keyboards are operationally necessary so the policy cannot simply block HID."
      - "Disabling USB ports entirely - a limit-free control."
      - "Password-protecting the BIOS."
    answer: 1
    explain: >-
      Restricting device classes and requiring authorized hardware reduces the attack surface,
      but you cannot ban keyboards from a workstation. That is the honest limit, and it is why
      behavioural detection of the consequences remains necessary rather than optional.
---

Somewhere in your memory of this course you have a folder called badusb-lab. If you have
not built it yet, do that first. This module adds no new hardware; it adds the part that
matters, which is knowing what the attack looks like from the other side.

## Scenario

A workstation in your lab VM represents a staff machine at an office. An attacker with
brief physical access plugs a small board into a USB port. It is not a keyboard to anyone
watching; it is a keyboard to Windows. By the time someone notices, a payload has run.

## Attacker's view

The whole technique rests on one fact: the operating system trusts its keyboard. A USB HID
device declares what it is, and once the host accepts that declaration, every subsequent
keystroke travels the same trusted path as a human's. There is no exploit to sign, no
malformed packet to catch, no memory corruption to detect. The OS is not being fooled; it
is doing exactly what it was designed to do.

That is why injection is fast and quiet relative to its effect. The physical access
requirement is the real constraint. It also makes the technique attractive in scenarios
where physical access is plausible: an unattended reception desk, a shared kiosk, a
contractor's laptop between meetings.

The tradecraft is constrained by the target, not the attacker's ambition. The Run dialog
caps at 259 characters, so the first command must be small and fetch the rest, or the
injection must open a shell and type into it. The board's own firmware has to keep servicing
USB while typing, which is why timing bugs produce a payload that simply types nothing.

## Defender's view

You cannot cleanly distinguish an injected keystroke from a human one, so defenders stop
watching input and start watching consequences. This module is where that principle becomes
concrete.

- **Process creation (T1059.001).** A Run-dialog launch produces a specific shape: a shell
  whose parent is explorer.exe. A scheduled task's shell has a different parent. That
  difference is the signal.
- **Registry Run keys (T1547.001).** A write to a logon autostart key from a shell that was
  launched moments ago has almost no legitimate explanation.
- **Credential access (T1555).** Commands that export saved secrets — Wi-Fi keys, browser
  stores — stand out by their options, such as an export in cleartext.
- **Device installation.** A new keyboard that appeared minutes ago is corroboration. It is
  noisy on shared hardware, so it supports rather than leads.

The honest limit of defense here is that you cannot ban keyboards. You can constrain which
devices are trusted, log device attachment, and above all detect the behavioural
consequences. That combination is the professional answer, and it is why the deliverable of
this lab is a *diff*, not a successful injection.

## Key concepts

**Inherited trust.** The attack is powerful because it borrows the trust the OS already
extends to input devices.

**Consequence over signature.** Detection is built on what the keystrokes cause, not on the
keystrokes.

**Physical access is the gate.** No physical access, no injection. Every control that
limits physical access to ports therefore has security value.

## Further reading

- MITRE ATT&CK T1200 Hardware Additions, and the technique pages for the IDs listed above.
- The badusb-lab repository's own README, for the flashing workflow and the Run-dialog
  character limit.
