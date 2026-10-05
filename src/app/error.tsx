'use client';

import { useEffect } from 'react';

/*
 * Route-level error boundary. A thrown render error shows this instead of a
 * blank page; the digest is the same id Next writes to the server log, so a
 * user can quote it and an operator can find the stack.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('route error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <p className="dz-label">Something broke</p>
      <h1 className="text-2xl font-bold tracking-tight">This page could not be rendered</h1>
      <p className="text-sm leading-relaxed text-muted">
        The failure was logged on the server. You can retry, or go back to your dashboard.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted">reference: {error.digest}</p>
      )}
      <div className="flex justify-center gap-3">
        <button className="dz-btn dz-btn-primary" onClick={reset}>
          Try again
        </button>
        <a href="/dashboard" className="dz-btn">
          Dashboard
        </a>
      </div>
    </div>
  );
}
