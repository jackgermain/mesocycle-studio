/** Locks --app-vh to window.innerHeight -- the true layout viewport, which stays constant in a standalone
 * iOS PWA even while the keyboard is open (only the *visual* viewport shrinks for that). Earlier this
 * tracked visualViewport instead so it could react to the keyboard, but that's exactly what caused the
 * bug: once a resize/scroll event fired while the keyboard was up, --app-vh got stuck at the shorter
 * value and never grew back, leaving a permanent gap. Only real layout changes -- rotation, or the page
 * becoming visible again after being backgrounded -- should ever move this number. */
function install() {
  const root = document.documentElement;

  function apply() {
    // window.innerHeight is the *layout* viewport (unaffected by the iOS keyboard, which only shrinks the
    // *visual* viewport) -- safe to react to on every plain resize. A 0 reading only ever happens mid
    // viewport-metrics transition (seen in automated/emulated resizing) and must never get written, or
    // this gets stuck at 0 forever since nothing else would trigger a recompute.
    const h = window.innerHeight;
    if (h > 0) root.style.setProperty("--app-vh", `${h}px`);
  }

  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", () => setTimeout(apply, 60));
  window.addEventListener("pageshow", apply);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) apply();
  });
  // Safari's own chrome (address bar) showing/hiding on scroll changes the true available height without
  // always firing a plain window "resize" -- visualViewport's resize event catches that reliably. Still
  // reads window.innerHeight above, never visualViewport.height, so this doesn't reintroduce the
  // keyboard-shrinks-the-visual-viewport bug the comment at the top of this file describes.
  window.visualViewport?.addEventListener("resize", apply);
}

install();
