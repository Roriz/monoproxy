// ═══════════════════════════════════════════════════════════════
// Scroll Reveal Controller — Dungeon Crawler Carl Page
// ═══════════════════════════════════════════════════════════════

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.fade-in-up, .fade-in').forEach(el => {
    observer.observe(el);
  });
}

function initStickyNavObserver() {
  const sections = document.querySelectorAll('section.chart-section');
  const navLinks = document.querySelectorAll('.report-nav-link');
  
  if (sections.length === 0 || navLinks.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: '-30% 0px -60% 0px', // Trigger active when section occupies middle/upper viewport
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(sec => observer.observe(sec));
}

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initStickyNavObserver();
});
