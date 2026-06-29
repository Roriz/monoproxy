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

function initContactForm() {
  const form = document.querySelector('#contact-form form');
  if (!form) return;

  const showNotification = (type, message) => {
    const notification = document.getElementById('form-notification');
    if (!notification) return;

    notification.className = 'p-4 rounded-xl border text-xs leading-relaxed font-light transition-all duration-300 mb-6';
    
    if (type === 'success') {
      notification.classList.add('bg-emerald-950/20', 'border-emerald-500/20', 'text-emerald-450', 'shadow-[0_0_15px_rgba(16,185,129,0.05)]');
    } else if (type === 'error') {
      notification.classList.add('bg-red-950/20', 'border-red-500/20', 'text-red-400', 'shadow-[0_0_15px_rgba(239,68,68,0.05)]');
    } else { // warning/rate-limit
      notification.classList.add('bg-gold-950/20', 'border-gold-500/20', 'text-gold-450', 'shadow-[0_0_15px_rgba(201,168,76,0.05)]');
    }

    notification.innerHTML = message.replace(/\n/g, '<br>');
    notification.classList.remove('hidden');
    notification.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Hide previous notification
    const notification = document.getElementById('form-notification');
    if (notification) notification.classList.add('hidden');

    // 1. Honeypot Bot Trap check
    const botTrap = document.getElementById('form-bot-trap');
    if (botTrap && botTrap.value) {
      console.warn('Spam bot submission blocked.');
      form.reset();
      return;
    }

    // 2. Local Storage Rate Limiting / Throttling (3 minutes)
    const lastSubmit = localStorage.getItem('enrich_last_submit');
    const now = Date.now();
    if (lastSubmit && (now - lastSubmit < 3 * 60 * 1000)) {
      const remainingTime = Math.ceil((3 * 60 * 1000 - (now - lastSubmit)) / 1000 / 60);
      showNotification('warning', `Submission rate limited. Please wait ${remainingTime} more minute(s) before resubmitting.`);
      return;
    }

    // 3. String Trimming & Basic Validation
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const orgInput = document.getElementById('user-org');
    const interestInput = document.getElementById('user-interest');
    const messageInput = document.getElementById('user-message');

    if (nameInput) nameInput.value = nameInput.value.trim();
    if (emailInput) emailInput.value = emailInput.value.trim();
    if (orgInput) orgInput.value = orgInput.value.trim();
    if (messageInput) messageInput.value = messageInput.value.trim();

    if (!nameInput.value || !emailInput.value || !messageInput.value) {
      showNotification('error', 'Please fill out all required fields.');
      return;
    }

    // 4. Double Submission Prevention (Disable Button)
    const submitBtn = form.querySelector('button[type="submit"]');
    let originalBtnText = '';
    if (submitBtn) {
      originalBtnText = submitBtn.innerText;
      submitBtn.disabled = true;
      submitBtn.innerText = 'Sending...';
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }

    // Live AJAX POST Submission
    const payload = {
      name: nameInput.value,
      email: emailInput.value,
      organization: orgInput ? orgInput.value : '',
      interest: interestInput ? interestInput.value : 'Other',
      message: messageInput.value
    };

    fetch('https://api.enrichreader.com/pub/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(async response => {
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        if (data && data.status === 'error') {
          if (data.errors) {
            // Unpack Rails-style validation error hash: { errors: { email: ["is invalid"] } }
            const errorList = Object.entries(data.errors)
              .map(([field, msgs]) => `${field.charAt(0).toUpperCase() + field.slice(1)} ${msgs.join(', ')}`)
              .join('\n');
            throw new Error(`Validation Error:\n${errorList}`);
          } else if (data.message) {
            throw new Error(data.message);
          }
        }
        throw new Error(`Server returned error status: ${response.status}`);
      }
      return data;
    })
    .then(data => {
      // Save submission timestamp
      localStorage.setItem('enrich_last_submit', Date.now());

      showNotification('success', 'Thank you! Your request has been successfully submitted.');
      form.reset();
    })
    .catch(error => {
      console.error('Error submitting form:', error);
      showNotification('error', error.message || 'There was a problem submitting your request. Please try again or email sales@enrichreader.com directly.');
    })
    .finally(() => {
      // Restore submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initProgressiveScroll();
  initScrollReveals();
  initDynamicCtas();
  initContactForm();
});
