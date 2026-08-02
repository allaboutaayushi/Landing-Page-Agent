'use client';

import { useEffect, useRef, useState } from 'react';
import { CAPTURE, GATE } from '@/lib/content';
import { useStore } from '@/lib/store';
import { cursorProps } from './Cursor';
import s from './Capture.module.css';

type Status = 'idle' | 'sending' | 'done' | 'error';

/**
 * Name and phone capture, in two postures.
 *
 * As the *door* it opens itself once per visitor and holds the page until it
 * is answered — the site stays visible behind a heavy blur, legible as motion
 * and colour but not as content, so there is something to want on the way in.
 * As the *invitation* it opens only from a deliberate GET IN press. Same form,
 * same endpoint; the difference is whether it can be dismissed.
 *
 * Every word of the page is still server-rendered underneath either posture —
 * the gate is a client overlay, so crawlers and reader modes are unaffected.
 */
export default function Capture() {
  const captureOpen = useStore((st) => st.captureOpen);
  const close = useStore((st) => st.closeCapture);
  const complete = useStore((st) => st.completeCapture);

  const gateOpen = useStore((st) => st.gateOpen);
  const resolveGate = useStore((st) => st.resolveGate);
  const passGate = useStore((st) => st.passGate);

  const isGate = gateOpen;
  const open = captureOpen || isGate;

  /**
   * Which posture to *draw*, as opposed to which one is active.
   *
   * passGate() clears gateOpen the instant the number is accepted, but the
   * panel is still sliding out at that point — reading isGate directly would
   * snap it to the invitation's layout and copy halfway through its own exit.
   * This keeps the door looking like the door until it is genuinely gone.
   */
  const [posture, setPosture] = useState<'gate' | 'invite'>('invite');
  const drawAsGate = posture === 'gate';

  useEffect(() => {
    if (isGate) {
      setPosture('gate');
      return;
    }
    if (open) {
      setPosture('invite');
      return;
    }
    // Fully closed: reset only after the slab has finished travelling.
    const t = window.setTimeout(() => setPosture('invite'), 1000);
    return () => window.clearTimeout(t);
  }, [isGate, open]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  // Decide the door after mount — never during render, so the server and the
  // first client pass agree and hydration stays clean.
  useEffect(() => {
    resolveGate();
  }, [resolveGate]);

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
      // Escape is a way out of an invitation, not out of the door.
      if (e.key === 'Escape' && !isGate) close();
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
  }, [open, close, isGate]);

  // Scrolling is held by ScrollRig, which is the only thing that knows about
  // all three overlays at once — see the lock effect there. This component just
  // declares that it is open and lets the rig decide.

  /**
   * Unlatch the door without recording a pass.
   *
   * Used when the failure is ours. It deliberately does not call passGate(),
   * so nothing is written to localStorage and the visitor is asked again next
   * time — by then the backend may be fixed and the signup collectable.
   */
  const letThemIn = () => {
    if (!isGate) return;
    window.setTimeout(() => useStore.setState({ gateOpen: false }), 2600);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    const trimmedName = name.replace(/\s+/g, ' ').trim();
    if (trimmedName.length < 2) {
      setError('What should we call you?');
      return;
    }

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
          name: trimmedName,
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
        // A rejected value is worth re-asking for; a broken backend is not.
        // 4xx means they can fix it by retyping, so the door holds. Anything
        // else is our fault, and holding a whole site shut because our own
        // storage is down punishes the visitor for it — so the door opens.
        if (res.status >= 500) letThemIn();
        return;
      }

      setStatus('done');
      complete();
      // Hold the confirmation long enough to read, then lift. The door clears
      // itself through passGate so the blur drops and the visit is remembered.
      window.setTimeout(isGate ? passGate : close, 2200);
    } catch {
      setStatus('error');
      setError('Network’s not playing. Try again in a moment.');
      letThemIn();
    }
  };

  return (
    <div
      className={s.root}
      data-open={open}
      data-gate={drawAsGate}
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-heading"
      aria-hidden={!open}
      {...(open ? {} : { inert: '' as unknown as boolean })}
    >
      {drawAsGate ? (
        <div className={s.scrim} aria-hidden="true" />
      ) : (
        <button
          type="button"
          className={s.scrim}
          onClick={close}
          tabIndex={-1}
          aria-label="Close"
        />
      )}

      <div ref={panelRef} className={s.panel}>
        <div className={s.panelInner}>
          {drawAsGate && <p className={`micro ${s.eyebrow}`}>{GATE.eyebrow}</p>}

          <h2 id="capture-heading" className={`display ${s.heading}`}>
            {drawAsGate ? GATE.heading : CAPTURE.heading}
          </h2>

          {status === 'done' ? (
            <p className={`display ${s.success}`} role="status">
              {CAPTURE.success}
            </p>
          ) : (
            <>
              <p className={`lede ${s.lede}`}>{drawAsGate ? GATE.lede : CAPTURE.lede}</p>
              {!drawAsGate && <p className={`${s.sub} dim`}>{CAPTURE.sub}</p>}

              <form className={s.form} onSubmit={submit} noValidate>
                <div className={s.field}>
                  <label className="sr-only" htmlFor="nf-name">
                    {CAPTURE.nameLabel}
                  </label>
                  <input
                    ref={inputRef}
                    id="nf-name"
                    className={s.input}
                    type="text"
                    autoComplete="name"
                    placeholder={CAPTURE.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'nf-error' : undefined}
                    disabled={status === 'sending'}
                  />
                </div>

                <div className={s.field}>
                  <span className={s.dial} aria-hidden="true">
                    {CAPTURE.dial}
                  </span>
                  <label className="sr-only" htmlFor="nf-phone">
                    Phone number
                  </label>
                  <input
                    id="nf-phone"
                    className={s.input}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder={CAPTURE.placeholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'nf-error' : undefined}
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
                  <p id="nf-error" className={s.error} role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className={s.submit}
                  disabled={status === 'sending'}
                  {...cursorProps('hover')}
                >
                  {status === 'sending'
                    ? CAPTURE.pending
                    : drawAsGate
                      ? GATE.cta
                      : CAPTURE.cta}
                </button>
              </form>
            </>
          )}

          {!drawAsGate && (
            <button
              type="button"
              className={`micro ${s.dismiss}`}
              onClick={close}
              {...cursorProps('hover')}
            >
              {CAPTURE.dismiss}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
