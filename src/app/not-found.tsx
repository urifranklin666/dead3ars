import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-5 py-20 text-center">
      <p className="dz-label text-accent">404 · not found</p>
      <h1 className="text-3xl font-bold tracking-tight">This page does not exist</h1>
      <p className="text-sm leading-relaxed text-muted">
        The page, class, assignment, or module you asked for is not here. If you followed an
        older link, the id may have changed.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/modules" className="dz-btn dz-btn-primary">
          Back to the syllabus
        </Link>
        <Link href="/" className="dz-btn">
          Home
        </Link>
      </div>
    </div>
  );
}
