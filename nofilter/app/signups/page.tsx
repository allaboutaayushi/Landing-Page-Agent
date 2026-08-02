'use client';

import { useEffect, useState } from 'react';
import s from './signups.module.css';

type Row = {
  key: string;
  name: string;
  phone: string;
  timestamp: string;
  consent: boolean;
  source: string;
  country: string;
};

/**
 * The signup list.
 *
 * Exists so the password can be typed into a form rather than pasted into the
 * address bar — a token in a URL ends up in browser history, in the referrer
 * of anything the page links to, and in any screenshot of the window. The
 * password is exchanged once for an httpOnly cookie and never touches the URL.
 */
export default function SignupsPage() {
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const PER = 50;

  const load = async (which = page) => {
    const res = await fetch(`/api/signups?page=${which}&per=${PER}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const body = (await res.json()) as {
      signups: Row[];
      total: number;
      pages: number;
      page: number;
    };
    setRows(body.signups);
    setTotal(body.total);
    setPages(body.pages);
    setPage(body.page);
    return true;
  };

  // An unexpired cookie means no need to ask again.
  useEffect(() => {
    load(1).catch(() => {});
    // Only on mount; later loads are driven by the pager.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/signups/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? 'That didn’t work.');
        return;
      }
      setPassword('');
      if (!(await load())) setError('Signed in, but the list could not be read.');
    } catch {
      setError('Network’s not playing. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch('/api/signups/session', { method: 'DELETE' });
    setRows(null);
  };

  if (rows === null) {
    return (
      <main className={s.gate}>
        <form className={s.card} onSubmit={signIn}>
          <p className={s.kicker}>NO FILTER</p>
          <h1 className={s.heading}>Signups</h1>
          <p className={s.lede}>Enter the password to see who has come through the door.</p>

          <label className={s.srOnly} htmlFor="pw">
            Password
          </label>
          <input
            id="pw"
            className={s.input}
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />

          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}

          <button className={s.button} type="submit" disabled={busy || !password}>
            {busy ? 'Checking…' : 'Show me'}
          </button>
        </form>
      </main>
    );
  }

  // Health-check probes are ours, not real people — kept off the page. The
  // total comes from the server and counts everything, so it can read a little
  // higher than the rows shown; that is the honest number to act on.
  const real = rows.filter((r) => r.source !== 'health-check');

  return (
    <main className={s.wrap}>
      <header className={s.head}>
        <div>
          <p className={s.kicker}>NO FILTER</p>
          <h1 className={s.heading}>
            {total} {total === 1 ? 'signup' : 'signups'}
          </h1>
        </div>
        <div className={s.actions}>
          <a className={s.button} href="/api/signups?format=csv">
            Download CSV
          </a>
          <button className={s.ghost} type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {real.length === 0 && page === 1 ? (
        <p className={s.empty}>Nobody yet. Submit at the door and refresh this page.</p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>When</th>
                <th>Country</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {real.map((r) => (
                <tr key={r.key}>
                  <td>{r.name}</td>
                  <td className={s.mono}>{r.phone}</td>
                  <td className={s.mono}>{new Date(r.timestamp).toLocaleString()}</td>
                  <td>{r.country}</td>
                  <td className={s.dim}>{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className={s.pager} aria-label="Pages">
          <button
            className={s.ghost}
            type="button"
            onClick={() => load(page - 1)}
            disabled={page <= 1}
          >
            ← Newer
          </button>
          <span className={s.dim}>
            Page {page} of {pages}
          </span>
          <button
            className={s.ghost}
            type="button"
            onClick={() => load(page + 1)}
            disabled={page >= pages}
          >
            Older →
          </button>
        </nav>
      )}
    </main>
  );
}
