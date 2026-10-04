---
id: m11-ai-llm-attack-surface
order: 11
title: "The AI and LLM Attack Surface"
tier: advanced
minutes: 120
summary: >-
  Every organisation is now wiring a large language model into its workflows, and doing so
  imports a new class of flaw in which the untrusted input is *instructions*. This module
  covers the OWASP Top 10 for LLM Applications, prompt injection, and why an agent with tool
  access is an authority problem rather than a text problem.
objectives:
  - Explain prompt injection and why it is not a solved parsing problem.
  - Map an LLM system's components to the OWASP Top 10 for LLM Applications.
  - Describe how tool-using agents convert text injection into real-world action.
  - Identify the controls that bound an agent's blast radius, and their limits.
mitre: ["T1566", "T1190", "T1059", "T1078", "T1059.004"]
cwe: ["CWE-1426", "CWE-77", "CWE-284"]
csf: ["ID.RA-01", "PR.DS-01", "PR.AA-05", "DE.CM-01"]
owasp: ["LLM01:2025", "LLM02:2025", "LLM05:2025", "LLM06:2025", "LLM08:2025"]
attackTechniques:
  - "Command and Scripting Interpreter (T1059)"
  - "Phishing (T1566)"
  - "Valid Accounts (T1078)"
defenses:
  - Least-privilege credentials for every agent, designed on the assumption that injection will succeed
  - Human confirmation before any state-changing tool call, because the model's judgement cannot be the last gate
  - Treating model output as untrusted input at every downstream interpreter - database, shell, or browser
  - Keeping secrets and cross-tenant data out of any context the model can retrieve
  - Logging every tool call, so an agent's actions are reconstructable after the fact
lab:
  name: "Bound an agent, then escape it"
  environment: sandbox
  brief: >-
    Run a small local model or a sandboxed hosted model with a deliberately naive tool-using
    agent attached - file read, file write, and an HTTP fetch. Inject instructions through a
    poisoned document and observe what the agent does. Then add controls and try again.
  steps:
    - do: "Stand up the agent in your isolated lab with a file-read tool, a file-write tool, and an HTTP fetch tool, and confirm the model is reachable only from the lab."
      expect: "A working agent with three tools, and confirmation that no real external service is reachable."
    - do: "Write an ordinary document the agent is expected to summarise, then embed an instruction inside it that contradicts the operator's prompt."
      expect: "A document that is benign to a human reader and hostile to the model."
    - do: "Ask the agent to summarise the document. Observe whether it follows the embedded instruction - for example, to read a second file or fetch a URL."
      expect: "A recorded instance of the agent acting on injected content, with a transcript."
    - do: "If it acted, identify precisely where the trust boundary was crossed: was the tool call authorised against the operator, the user, or only the document?"
      expect: "A named boundary failure, not a general statement that injection happened."
    - do: "Add controls: strip or delimit untrusted content, require confirmation for state-changing tool calls, and restrict the agent's credentials to read-only where the task permits."
      expect: "Specific control changes, at specific points in the pipeline."
    - do: "Retry the same injection and record what changed, including any variant that still succeeds."
      expect: "Either the injection fails, or you have documented the residual bypass - both are results."
  success:
    - A recorded injection that caused the agent to act, with a transcript
    - The exact trust boundary that was crossed, named
    - Controls applied, and the residual bypass documented rather than hidden
  cleanup:
    - "Delete the poisoned document and any files the agent wrote."
    - "No external service was contacted during the exercise; if the fetch tool was enabled, it pointed at a lab-only address."
