/**
 * Shared logic for EnrichReader
 */

function initParticles() {
  const voidEl = document.getElementById('void');
  if (!voidEl) return;

  const starCount = 50;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
    fragment.appendChild(star);
  }

  voidEl.appendChild(fragment);
}

// Transparent to Solid Nav on Scroll
function initHeaderScroll() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('nav-scrolled');
    } else {
      nav.classList.remove('nav-scrolled');
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initHeaderScroll();
});
