/** The app's real, branded address. Both this and the older mesocycle-studio.vercel.app alias resolve to
 * the same deployment, and an already-installed home-screen icon is permanently pinned to whichever
 * address it was added from -- so without forcing a canonical origin here, an invite generated from an
 * older icon would go out carrying the old name. Localhost is left alone so a link generated while
 * developing still points at the dev server and is actually testable. */
const CANONICAL_ORIGIN = "https://jackedapp.vercel.app";

/** Base for any link meant to be sent to someone else -- coach signup, client/friend invites. */
export function shareBaseUrl(): string {
  const { hostname, origin, pathname } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocal ? `${origin}${pathname}` : `${CANONICAL_ORIGIN}/`;
}
