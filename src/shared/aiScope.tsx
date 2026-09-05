import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AiEditResult, ChangeEntry } from "../coach/programAiEdit";

/** What the always-on AI button would act on, for whatever screen is currently open.
 *
 * Screens declare this rather than the button going looking, because only the screen knows what "this
 * program" means where it stands -- a template in the builder, one client's live weeks in the session
 * logger, your own block while training. The button just asks whoever is on screen. */
export interface AiScope {
  title: string;
  buildPayload: () => unknown;
  build: (result: AiEditResult) => unknown;
  diff: (next: unknown) => ChangeEntry[];
  apply: (next: unknown, changes: ChangeEntry[], summary: string) => void;
  context?: string;
  placeholder?: string;
}

type ScopeRef = { current: (() => AiScope) | null };

const Ctx = createContext<ScopeRef | null>(null);

export function AiScopeProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<(() => AiScope) | null>(null);
  return <Ctx.Provider value={ref}>{children}</Ctx.Provider>;
}

/** Registers this screen's scope for as long as it's mounted.
 *
 * A *factory* rather than the scope itself, and stored in a ref rather than state: the scope closes over
 * live props that change on every keystroke, and putting that in state would re-render the whole shell
 * each time. Nothing needs to react to it -- the button only reads it at the moment it's tapped. */
export function useRegisterAiScope(factory: (() => AiScope) | null) {
  const ref = useContext(Ctx);
  useEffect(() => {
    if (ref) ref.current = factory;
  });
  useEffect(() => {
    return () => {
      if (ref) ref.current = null;
    };
  }, [ref]);
}

export function useAiScopeRef(): ScopeRef | null {
  return useContext(Ctx);
}

/** Kept in sync with the tab bar's own height so the button floats just above it rather than over the
 * icons -- see `.tb` in styles.css, which is 10px top padding, a ~34px icon row, and 16px plus the safe
 * area beneath. */
export function AiFab({ onOpen, hidden }: { onOpen: () => void; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <button className="ai-fab" aria-label="Edit with AI" onClick={onOpen}>
      <i className="ph ph-sparkle" style={{ fontSize: 20 }} />
    </button>
  );
}

/** Remembers whether the button has ever been used, so the one-time hint only shows until it has. */
export function useSeenOnce(key: string): [boolean, () => void] {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return true; // storage blocked -- treat as seen rather than nagging forever
    }
  });
  return [
    seen,
    () => {
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* nothing to do -- the hint just won't be remembered */
      }
      setSeen(true);
    },
  ];
}
