/**
 * Homepage interaction script for EnrichReader.
 * Follows strict modular structure and coding guidelines.
 */

const profileData = {
  "1": {
    name: "Klein Moretti",
    desc: "A graduate of the History department of Khoy University who transmigrated into Tingen. In Chapter 11, he consumes the Seer potion to become a Sequence 9 Beyonder, officially joining the Nighthawks.",
    tags: ["Sequence 9: Seer", "History Graduate", "Nighthawk Guard"],
    theme: "gold"
  },
  "2": {
    name: "Sherlock Moriarty",
    desc: "Residing as a consulting detective in Backlund. In Chapter 293, Klein consumes the Magician formula to advance to Sequence 7, gaining powerful spellcasting illusions and paper substitutes.",
    tags: ["Sequence 7: Magician", "Consulting Detective", "Tarot Club Founder"],
    theme: "gold"
  },
  "3": {
    name: "Gehrman Sparrow",
    desc: "Under the disguise of a cold-blooded adventurer on the Sea of Ruins, Klein consumes the potion in Chapter 664 to become a Sequence 5 Marionettist, controlling the spirit body threads of his targets.",
    tags: ["Sequence 5: Marionettist", "Crazy Adventurer", "The Fool"],
    theme: "spoiler"
  }
};

function detectDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'desktop';
}

function getCtaText(device) {
  if (device === 'android') return 'Get Android App';
  if (device === 'ios') return 'Install Web App';
  return 'Launch Web Reader';
}

function initDynamicCtas() {
  const device = detectDeviceType();
  const ctaText = getCtaText(device);
  const heroCta = document.getElementById('hero-cta');
  const footerCta = document.getElementById('footer-cta');

  if (heroCta) heroCta.innerText = ctaText;
  if (footerCta) footerCta.innerText = ctaText;
}

function applyTheme(theme) {
  const box = document.getElementById('sticky-profile');
  const pName = document.getElementById('profile-name');
  const pTag = document.getElementById('profile-tag');
  const sWarn = document.getElementById('spoiler-warning');
  if (!box || !pName || !pTag || !sWarn) return;

  const isSpoiler = theme === 'spoiler';
  sWarn.classList.toggle('hidden', !isSpoiler);
  box.classList.toggle('border-gold-300/50', isSpoiler);
  box.classList.toggle('border-gold-500/30', !isSpoiler);
  pName.classList.toggle('text-gold-300', isSpoiler);
  
  if (isSpoiler) {
    pTag.classList.replace('text-gold-500', 'text-gold-300');
    return;
  }
  pTag.classList.replace('text-gold-300', 'text-gold-500');
}

function updateProfile(stepId) {
  const data = profileData[stepId];
  if (!data) return;

  document.getElementById('profile-name').innerText = data.name;
  document.getElementById('profile-desc').innerText = data.desc;
  
  const tagsHtml = data.tags.map(tag => 
    `<span class="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-white/5 border border-white/10 rounded-full text-gray-300 transition-all">${tag}</span>`
  ).join('');
  document.getElementById('profile-tags').innerHTML = tagsHtml;
  
  applyTheme(data.theme);
}

function handleIntersectionEntry(entry, steps) {
  if (!entry.isIntersecting) return;

  steps.forEach(s => {
    s.classList.remove('opacity-100');
    s.classList.add('opacity-30');
  });

  entry.target.classList.remove('opacity-30');
  entry.target.classList.add('opacity-100');

  const stepId = entry.target.getAttribute('data-step');
  updateProfile(stepId);
}

function initProgressiveScroll() {
  const steps = document.querySelectorAll('.timeline-step');
  if (!steps.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => handleIntersectionEntry(entry, steps));
  }, { rootMargin: '-40% 0px -40% 0px' });

  steps.forEach(step => observer.observe(step));
}

function handleRevealEntry(entry, observer) {
  if (!entry.isIntersecting) return;
  entry.target.classList.add('revealed');
  observer.unobserve(entry.target);
}

function initScrollReveals() {
  const targets = document.querySelectorAll('.reveal-on-scroll');
  if (!targets.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => handleRevealEntry(entry, observer));
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  targets.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  initProgressiveScroll();
  initScrollReveals();
  initDynamicCtas();
});
