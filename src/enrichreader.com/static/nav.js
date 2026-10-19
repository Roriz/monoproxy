// The site header (layouts/partials/shared/header.html), loaded on every page.

// Tighten the bar once the page scrolls.
function initHeaderScroll() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const update = () => nav.classList.toggle('nav-scrolled', window.scrollY > 50);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// Mobile menu drawer.
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
    drawer.classList.toggle('open', isOpen);
    iconPath.setAttribute('d', isOpen ? closeIcon : openIcon);
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  toggleBtn.addEventListener('click', toggleMenu);
  drawer.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => { if (isOpen) toggleMenu(); });
  });
}

initHeaderScroll();
initMobileMenu();