ethics:
  boundary: >-
    Everything here runs against a local model or a sandboxed one, in your isolated lab, with
    tools that reach nothing real. Do not run prompt injection against a production AI service
    - even a read-only attempt - because you cannot know what it will do with its credentials.
    Prompt injection against a third-party service is an attempt to make that service act in
    ways its operator did not authorise, which is exactly the definition you have been using
    for everything else in this course.
  legal: >-
    Manipulating a system you do not own is unauthorized access whatever the interface is: an
    API, a chat box, or a document you place in front of someone else's agent. Where an agent
    holds credentials, this shades into fraud and into data-protection offences if personal
    data is disclosed. Reporting an injection flaw in a vendor's product goes through their
    security policy, not through their production deployment.
  disclosure: >-
    LLM flaws are frequently architectural rather than patchable, so reports are most useful
    when they describe the trust boundary that failed and a concrete control, not just a
    payload. Give the vendor time: this field moves quickly, and a public demonstration before
    a mitigation exists exposes every deployment. Do not publish a working payload against a
    specific named service.
  notes: >-
    Record the model identifier, version, and the exact prompt and document that produced the
    behaviour. LLM behaviour varies by model and by version, so an unreproducible claim is
    close to worthless.
assessment:
  - q: "Why is prompt injection not solved by better parsing of the model's input?"
    options:
      - "Because parsers are slow."
      - "Because the model has no reliable separation between instructions and data - both arrive as text in the same channel, so an attacker who controls any text the model reads controls part of the instruction stream."
      - "Because the model is too small."
      - "Because prompts are encrypted."
    answer: 1
    explain: >-
      This is the central architectural weakness. In a database the driver keeps code and data
      distinct; in an LLM they occupy the same channel and the same format. Every mitigation
      is therefore probabilistic - delimiters, filtering, training - rather than a guarantee,
      which is why the design assumption must be that injected instructions can succeed.
  - q: "An agent summarises web pages and also holds a token that can send email. Which is the correct primary control?"
    options:
      - "A better system prompt."
      - "Reduce the agent's authority: scope its credentials to the minimum the task needs, and require human confirmation for state-changing actions, because the model's judgement cannot be the last gate on a privileged action."
      - "Blocking all web pages."
      - "Increasing the model's context window."
    answer: 1
    explain: >-
      Prompt engineering is not an authorization control. When an agent can act, the risk is
      the authority it holds, so the fix is in the authority. Least privilege on the
      credentials, confirmation on side effects, and audit logging of every tool call are what
      bound the blast radius when - not if - an injection succeeds.
  - q: "Which OWASP LLM category covers an attack that makes the model reveal its own system prompt or another user's context?"
    options:
      - "LLM01 Prompt Injection"
      - "LLM02 Sensitive Information Disclosure"
      - "LLM05 Improper Output Handling"
      - "LLM08 Vector and Embedding Weaknesses"
    answer: 1
    explain: >-
      Sensitive information disclosure is about what the model reveals - system prompts,
      other users' data held in the same context, secrets present in retrieval stores. It is
      closely related to prompt injection, which is one common route to it, but the categories
      are separate because the controls differ: injection is controlled by treating inputs as
      untrusted, disclosure by not placing sensitive data where the model can retrieve it.
  - q: "Why is improper output handling (LLM05) a serious category even when the model itself is well behaved?"
    options:
      - "Because output is always wrong."
      - "Because downstream systems may execute the model's output - as SQL, shell input, or HTML - so a well-intentioned answer becomes code, reproducing the injection problem one layer down."
      - "Because outputs are too long."
      - "Because outputs are not logged."
    answer: 1
    explain: >-
      The model's output is untrusted data, exactly like a user's form submission. If it reaches
      a database driver, a shell, or a browser without context-appropriate handling, you have
      reintroduced module 7's injection flaws with a new source of input. The remediation is
      the same discipline: parameterise, encode, validate - do not trust the source because it
      is your own system.
  - q: "Your lab agent obeys an injected instruction despite a strict system prompt saying never to. What does the result best demonstrate?"
    options:
      - "That you wrote the prompt badly."
      - "That instruction-following is not an enforcement mechanism: the system prompt is guidance to a probabilistic system, whereas the control that holds is the authority granted to the tools."
      - "That the model is broken."
      - "That injection is only possible in labs."
    answer: 1
    explain: >-
      The value of the exercise is exactly this asymmetry. Prompt-level defences are advice;
      capability-level defences are enforcement. Design so that a fully compromised model
      still cannot cause unacceptable harm - that is the same principle as assuming a
      compromised workstation in module 8, applied to a new kind of host.
