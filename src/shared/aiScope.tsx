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

const FAB_SIZE = 48;
const FAB_POS_KEY = "jacked.aiFab.pos";
/** Enough movement to mean "I'm dragging this" rather than a thumb wobbling during a tap. Below it the
 * gesture opens the sheet, above it the button just moves and nothing opens. */
const DRAG_THRESHOLD = 6;

function clampToViewport(x: number, y: number): { x: number; y: number } {
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - FAB_SIZE - margin);
  // The tab bar owns the bottom ~73px plus the safe area; parking the button under it would make it
  // unreachable, which is a worse outcome than not being able to drop it exactly there.
  const maxY = Math.max(margin, window.innerHeight - FAB_SIZE - 84);
  return { x: Math.min(Math.max(margin, x), maxX), y: Math.min(Math.max(margin, y), maxY) };
}

/** The always-available AI button. Parks bottom-right by default, just clear of the tab bar (see `.ai-fab`
 * in styles.css), and can be dragged anywhere -- it sits on top of the page, so wherever it lands is
 * something it's covering up.
 *
 * Where it was dropped is remembered per device in localStorage rather than in the account's state: it's a
 * physical preference about the hand holding this particular phone, not something that should follow
 * someone onto a different screen. */
export function AiFab({ onOpen, hidden }: { onOpen: () => void; hidden?: boolean }) {
  // Every hook stays above the `hidden` early return. This component renders on every screen and `hidden`
  // flips with the route, so a hook below it would run on some renders and not others -- React error #310,
  // which has already shipped from this codebase once.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(FAB_POS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { x: number; y: number };
      if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") return null;
      return clampToViewport(parsed.x, parsed.y);
    } catch {
      return null;
    }
  });
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  // A phone rotating, or a desktop window shrinking, can leave a remembered spot off-screen.
  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clampToViewport(p.x, p.y) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Fades out of the way while the page moves under it.
  //
  // Being draggable wasn't enough on its own: the button floats above everything, so wherever it rests it
  // is covering something, and on a long list the thing underneath changes every time you scroll. Dropping
  // it to near-transparent while scrolling means it never hides the row you're reading, and it comes back
  // as soon as you stop. Capture phase because these lists scroll inside .screen-scroll, and a scroll event
  // on an element doesn't bubble.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onScroll() {
      setScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), 650);
    }
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      clearTimeout(timer);
    };
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const next = clampToViewport(e.clientX - d.dx, e.clientY - d.dy);
    if (!d.moved) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (Math.hypot(next.x - rect.left, next.y - rect.top) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDragging(true);
    }
    setPos(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // The pointer can already be released (cancelled gesture); nothing to do.
    }
    if (!d.moved) {
      onOpen();
      return;
    }
    setPos((p) => {
      if (p) {
        try {
          localStorage.setItem(FAB_POS_KEY, JSON.stringify(p));
        } catch {
          // Private browsing, or storage blocked. It still moved for this session.
        }
      }
      return p;
    });
  }

  if (hidden) return null;

  return (
    <button
      className="ai-fab"
      aria-label="Edit with AI"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        // Dragging replaces the CSS right/bottom anchoring with an explicit spot.
        ...(pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : null),
        // Stops iOS treating the drag as a page scroll or a long-press selection.
        touchAction: "none",
        // Still tappable while faded -- someone who wants it mid-scroll shouldn't have to wait for it.
        opacity: scrolling && !dragging ? 0.25 : 1,
        transition: dragging ? "none" : "opacity 0.2s ease",
        cursor: dragging ? "grabbing" : "pointer",
      }}
    >
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
