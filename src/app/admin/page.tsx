import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RoleControl } from '@/components/RoleControl';
import { listUsers } from '@/lib/db';
import { allClasses, instanceStats } from '@/lib/classroom';
import { listAudit } from '@/lib/audit';
import { isAdmin, viewer } from '@/lib/session';
import { shortDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Admin — dead3ars' };

/* Instance oversight: who is on it, what classes exist, and the audit trail.
 * Admin role only — the page and the API both refuse anything else. */
export default async function AdminPage() {
  const user = await viewer();
  if (!user) redirect('/login');
  if (!isAdmin(user)) redirect('/dashboard');

  const stats = instanceStats();
  const users = listUsers();
  const classes = allClasses();
  const audit = listAudit({ pageSize: 40 });

  const tiles: [string, string | number][] = [
    ['Students', stats.users.student ?? 0],
    ['Teachers', stats.users.teacher ?? 0],
    ['Admins', stats.users.admin ?? 0],
    ['Classes', stats.classes],
    ['Enrolments', stats.enrollments],
    ['Assignments', stats.assignments],
    ['Submissions', stats.submissions],
    ['Grades', stats.grades],
    ['Audit events', stats.auditEvents],
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="dz-label">Admin · {user.name}</p>
        <h1 className="text-3xl font-bold tracking-tight">Instance</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Everything on this deployment: accounts, classes, and an append-only trail of who did
          what. The health probe at <code className="font-mono">/api/health</code> is what a deploy
          platform should poll.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, value]) => (
          <div key={label} className="dz-card p-4">
            <p className="font-mono text-2xl font-bold text-accent">{value}</p>
            <p className="dz-label mt-1">{label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Accounts</h2>
        <div className="dz-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="dz-label px-4 py-3">Name</th>
                <th className="dz-label px-4 py-3">Email</th>
                <th className="dz-label px-4 py-3">Joined</th>
                <th className="dz-label px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {u.name}
                    {u.id === user.id && <span className="dz-badge dz-badge-neutral ml-2">you</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{u.email}</td>
                  <td className="px-4 py-2.5 text-muted">{shortDate(u.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <RoleControl userId={u.id} role={u.role} self={u.id === user.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Classes</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-muted">No classes on this instance yet.</p>
        ) : (
          <div className="dz-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="dz-label px-4 py-3">Class</th>
                  <th className="dz-label px-4 py-3">Teacher</th>
                  <th className="dz-label px-4 py-3">Join code</th>
                  <th className="dz-label px-4 py-3 text-right">Students</th>
                  <th className="dz-label px-4 py-3 text-right">Assignments</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/teacher/classes/${c.id}` as never} className="font-medium hover:text-accent">
                        {c.name}
                      </Link>
                      <span className="block text-xs text-muted">{shortDate(c.created_at)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.teacher_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-accent">{c.join_code}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{c.students}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{c.assignments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Audit trail</h2>
          <span className="dz-label">latest {audit.rows.length} of {audit.total}</span>
        </div>
        {audit.rows.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing logged yet. Sign-ins, roster changes, submissions and grades all record here.
          </p>
        ) : (
          <div className="dz-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="dz-label px-4 py-3">When</th>
                  <th className="dz-label px-4 py-3">Actor</th>
                  <th className="dz-label px-4 py-3">Action</th>
                  <th className="dz-label px-4 py-3">Target</th>
                  <th className="dz-label px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.rows.map((a) => (
                  <tr key={a.id} className="border-b border-line/60 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-muted">
                      {a.created_at.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-4 py-2">{a.actor_email || <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-2 font-mono">{a.action}</td>
                    <td className="px-4 py-2 font-mono text-muted">
                      {a.target_type ? `${a.target_type}:${a.target_id}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-muted">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
