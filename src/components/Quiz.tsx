'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Graded {
  score: number;
  total: number;
  passed: boolean;
  results: { correct: boolean; answer: number; explain: string }[];
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function Quiz({
  moduleId,
  questions,
  signedIn,
}: {
  moduleId: string;
  questions: { q: string; options: string[] }[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<number[]>(() => questions.map(() => -1));
  const [graded, setGraded] = useState<Graded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = picked.filter((p) => p >= 0).length;
  const ready = answered === questions.length;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moduleId, answers: picked }),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<Graded> & { error?: string };
    setBusy(false);

    if (!res.ok || !data.results) {
      setError(data.error ?? 'Could not grade the answers.');
      return;
    }
    setGraded(data as Graded);
    /* The server has recorded the attempt; refresh so any progress badge updates. */
    router.refresh();
  }

  function retry() {
    setGraded(null);
    setPicked(questions.map(() => -1));
  }

  if (!signedIn) {
    return (
      <div className="dz-card p-5 text-sm text-muted">
        The assessment is graded on the server so the answer key never reaches your browser.
        Sign in to take it and to have the result recorded.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, qi) => {
        const result = graded?.results[qi];
        return (
          <div key={qi} className="dz-card p-5">
            <p className="font-medium">
              <span className="mr-2 font-mono text-sm text-muted">{qi + 1}.</span>
              {question.q}
            </p>

            <div className="mt-3 space-y-1.5">
              {question.options.map((option, oi) => {
                let cls = 'border-line';
                if (graded) {
                  if (oi === result?.answer) cls = 'border-accent-2 bg-accent-2/10';
                  else if (oi === picked[qi]) cls = 'border-danger bg-danger/10';
                } else if (oi === picked[qi]) {
                  cls = 'border-accent bg-accent/10';
                }

                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={graded !== null}
                    onClick={() =>
                      setPicked((prev) => prev.map((p, i) => (i === qi ? oi : p)))
                    }
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${cls}`}
                  >
                    <span className="font-mono text-xs text-muted">{LETTERS[oi]}</span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {result && (
              <div className="mt-3 border-t border-line pt-3 text-sm">
                <p className={result.correct ? 'text-accent-2' : 'text-danger'}>
                  {result.correct ? 'Correct.' : `Not quite — the answer is ${LETTERS[result.answer]}.`}
                </p>
                <p className="mt-1.5 leading-relaxed text-muted">{result.explain}</p>
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {graded ? (
        <div className="dz-card flex flex-wrap items-center gap-4 p-5">
          <p className="font-mono text-2xl font-bold text-accent">
            {graded.score}/{graded.total}
          </p>
          <p className="text-sm">
            {graded.passed ? (
              <span className="text-accent-2">Passed — this module is marked assessment-complete.</span>
            ) : (
              <span className="text-warn">
                Below the 70% pass mark. Review the explanations and try again.
              </span>
            )}
          </p>
          <button type="button" className="dz-btn ml-auto" onClick={retry}>
            Try again
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="dz-btn dz-btn-primary"
            disabled={!ready || busy}
            onClick={submit}
          >
            {busy ? 'Grading…' : 'Submit answers'}
          </button>
          <span className="text-sm text-muted">
            {ready ? 'Answers are revealed after you submit.' : `${answered}/${questions.length} answered`}
          </span>
        </div>
      )}
    </div>
  );
}
