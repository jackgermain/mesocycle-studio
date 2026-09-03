import React, { useEffect, useState } from "react";

function currentBundleSrc(): string | null {
  return document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute("src") ?? null;
}

/** iOS standalone PWAs can sit on a stale cached bundle for a long time -- there's no browser chrome to
 * prompt a refresh, and even force-quitting doesn't reliably force a network fetch. Rather than leave
 * "did my fix actually deploy?" as a guessing game, this periodically fetches the real index.html
 * (bypassing HTTP cache) and compares its script tag against the one this page actually loaded. */
export function UpdateBanner() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (cancelled || available) return;
      try {
        const res = await fetch("/", { cache: "no-store" });
        const html = await res.text();
        const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
        const latest = match?.[1];
        const current = currentBundleSrc();
        if (latest && current && latest !== current) setAvailable(true);
      } catch {
        // offline, or the request was blocked -- just skip this check, try again next time
      }
    }

    check();
    const onVisible = () => !document.hidden && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const interval = setInterval(check, 3 * 60 * 1000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!available) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        top: "calc(12px + env(safe-area-inset-top))",
        width: "min(420px, calc(100% - 20px))",
        zIndex: 200,
        background: "var(--color-accent)",
        color: "#0b1710",
        borderRadius: 12,
        padding: "11px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 10px 26px -8px rgba(76, 224, 143, 0.6)",
      }}
    >
      <i className="ph-fill ph-arrow-clockwise" style={{ fontSize: 17, flex: "none" }} />
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>A newer version is ready.</span>
      <button
        onClick={() => window.location.reload()}
        style={{ background: "#0b1710", color: "var(--color-accent)", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", flex: "none" }}
      >
        Reload
      </button>
    </div>
  );
}
