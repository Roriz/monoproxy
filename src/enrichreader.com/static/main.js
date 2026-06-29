/**
 * Shared logic for EnrichReader
 */

function initParticles() {
  const voidEl = document.getElementById('void');
  if (!voidEl) return;

  const starCount = 120;
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
  const ribbon = document.getElementById('reader-ribbon');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('nav-scrolled');
      nav.style.top = '0';
      if (ribbon) {
        ribbon.style.transform = 'translateY(-100%)';
      }
    } else {
      nav.classList.remove('nav-scrolled');
      if (ribbon) {
        nav.style.top = '36px';
        ribbon.style.transform = 'translateY(0)';
      } else {
        nav.style.top = '0';
      }
    }
  }, { passive: true });
}

// Mobile Navigation Menu Toggle
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-menu-drawer');
  const iconPath = document.getElementById('menu-icon-path');
  if (!toggleBtn || !drawer || !iconPath) return;

  let isOpen = false;

  const openIcon = 'M4 6h16M4 12h16M4 18h16';
  const closeIcon = 'M6 18L18 6M6 6l12 12';

  function toggleMenu() {
    isOpen = !isOpen;
    if (isOpen) {
      // Open state
      drawer.classList.remove('-translate-y-full', 'opacity-0', 'pointer-events-none');
      drawer.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      iconPath.setAttribute('d', closeIcon);
      document.body.style.overflow = 'hidden'; // Stop background scrolling
    } else {
      // Closed state
      drawer.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
      drawer.classList.add('-translate-y-full', 'opacity-0', 'pointer-events-none');
      iconPath.setAttribute('d', openIcon);
      document.body.style.overflow = ''; // Re-enable background scrolling
    }
  }

  toggleBtn.addEventListener('click', toggleMenu);

  // Close drawer when a link is clicked
  const navLinks = drawer.querySelectorAll('.mobile-nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (isOpen) toggleMenu();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initHeaderScroll();
  initMobileMenu();
});
