import React, { useEffect, useState } from "react";
import { AuthHero as Hero, InfoBanner } from "./UI";

/** The "put this on your home screen" step, shown once on the first screen after an account is created.
 *
 * A PWA is only worth anything installed, and nobody discovers Share -> Add to Home Screen on their own,
 * so this is the one moment it can be said unmissably: they have just finished signing up and have not
 * started using anything yet.
 *
 * One thing this deliberately does not hide: **an installed iOS PWA has its own storage, separate from
 * Safari's.** Whoever installs from here is signed in in Safari and will land on a sign-in screen inside
 * the app. That looks like the app being broken unless they are told to expect it, so the copy says so
 * outright rather than promising they will not have to sign in again.
 *
 * Renders its children untouched when there is nothing to offer -- already installed, already dismissed,
 * or a browser that cannot add to a home screen at all.
 */

const SKIPPED_KEY = "jacked:install-step-skipped";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  // Chrome and Firefox on iOS cannot add to the home screen, so instructions would be a lie.
  return ios && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export default function InstallStep({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"checking" | "ios" | "prompt" | "skip">("checking");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return setMode("skip");
    try {
      if (localStorage.getItem(SKIPPED_KEY) === "1") return setMode("skip");
    } catch {
      // Private browsing refuses storage; showing the step again is the harmless failure.
    }
    if (isIosSafari()) return setMode("ios");

    // Chrome fires this shortly after load. If it never comes, this browser cannot install, so fall
    // through rather than leaving someone stuck on a step with nothing to do.
    const timer = window.setTimeout(() => setMode((m) => (m === "checking" ? "skip" : m)), 1200);
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("prompt");
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  function skip() {
    try {
      localStorage.setItem(SKIPPED_KEY, "1");
    } catch {
      // Fine -- it just means they may see this once more.
    }
    setMode("skip");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    skip();
  }

  if (mode === "skip") return <>{children}</>;
  if (mode === "checking") return <Hero><div className="mu" style={{ textAlign: "center" }}>Loading…</div></Hero>;

  return (
    <Hero>
      <div className="h1" style={{ textAlign: "center", fontSize: 21 }}>One thing first</div>
      <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6, textAlign: "center" }}>
        You're all set up. Put Jacked on your home screen so it opens full screen like a normal app —
        this is the way you'll use it every day.
      </p>

      {mode === "ios" ? (
        <>
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 9 }}>
            <li style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              Tap the <b>Share</b> button at the bottom of Safari — the square with an arrow coming out of it.
            </li>
            <li style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              Scroll down the list and tap <b>Add to Home Screen</b>.
            </li>
            <li style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              Tap <b>Add</b>, then open Jacked from your home screen.
            </li>
          </ol>
          <InfoBanner icon="ph-info">
            It'll ask you to sign in once more the first time you open it from the home screen — that's
            normal. After that it keeps you signed in.
          </InfoBanner>
        </>
      ) : (
        <>
          <button className="btn btn-solid btn-block" style={{ height: 48, fontSize: 14 }} onClick={() => void install()}>
            Add to home screen
          </button>
          <InfoBanner icon="ph-info">
            Opens full screen with no address bar, and keeps you signed in.
          </InfoBanner>
        </>
      )}

      <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={skip}>
        Skip — keep going in the browser
      </button>
    </Hero>
  );
}
