import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Fenn } from '../components/Fenn';
import { Btn } from '../components/ui';
import { specialGreeting } from '../domain/greeting';
import { cloud, cloudEnabled } from '../sync/cloud';
import { useCloud } from '../sync/useCloudSync';

interface Visitor {
  device_id: string;
  name: string;
  course: string | null;
  created_at: string;
}

interface Stats {
  accounts: number;
  accounts_week: number;
  confirmed_accounts: number;
  progress_rows: number;
}

const COURSE_LABEL: Record<string, string> = { 'en-de': 'Learning German', 'de-en': 'Learning English' };

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

/**
 * The owner's dashboard. The database decides who may see it: for anyone not listed as an admin,
 * the queries below return nothing or are refused, whatever this page does.
 */
export function Admin() {
  const { session } = useCloud();
  const [state, setState] = useState<'loading' | 'denied' | 'ok' | 'error'>('loading');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const c = cloud();
    if (!c || !session) return;
    setState('loading');
    const [isAdmin, rows, counts] = await Promise.all([
      c.rpc('is_admin'),
      c.from('visitors').select('device_id,name,course,created_at').order('created_at', { ascending: false }).limit(5000),
      c.rpc('admin_stats'),
    ]);
    if (isAdmin.error || rows.error) return setState('error');
    if (!isAdmin.data) return setState('denied');
    setVisitors((rows.data ?? []) as Visitor[]);
    setStats((counts.data as Stats) ?? null);
    setState('ok');
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const browsers = new Set(visitors.map((v) => v.device_id));
    const byCourse = new Map<string, number>();
    for (const v of visitors) byCourse.set(v.course ?? '?', (byCourse.get(v.course ?? '?') ?? 0) + 1);
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * 86_400_000).toISOString().slice(0, 10);
      return { day: d, count: visitors.filter((v) => dayKey(v.created_at) === d).length };
    });
    const special = visitors.filter((v) => specialGreeting(v.name));
    return {
      total: visitors.length,
      browsers: browsers.size,
      today: visitors.filter((v) => dayKey(v.created_at) === today).length,
      week: visitors.filter((v) => now - Date.parse(v.created_at) < 7 * 86_400_000).length,
      byCourse: [...byCourse.entries()].sort((a, b) => b[1] - a[1]),
      days,
      max: Math.max(1, ...days.map((d) => d.count)),
      special,
    };
  }, [visitors]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? visitors.filter((v) => v.name.toLowerCase().includes(q)) : visitors;
  }, [visitors, query]);

  if (!cloudEnabled) return <div className="page admin"><p>Accounts are not configured in this build.</p></div>;
  if (!session) {
    return (
      <div className="page admin empty-state">
        <Fenn mood="think" size={110} />
        <h1 className="page-title">Admin</h1>
        <p>Log in with your admin account first.</p>
        <Btn onClick={() => { window.location.hash = '/account'; }}>Log in</Btn>
      </div>
    );
  }
  if (state === 'denied') {
    return (
      <div className="page admin empty-state">
        <Fenn mood="sad" size={110} />
        <h1 className="page-title">Not authorised</h1>
        <p>This account is not an admin.</p>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="page admin empty-state">
        <p>Could not load the dashboard.</p>
        <Btn onClick={() => void load()}>Try again</Btn>
      </div>
    );
  }

  return (
    <div className="page admin">
      <div className="admin-head">
        <h1 className="page-title"><ShieldCheck /> Admin</h1>
        <Btn variant="secondary" onClick={() => void load()} disabled={state === 'loading'}>
          <RefreshCw size={16} /> Refresh
        </Btn>
      </div>

      <div className="admin-tiles">
        <div className="admin-tile"><strong>{summary.total}</strong><span>Visitor names</span></div>
        <div className="admin-tile"><strong>{summary.today}</strong><span>Today</span></div>
        <div className="admin-tile"><strong>{summary.week}</strong><span>Last 7 days</span></div>
        <div className="admin-tile"><strong>{summary.browsers}</strong><span>Different browsers</span></div>
        <div className="admin-tile"><strong>{stats?.accounts ?? '…'}</strong><span>Accounts ({stats?.confirmed_accounts ?? 0} confirmed)</span></div>
        <div className="admin-tile is-special">
          <strong>{summary.special.length}</strong>
          <span>Special greeting shown</span>
        </div>
      </div>

      <section className="admin-card">
        <h2>Visitors per day, last 30 days</h2>
        <div className="admin-chart" role="img" aria-label="Visitors per day">
          {summary.days.map((d) => (
            <span key={d.day} title={`${d.day}: ${d.count}`} className="admin-bar">
              <span style={{ height: `${(d.count / summary.max) * 100}%` }} />
            </span>
          ))}
        </div>
        <div className="admin-axis"><span>{summary.days[0]?.day}</span><span>today</span></div>
      </section>

      <section className="admin-card">
        <h2>Courses</h2>
        {summary.byCourse.length === 0 && <p className="muted">No visitors yet.</p>}
        {summary.byCourse.map(([course, n]) => (
          <div className="admin-split" key={course}>
            <span>{COURSE_LABEL[course] ?? course}</span>
            <span className="admin-split-bar"><span style={{ width: `${(n / Math.max(1, summary.total)) * 100}%` }} /></span>
            <strong>{n}</strong>
          </div>
        ))}
      </section>

      {summary.special.length > 0 && (
        <section className="admin-card">
          <h2>Special greeting</h2>
          <ul className="admin-list">
            {summary.special.map((v) => (
              <li key={`${v.device_id}-${v.created_at}`}>
                {v.name} · {COURSE_LABEL[v.course ?? ''] ?? v.course} · {new Date(v.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="admin-card">
        <h2>All visitors</h2>
        <label className="admin-search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names" aria-label="Search names" />
        </label>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Course</th><th>When</th></tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <tr key={`${v.device_id}-${v.name}`}>
                  <td>{v.name}</td>
                  <td>{COURSE_LABEL[v.course ?? ''] ?? v.course ?? '-'}</td>
                  <td>{new Date(v.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={3} className="muted">No visitors{query ? ' match' : ' yet'}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
