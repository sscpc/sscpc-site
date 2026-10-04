/* Persistent Spectrum countdown badge (#pcd).
   Floats fixed at the top-right of the screen on every page -- including
   the Spectrum tab itself, since its own big countdown now sits further
   down the page, below "What is Spectrum?", rather than up top -- and
   stays there while scrolling. Once the footer scrolls into view, it docks
   into the footer's own right-hand slot (#pcd-slot) instead of floating
   over the footer content, and floats back out if you scroll back up. */
(function () {
  const pcd = document.getElementById('pcd');
  const slot = document.getElementById('pcd-slot');
  const footer = document.querySelector('footer');
  if (!pcd || !slot || !footer) return;

  const home = document.createElement('div'); // holds pcd's place while it's floating
  home.style.display = 'none';
  pcd.after(home);

  let footerVisible = false;

  function dock() {
    if (pcd.classList.contains('docked')) return;
    pcd.classList.add('docked');
    slot.appendChild(pcd);
  }
  function undock() {
    if (!pcd.classList.contains('docked')) return;
    pcd.classList.remove('docked');
    home.after(pcd);
  }
  function apply() {
    if (window.spectrumOver) { pcd.hidden = true; return; } // Spectrum has already happened
    pcd.hidden = false;
    footerVisible ? dock() : undock();
  }

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entries) => { footerVisible = entries[0].isIntersecting; apply(); },
      { rootMargin: '0px 0px -40% 0px' } // dock once the footer is meaningfully on screen
    );
    obs.observe(footer);
  }

  addEventListener('hashchange', apply);
  apply();
})();
