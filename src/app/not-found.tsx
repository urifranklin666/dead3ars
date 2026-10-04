import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <p className="dz-label">404</p>
      <h1 className="text-2xl font-bold tracking-tight">No such module</h1>
      <p className="text-sm text-muted">
        The page or module you asked for does not exist. If you followed a link from an older
        note, the module id may have changed.
      </p>
      <Link href="/modules" className="dz-btn dz-btn-primary">
        Back to the syllabus
      </Link>
    </div>
  );
}
