/**
 * Scroll reveal logic for the LOTM analysis page.
 * Follows strict modular structure and coding guidelines.
 */

function handleReveal(entry, observer) {
  if (!entry.isIntersecting) return;
  entry.target.classList.add('visible');
  observer.unobserve(entry.target);
}

function initLotmReveals() {
  const elements = document.querySelectorAll('.fade-in-up, .fade-in');
  if (!elements.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => handleReveal(entry, observer));
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  initLotmReveals();
});
