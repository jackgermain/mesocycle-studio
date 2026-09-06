import React, { useEffect, useState } from "react";

/** "Add this to your home screen" — the part of a PWA nobody discovers on their own.
 *
 * Everything needed to install has been in place for a while (manifest, icons, apple-touch-icon, the
 * apple-mobile-web-app meta tags). What was missing is that no one is ever told, so the app gets used in
 * a browser tab with an address bar eating a fifth of the screen.
 *
 * Two platforms, two completely different jobs:
 *
 *   - **Android / desktop Chrome** fire `beforeinstallprompt`, which can be saved and replayed from a
 *     real button. One tap, no instructions.
 *   - **iOS Safari** has no such event and never will. The only route is Share → Add to Home Screen, so
 *     the honest thing is to show the steps rather than a button that cannot work. This is the important
 *     case: the real target here is an installed iOS PWA.
 *
 * Renders nothing at all when it is already installed, when it has been dismissed, or on a browser where
 * neither route applies — so it never nags someone who has already done it.
 */

const DISMISSED_KEY = "jacked:install-dismissed";

type Platform = "ios" | "prompt" | "none";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS uses a non-standard flag on navigator; everyone else answers the media query.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  // Chrome and Firefox on iOS cannot add to the home screen at all, so telling them how would be a lie.
  const realSafari = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && realSafari;
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function InstallPrompt({ compact = false }: { compact?: boolean }) {
  const [platform, setPlatform] = useState<Platform>("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || dismissed()) return;

    if (isIosSafari()) {
      setPlatform("ios");
      setHidden(false);
      return;
    }

    function onPrompt(e: Event) {
      // Chrome shows its own mini-infobar unless this is prevented, and we want the button in the page
      // where it sits next to an explanation rather than at the bottom of the screen unexplained.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("prompt");
      setHidden(false);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage refused (private browsing) -- it stays hidden for this session, which is enough.
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // The event is single-use, so whatever they chose, this card's job is done.
    setDeferred(null);
    dismiss();
  }

  if (hidden || platform === "none") return null;

  return (
    <div
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-divider)",
        borderRadius: 12,
        padding: compact ? "12px 13px" : "14px 15px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <i className="ph ph-device-mobile" style={{ fontSize: 16, color: "var(--color-accent)", flex: "none", marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.005em" }}>Put Jacked on your home screen</div>
          <div className="mu" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 3 }}>
            Opens full screen like a normal app, with no address bar.
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ background: "none", border: "none", color: "var(--color-text-faint)", fontSize: 15, cursor: "pointer", padding: "0 2px", lineHeight: 1, flex: "none" }}
        >
          ×
        </button>
      </div>

      {platform === "ios" ? (
        <ol style={{ margin: 0, paddingLeft: 17, display: "flex", flexDirection: "column", gap: 5 }}>
          <li className="mu" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            Tap the <b style={{ color: "var(--color-text)" }}>Share</b> button at the bottom of Safari — the square
            with an arrow coming out of it.
          </li>
          <li className="mu" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            Scroll down and tap <b style={{ color: "var(--color-text)" }}>Add to Home Screen</b>.
          </li>
          <li className="mu" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            Tap <b style={{ color: "var(--color-text)" }}>Add</b>. Open it from your home screen from now on.
          </li>
        </ol>
      ) : (
        <button className="btn btn-solid btn-block" style={{ height: 42, fontSize: 13.5 }} onClick={() => void install()}>
          Install
        </button>
      )}
    </div>
  );
}
