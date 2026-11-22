'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

const evidence = [
  { time: '09:12', label: 'New sign-in', detail: 'A staff account signs in from a device the organisation has never seen.' },
  { time: '09:13', label: 'Inbox rule created', detail: 'The account creates a rule that forwards incoming messages to an external address.' },
  { time: '09:15', label: 'Staff report', detail: 'The account owner confirms they did not sign in or create the rule.' },
];

const responses = [
  { label: 'Wait for another alert', feedback: 'The staff report and forwarding rule already justify containment. Waiting gives the session more time to expose mail.' },
  { label: 'Revoke the session and stop forwarding', feedback: 'Correct. Revoking the session cuts off current access, and removing the rule stops further forwarding. Preserve the audit records for the investigation.' },
  { label: 'Delete the sign-in records', feedback: 'Keep those records. They help establish when access began and what was affected.' },
];

export function IncidentPreview() {
  const [selected, setSelected] = useState(0);
  const [reviewed, setReviewed] = useState([0]);
  const [response, setResponse] = useState<number | null>(null);
  const firstClue = useRef<HTMLButtonElement>(null);
  const ready = reviewed.length === evidence.length;
  const correct = response === 1;

  return (
    <section id="incident-preview" className="incident-preview course-section" aria-labelledby="incident-title">
      <div className="incident-header">
        <p className="course-kicker">Interactive preview · fictional incident</p>
        <h2 id="incident-title">Take the first shift.</h2>
        <p className="text-muted">An unusual sign-in lands in your queue. Review three clues and decide how to contain the incident.</p>
      </div>

      <div className="incident-console">
        <div className="incident-timeline">
          <h3>Evidence timeline</h3>
          {evidence.map((item, index) => (
            <button
              key={item.label}
              ref={index === 0 ? firstClue : undefined}
              type="button"
              aria-pressed={selected === index}
              className="incident-event"
              onClick={() => {
                setSelected(index);
                setReviewed((current) => current.includes(index) ? current : [...current, index]);
              }}
            >
              <time>{item.time}</time>
              <span>{item.label}</span>
              {reviewed.includes(index) && <span className="incident-reviewed"><span aria-hidden="true">✓</span><span className="sr-only"> Reviewed</span></span>}
            </button>
          ))}
        </div>

        <div className="incident-detail">
          <div aria-live="polite">
            <p className="course-kicker">{reviewed.length} of {evidence.length} clues reviewed</p>
            <h3>{evidence[selected].label}</h3>
            <p className="text-muted">{evidence[selected].detail}</p>
          </div>
          <fieldset className="incident-actions" disabled={!ready}>
            <legend>What would you do first?</legend>
            {!ready && <p className="mb-3 text-sm text-muted">Review every clue to choose a response.</p>}
            {responses.map((option, index) => (
              <button key={option.label} type="button" className="dz-btn" aria-pressed={response === index} onClick={() => setResponse(index)}>
                {option.label}
              </button>
            ))}
          </fieldset>
          <div aria-live="polite">
            {response !== null && (
              <p className={`incident-feedback ${correct ? 'incident-success' : ''}`}>{responses[response].feedback}</p>
            )}
          </div>
          {correct && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href="/modules" className="dz-btn dz-btn-primary">Explore the course</Link>
              <button type="button" className="dz-btn" onClick={() => {
                setReviewed([0]);
                setSelected(0);
                setResponse(null);
                firstClue.current?.focus();
              }}>Replay</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
