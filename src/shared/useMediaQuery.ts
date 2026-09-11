import { useSyncExternalStore } from "react";

/** Where the app stops being a phone column and fills the browser: a side menu instead of the bottom tabs,
 * pages in a centred column, sheets as centred windows. Must match the `@media (min-width: 1024px)` blocks in
 * styles.css -- the CSS does the layout, this decides which navigation is mounted at all, so the two cannot
 * disagree about which one is on screen. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