---

The newest attack surface in this course is also the one most organisations adopted before
they secured it. Large language models are now in workflows, and a model that reads
untrusted text has a class of flaw in which the untrusted text is instructions.

## Scenario

Your lab runs a small agent: it can read files, write files, and fetch a URL. Its job is to
summarise documents. One of those documents has been written by someone who wants the agent
to do something else. You are going to be that someone, and then you are going to make it
stop working.

## Attacker's view

The defining fact of LLM security is that the model receives instructions and data in the
**same channel**, as undelimited natural language. There is no equivalent of a parameterised
query, because there is no parser that knows the difference between the sentence asking for
a summary and the sentence telling the agent what to do. Prompt injection is the
consequence, and it is not a bug that a patch removes — it is a property of the architecture.

The attacker's job is therefore easy in concept and gets easier with each tool the agent
holds. A poisoned document is enough to make a summariser leak; a poisoned web page is enough
to make a browser agent act. The severity is determined entirely by the authority the agent
carries: read a file, and the damage is disclosure; hold a token that can send mail or
execute code, and the damage is whatever that token can do.

The second attack class is at the other end. Vector and embedding weaknesses (LLM08) let an
attacker plant content in a retrieval store that the model later treats as authoritative
context — the equivalent of poisoning a reference book the model consults. Sensitive
information disclosure (LLM02) is usually the objective: the system prompt, another user's
session, or secrets that were placed in the retrieval corpus and never meant to be read out.

## Defender's view

The controls in this space are young, and honesty about their limits matters more here than
anywhere else in the course.

- **Assume injection succeeds.** Once that is the design assumption, every other control
  becomes concrete. It is the same discipline as assuming a compromised endpoint.
- **Bound the authority (LLM06, excessive agency).** Least privilege on every credential the
  agent holds. Read-only where the task allows. The agent should not be able to exceed what
  the user on whose behalf it acts could do.
- **Human confirmation for state-changing actions.** The model's judgement cannot be the last
  gate before an irreversible side effect. Confirmation is not friction; it is the control.
- **Treat model output as untrusted (LLM05).** Parameterise, encode, and validate anything the
  model produces before it reaches a database, a shell, or a browser.
- **Keep sensitive data out of reach (LLM02).** Do not put secrets or cross-tenant data in a
  context the model can retrieve. Redaction and retrieval scoping are architectural decisions.
- **Log every tool call.** An agent's actions should be reconstructible after the fact — which
  is the same requirement as module 9's detection logging, applied to a new actor.

The regulatory picture is moving quickly, and an organisation deploying an agent should
check its current obligations in its own jurisdiction rather than rely on a general
description. What is stable is the engineering principle: **capability limits are
enforcement; prompt instructions are advice.**

## Key concepts

**Instructions and data share a channel.** The architectural fact behind prompt injection, and
the reason it has no complete fix.

**Authority is the blast radius.** The same injection against a summariser and against an
agent with a mail token are different incidents entirely.

**Output is untrusted input.** The injection problem recurs one layer down if the model's
answer reaches an interpreter.

**Prompt-level defences are advice; capability-level defences are enforcement.** Design for a
model that is fully compromised.

## Further reading

- OWASP Top 10 for LLM Applications (check the current edition for the numbering used here)
  and the OWASP GenAI Security Project's guidance.
- MITRE ATLAS, for adversarial techniques against AI systems, as a companion to ATT&CK.
- NIST's work on AI risk management, for the governance vocabulary around deployments.
