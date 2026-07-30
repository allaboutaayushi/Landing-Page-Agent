'use client';

import { useEffect, useRef, useState } from 'react';
import { CAPTURE } from '@/lib/content';
import { useStore } from '@/lib/store';
import { cursorProps } from './Cursor';
import s from './Capture.module.css';

type Status = 'idle' | 'sending' | 'done' | 'error';

/**
 * Phone capture.
 *
 * Enters as a slab that slides up over the page — the same vocabulary as the
 * preloader shell — rather than a boxed modal dropped on top of it. It only
 * ever opens from a deliberate GET IN press, never on a timer or an exit
 * intent, which is the difference between an invitation and a popup.
 */
export default function Capture() {
  const open = useStore((st) => st.captureOpen);
  const close = useStore((st) => st.closeCapture);
  const complete = useStore((st) => st.completeCapture);

  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);
  /** Honeypot — real people never fill this; bots fill everything. */
  const [trap, setTrap] = useState('');

  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    const t = window.setTimeout(() => inputRef.current?.focus(), 520);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      // Trap focus inside the panel while it owns the screen.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // The page must not scroll behind the panel.
  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { start: () => void; stop: () => void } })
      .__lenis;
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    if (!consent) {
      setError('Tick the box so we’re allowed to message you.');
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) {
      setError('That number looks short. Check it?');
      return;
    }

    setError('');
    setStatus('sending');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `${CAPTURE.dial}${digits}`,
          consent,
          // Attribution is read from the URL the visitor actually arrived on.
          source: window.location.search || 'direct',
          referrer: document.referrer || '',
          // Anything filled here, or submitted implausibly fast, is a bot.
          website: trap,
          elapsed: Date.now() - openedAt.current,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setStatus('error');
        setError(body.error ?? 'That didn’t go through. Try again in a moment.');
        return;
      }

      setStatus('done');
      complete();
      window.setTimeout(close, 2200);
    } catch {
      setStatus('error');
      setError('Network’s not playing. Try again in a moment.');
    }
  };

  return (
    <div
      className={s.root}
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-heading"
      aria-hidden={!open}
      {...(open ? {} : { inert: '' as unknown as boolean })}
    >
      <button
        type="button"
        className={s.scrim}
        onClick={close}
        tabIndex={-1}
        aria-label="Close"
      />

      <div ref={panelRef} className={s.panel}>
        <div className={s.panelInner}>
          <h2 id="capture-heading" className={`display ${s.heading}`}>
            {CAPTURE.heading}
          </h2>

          {status === 'done' ? (
            <p className={`display ${s.success}`} role="status">
              {CAPTURE.success}
            </p>
          ) : (
            <>
              <p className={`lede ${s.lede}`}>{CAPTURE.lede}</p>
              <p className={`${s.sub} dim`}>{CAPTURE.sub}</p>

              <form className={s.form} onSubmit={submit} noValidate>
                <div className={s.field}>
                  <span className={s.dial} aria-hidden="true">
                    {CAPTURE.dial}
                  </span>
                  <label className="sr-only" htmlFor="nf-phone">
                    Phone number
                  </label>
                  <input
                    ref={inputRef}
                    id="nf-phone"
                    className={s.input}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder={CAPTURE.placeholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'nf-phone-error' : undefined}
                    disabled={status === 'sending'}
                  />
                </div>

                {/* Off-screen, not display:none — bots skip hidden fields. */}
                <div className={s.trap} aria-hidden="true">
                  <label htmlFor="nf-website">Website</label>
                  <input
                    id="nf-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={trap}
                    onChange={(e) => setTrap(e.target.value)}
                  />
                </div>

                <label className={s.consent} {...cursorProps('hover')}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className={s.checkbox}
                  />
                  <span className={s.checkboxBox} aria-hidden="true" />
                  <span className={s.consentText}>{CAPTURE.consent}</span>
                </label>

                {error && (
                  <p id="nf-phone-error" className={s.error} role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className={s.submit}
                  disabled={status === 'sending'}
                  {...cursorProps('hover')}
                >
                  {status === 'sending' ? CAPTURE.pending : CAPTURE.cta}
                </button>
              </form>
            </>
          )}

          <button type="button" className={`micro ${s.dismiss}`} onClick={close} {...cursorProps('hover')}>
            {CAPTURE.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
