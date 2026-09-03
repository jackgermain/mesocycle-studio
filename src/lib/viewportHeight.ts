/** iOS standalone PWAs have a long-documented bug: after a text input is focused (bringing up the
 * keyboard) and then blurred, Safari sometimes fails to fully reclaim the vacated space, leaving a gap
 * at the bottom that persists until the page reloads. Pure CSS units (100dvh, 100%) don't react to this
 * because nothing about the layout viewport actually changed -- only the *visual* viewport did. This
 * tracks window.visualViewport directly and writes its height to a CSS var so .app-root can size itself
 * off the real, current viewport instead of a unit that can get stuck. */
function install() {
  const vv = window.visualViewport;
  const root = document.documentElement;

  function apply() {
    const h = vv?.height ?? window.innerHeight;
    root.style.setProperty("--app-vh", `${h}px`);
  }

  apply();
  if (vv) {
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
  }
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", apply);
  // Also re-check on focus/blur of any field, belt-and-suspenders for the exact keyboard-close case.
  document.addEventListener("focusout", () => setTimeout(apply, 50));
}

install();
