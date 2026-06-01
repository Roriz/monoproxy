/**
 * Download page interaction script for EnrichReader.
 * Follows strict modular structure and coding guidelines.
 */

function detectDevice() {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'desktop';
}

function setFeatured(card, btn, platform) {
  const cardClass = "glass p-8 rounded-[32px] border hover:scale-[1.02] transition-all duration-500 flex flex-col items-center justify-between group text-center cursor-pointer block";

  if (platform === 'android') {
    card.className = cardClass;
    card.style.borderColor = "rgba(149, 207, 0, 0.3)";
    card.style.boxShadow = "0 0 40px -12px rgba(149, 207, 0, 0.3)";
    card.onmouseover = function () {
      this.style.borderColor = "rgba(149, 207, 0, 0.6)";
      this.style.boxShadow = "0 0 40px -8px rgba(149, 207, 0, 0.5)";
    };
    card.onmouseout = function () {
      this.style.borderColor = "rgba(149, 207, 0, 0.3)";
      this.style.boxShadow = "0 0 40px -12px rgba(149, 207, 0, 0.3)";
    };

    if (btn) {
      btn.className = "w-full py-3 rounded-full text-center text-xs font-bold transition duration-300 mt-6";
      btn.style.backgroundColor = "#95CF00";
      btn.style.color = "#0a0a0a";
      btn.style.boxShadow = "0 0 40px -12px rgba(149, 207, 0, 0.5)";
      btn.onmouseover = function () {
        this.style.backgroundColor = "#b0f200";
        this.style.boxShadow = "0 0 40px -8px rgba(149, 207, 0, 0.7)";
      };
      btn.onmouseout = function () {
        this.style.backgroundColor = "#95CF00";
        this.style.boxShadow = "0 0 40px -12px rgba(149, 207, 0, 0.5)";
      };
    }
  } else {
    card.className = cardClass + " border-gold-500/30 hover:border-gold-500/60 shadow-gold" + (platform === 'ios' ? " w-full" : "");
    card.style.borderColor = "";
    card.style.boxShadow = "";
    card.onmouseover = card.onmouseout = null;

    if (btn) {
      btn.className = "w-full py-3 bg-brand-primary text-neutral-950 rounded-full text-center text-xs font-bold hover:bg-gold-400 transition duration-300 shadow-gold mt-6";
      btn.style.backgroundColor = btn.style.color = btn.style.boxShadow = "";
      btn.onmouseover = btn.onmouseout = null;
    }
  }

  const desc = card.querySelector('p');
  if (desc) {
    desc.textContent = platform === 'android' ? "Native fullscreen reading with offline book storage." :
                       platform === 'ios' ? "Install borderless Home Screen App for immersive, fullscreen reading." :
                       "Instant, zero-install desktop reading with local book loading.";
  }
}

function setStandard(card, btn, platform) {
  const cardClass = "glass p-10 rounded-[32px] border border-neutral-800 hover:scale-[1.02] transition-all duration-500 flex flex-col items-center justify-between group text-center cursor-pointer";

  if (platform === 'android') {
    card.className = cardClass + " hover:border-[#95CF00]/30";
    card.style.borderColor = card.style.boxShadow = "";
    card.onmouseover = card.onmouseout = null;

    if (btn) {
      btn.className = "w-full py-3 border border-neutral-700 rounded-full text-center text-xs font-bold text-neutral-300 group-hover:border-[#95CF00] group-hover:text-[#95CF00] transition duration-300 mt-8";
      btn.style.backgroundColor = btn.style.color = btn.style.boxShadow = "";
      btn.onmouseover = btn.onmouseout = null;
    }
  } else {
    card.className = cardClass + (platform === 'ios' ? " hover:border-neutral-700 w-full" : " hover:border-gold-500/30");
    card.style.borderColor = card.style.boxShadow = "";
    card.onmouseover = card.onmouseout = null;

    if (btn) {
      btn.className = "w-full py-3 border border-neutral-700 rounded-full text-center text-xs font-bold text-neutral-300 group-hover:border-gold-500 group-hover:text-gold-500 transition duration-300 mt-8";
      btn.style.backgroundColor = btn.style.color = btn.style.boxShadow = "";
      btn.onmouseover = btn.onmouseout = null;
    }
  }

  const desc = card.querySelector('p');
  if (desc) {
    desc.textContent = platform === 'android' ? "Native Android app with offline book storage." :
                       platform === 'ios' ? "Install borderless Home Screen App for immersive reading." :
                       "Instant, zero-install desktop reading with local book loading.";
  }
}

function renderDynamicRouter() {
  const device = detectDevice();
  const heroContainer = document.getElementById('hero-cta-container');
  const matrixContainer = document.getElementById('matrix-grid-container');

  const cardAndroid = document.getElementById('card-android');
  const btnAndroid = document.getElementById('btn-android');
  const cardIos = document.getElementById('card-ios');
  const btnIos = document.getElementById('btn-ios');
  const cardWeb = document.getElementById('card-web');
  const btnWeb = document.getElementById('btn-web');

  if (!heroContainer || !matrixContainer || !cardAndroid || !cardIos || !cardWeb) return;

  if (device === 'ios') {
    setFeatured(cardIos, btnIos, 'ios');
    heroContainer.appendChild(cardIos);

    setStandard(cardAndroid, btnAndroid, 'android');
    setStandard(cardWeb, btnWeb, 'web');
    matrixContainer.appendChild(cardAndroid);
    matrixContainer.appendChild(cardWeb);
  } else if (device === 'desktop') {
    setFeatured(cardWeb, btnWeb, 'web');
    heroContainer.appendChild(cardWeb);

    setStandard(cardAndroid, btnAndroid, 'android');
    setStandard(cardIos, btnIos, 'ios');
    matrixContainer.appendChild(cardAndroid);
    matrixContainer.appendChild(cardIos);
  } else {
    setFeatured(cardAndroid, btnAndroid, 'android');
    heroContainer.appendChild(cardAndroid);

    setStandard(cardIos, btnIos, 'ios');
    setStandard(cardWeb, btnWeb, 'web');
    matrixContainer.appendChild(cardIos);
    matrixContainer.appendChild(cardWeb);
  }
}

window.triggerPwaModal = function () {
  const modal = document.getElementById('pwa-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => {
    modal.classList.remove('opacity-0', 'pointer-events-none');
  }, 10);
};

window.closePwaModal = function () {
  const modal = document.getElementById('pwa-modal');
  if (!modal) return;

  modal.classList.add('opacity-0', 'pointer-events-none');
  setTimeout(() => {
    modal.classList.remove('flex');
    modal.classList.add('hidden');
  }, 300);
};

document.addEventListener('DOMContentLoaded', () => {
  renderDynamicRouter();
});
