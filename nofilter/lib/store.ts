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

  setLoadProgress: (v: number) => void;
  setShattered: () => void;
  setEntered: () => void;
  setCursor: (mode: CursorMode, label?: string) => void;
  setActiveStation: (i: number) => void;
  openCapture: () => void;
  closeCapture: () => void;
  completeCapture: () => void;
};

export const useStore = create<State>((set, get) => ({
  entered: false,
  loadProgress: 0,
  shattered: false,

  cursorMode: 'default',
  cursorLabel: '',

  activeStation: 0,

  captureOpen: false,
  captureDone: false,

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
}));
