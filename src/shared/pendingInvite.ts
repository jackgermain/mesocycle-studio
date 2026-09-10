/** The invite code, remembered outside the URL.
 *
 * An invite link is `#/invite/<code>` and the code lives nowhere else -- not in the account, not in
 * storage. So the moment anything takes the browser off that URL, the code is gone: a Supabase email
 * confirmation link returns to the site root, an installed home-screen icon opens at the root, and
 * closing the tab loses it too. What's left is a signed-in session with no account, which is the
 * "you're signed in, but nothing's set up for this email yet" screen -- asking the invited person for a
 * code they were never shown, because it was only ever in a link their coach sent.
 *
 * localStorage rather than sessionStorage on purpose: the whole point is surviving a round trip through
 * an email client, which lands in a fresh tab with a fresh session storage. */
const KEY = "jacked:pending-invite";

export function rememberInvite(code: string): void {
  if (!code) return;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    // Private browsing can refuse storage. The invite-code field on the landing screen is the fallback.
  }
}

export function pendingInvite(): string | null {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

/** Call this the moment a code stops being usable -- claimed, expired, not found. A remembered code is
 * what the landing screen redirects to, so leaving a dead one behind bounces the user between the two
 * screens forever. */
export function forgetInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing was stored to begin with.
  }
}
