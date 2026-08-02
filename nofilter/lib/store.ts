'use client';

import { create } from 'zustand';

export type CursorMode = 'default' | 'hover' | 'drag' | 'view';

type State = {
  /** Assets in, intro played out, page interactive. */
  entered: boolean;
  /** Preloader progress, 0 → 1. */
  loadProgress: number;
  /** Fired the moment the lens shatters, so the DOM intro can chase it. */
  shattered: boolean;

  cursorMode: CursorMode;
  cursorLabel: string;

  /** Discrete active station, for the index readout and nav highlight. */
  activeStation: number;

  /** Phone capture overlay. */
  captureOpen: boolean;
  captureDone: boolean;

  /**
   * The door. Blocks the page until name and number are in.
   *
   * Starts closed on every render — server and client agree on that, so it
   * cannot cause a hydration mismatch. `resolveGate` runs after mount and is
   * the only thing that opens it.
   */
  gateOpen: boolean;
  gatePassed: boolean;

  setLoadProgress: (v: number) => void;
  setShattered: () => void;
  setEntered: () => void;
  setCursor: (mode: CursorMode, label?: string) => void;
  setActiveStation: (i: number) => void;
  openCapture: () => void;
  closeCapture: () => void;
  completeCapture: () => void;
  resolveGate: () => void;
  passGate: () => void;
};

/** Set once someone is through, so the door doesn't greet them again. */
export const GATE_KEY = 'nf.gate.passed';

export const useStore = create<State>((set, get) => ({
  entered: false,
  loadProgress: 0,
  shattered: false,

  cursorMode: 'default',
  cursorLabel: '',

  activeStation: 0,

  captureOpen: false,
  captureDone: false,

  gateOpen: false,
  gatePassed: false,

  setLoadProgress: (v) =>
    set((s) => ({ loadProgress: Math.max(s.loadProgress, Math.min(1, v)) })),
  setShattered: () => set({ shattered: true }),
  setEntered: () => set({ entered: true }),
  setCursor: (cursorMode, cursorLabel = '') => set({ cursorMode, cursorLabel }),
  setActiveStation: (i) => {
    if (get().activeStation !== i) set({ activeStation: i });
  },
  openCapture: () => {
    if (!get().captureDone) set({ captureOpen: true });
  },
  closeCapture: () => set({ captureOpen: false }),
  completeCapture: () => set({ captureDone: true }),

  /**
   * Decides whether the door is shown, once, after mount.
   *
   * A blocked read of localStorage (Safari private mode, storage disabled)
   * must not lock someone out of the site, so the failure case opens the page
   * rather than the door.
   */
  resolveGate: () => {
    let passed = false;
    try {
      passed = window.localStorage.getItem(GATE_KEY) === '1';
    } catch {
      passed = true;
    }
    set(passed ? { gatePassed: true, gateOpen: false } : { gateOpen: true });
  },

  passGate: () => {
    try {
      window.localStorage.setItem(GATE_KEY, '1');
    } catch {
      /* Remembering is a courtesy; failing to is not worth surfacing. */
    }
    set({ gatePassed: true, gateOpen: false, captureDone: true });
  },
}));
