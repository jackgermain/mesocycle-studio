import React, { useRef, useState } from "react";
import { ACTION_WIDTH, decideAxis, dragOffset, shouldSnapOpen } from "./swipeMath";

/** A list row you can swipe left to reveal one destructive action.
 *
 * Pointer events rather than touch events, so the same code works under a finger and a mouse without two
 * implementations. Three things make it behave like the OS version rather than a div that moves:
 *
 * - **The axis is locked once, on the first few pixels of movement.** Without that, a mostly-vertical
 *   flick down a long roster drags rows sideways as it goes, and the list feels broken. Below the
 *   threshold nothing is decided and nothing moves.
 * - **`touch-action: pan-y`** tells the browser this element handles horizontal gestures itself and the
 *   page still owns vertical ones, so the list scrolls normally and the swipe doesn't fight it.
 * - **A swipe swallows the click that follows it.** The row underneath is a button that navigates; on
 *   touch, releasing after a drag still fires a click, so without this every swipe would also open the
 *   client you were trying to swipe.
 *
 * Only one row is open at a time -- that's `open`/`onOpenChange`, owned by the list -- and while a row is
 * open, tapping its body closes it instead of navigating, which is the escape hatch for a mis-swipe.
 */
export function SwipeRow({
  open,
  onOpenChange,
  onAction,
  actionLabel = "Remove",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: () => void;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; axis: "none" | "h" | "v" } | null>(null);
  const movedRef = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY, axis: "none" };
    movedRef.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = startRef.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;

    if (s.axis === "none") {
      const axis = decideAxis(mx, my);
      if (axis === "none") return;
      s.axis = axis;
      // A vertical gesture is the list scrolling. Let go of it entirely rather than tracking it.
      if (s.axis === "v") {
        startRef.current = null;
        return;
      }
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    movedRef.current = true;
    setDx(dragOffset(open ? -ACTION_WIDTH : 0, mx));
  }

  function endDrag(e: React.PointerEvent) {
    const s = startRef.current;
    startRef.current = null;
    if (!s || s.axis !== "h") return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setDragging(false);
    const shouldOpen = shouldSnapOpen(dx);
    setDx(shouldOpen ? -ACTION_WIDTH : 0);
    onOpenChange(shouldOpen);
  }

  const offset = dragging ? dx : open ? -ACTION_WIDTH : 0;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 12, touchAction: "pan-y" }}>
      {/* Behind the row, so it is revealed by the row moving rather than animating in on its own. */}
      <button
        type="button"
        onClick={onAction}
        // Hidden from the accessibility tree while closed: it is on screen but not reachable, and a
        // screen reader announcing a delete button for every row would be worse than not having it.
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: ACTION_WIDTH,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          background: "var(--color-danger)", color: "var(--color-bg)", border: "none",
          fontSize: 12.5, fontFamily: "var(--font-heading)", cursor: "pointer",
        }}
      >
        <i className="ph ph-trash" style={{ fontSize: 14 }} />
        {actionLabel}
      </button>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        // Capture, not bubble: the click has to be stopped before it reaches the row's own button.
        onClickCapture={(e) => {
          if (movedRef.current) {
            e.preventDefault();
            e.stopPropagation();
            movedRef.current = false;
            return;
          }
          if (open) {
            e.preventDefault();
            e.stopPropagation();
            onOpenChange(false);
          }
        }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          position: "relative",
          background: "var(--color-bg)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
