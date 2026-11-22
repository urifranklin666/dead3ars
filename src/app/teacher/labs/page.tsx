import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TeacherLabMonitor } from '@/components/TeacherLabMonitor';
import { isStaff, viewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Live Labs — dead3ars' };

export default async function TeacherLabsPage() {
  const user = await viewer();
  if (!user) redirect('/login');
  if (!isStaff(user)) redirect('/dashboard');

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="dz-label">Teacher console · Cyber Range</p>
          <h1 className="text-3xl font-bold tracking-tight">Live Student Labs</h1>
          <p className="text-sm text-muted">
            Monitor active student VMs, shadow screens in real time, assist when stuck, and track
            flag completions.
          </p>
        </div>
        <Link href="/teacher" className="dz-btn">
          ← Back to Cohort
        </Link>
      </header>

      <TeacherLabMonitor />
    </div>
  );
}
