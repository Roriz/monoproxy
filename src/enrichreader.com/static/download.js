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

function setAndroidFeatured(card, btn) {
  card.className = "glass p-8 rounded-[32px] border hover:scale-[1.02] transition-all duration-500 flex flex-col items-center justify-between group text-center cursor-pointer block";
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

  const desc = card.querySelector('p');
  if (desc) desc.textContent = "Native fullscreen reading with offline book storage.";
}

function setAndroidStandard(card, btn) {
  card.className = "glass p-10 rounded-[32px] border border-neutral-800 hover:border-[#95CF00]/30 hover:scale-[1.02] transition-all duration-500 flex flex-col items-center justify-between group text-center cursor-pointer";
  card.style.borderColor = "";
  card.style.boxShadow = "";
  card.onmouseover = null;
  card.onmouseout = null;

  if (btn) {
    btn.className = "w-full py-3 border border-neutral-700 rounded-full text-center text-xs font-bold text-neutral-300 group-hover:border-[#95CF00] group-hover:text-[#95CF00] transition duration-300 mt-8";
    btn.style.backgroundColor = "";
    btn.style.color = "";
    btn.style.boxShadow = "";
    btn.onmouseover = null;
    btn.onmouseout = null;
  }

  const desc = card.querySelector('p');
  if (desc) desc.textContent = "Native Android app with offline book storage.";
}

function setIosFeatured(card, btn) {
  card.className = "glass p-8 rounded-[32px] border border-gold-500/30 hover:border-gold-500/60 hover:scale-[1.02] transition-all duration-500 flex flex-col items-center justify-between shadow-gold group text-center cursor-pointer block w-full";
  card.style.borderColor = "";
  card.style.boxShadow = "";
  card.onmouseover = null;
  card.onmouseout = null;

  const icon = card.querySelector('#icon-ios');
  if (icon) {
    icon.className = "mb-6 inline-flex items-center justify-center group-hover:scale-110 transition-transform duration-300";
    icon.style.fontSize = "40pt";
    icon.style.width = "auto";
    icon.style.height = "auto";
  }

  if (btn) {
    btn.className = "w-full py-3 bg-brand-primary text-neutral-950 rounded-full text-center text-xs font-bold hover:bg-gold-400 transition duration-300 shadow-gold mt-6";
    btn.style.backgroundColor = "";
    btn.style.color = "";
    btn.style.boxShadow = "";
    btn.onmouseover = null;
    btn.onmouseout = null;
  }

  const desc = card.querySelector('p');
  if (desc) desc.textContent = "Install borderless Home Screen App for immersive, fullscreen reading.";
}

function setIosStandard(card, btn) {
  card.className = "glass p-10 rounded-[32px] border border-neutral-800 hover:border-neutral-700 hover:scale-[1.02] transition-all duration-500 flex flex-col items-center justify-between group text-center cursor-pointer w-full";
  card.style.borderColor = "";
  card.style.boxShadow = "";
  card.onmouseover = null;
  card.onmouseout = null;

  const icon = card.querySelector('#icon-ios');
  if (icon) {
    icon.className = "mb-6 inline-flex items-center justify-center group-hover:scale-110 transition-transform duration-300";
    icon.style.fontSize = "40pt";
    icon.style.width = "auto";
    icon.style.height = "auto";
  }

  if (btn) {
    btn.className = "w-full py-3 border border-neutral-700 rounded-full text-center text-xs font-bold text-neutral-300 group-hover:border-gold-500 group-hover:text-gold-500 transition duration-300 mt-8";
    btn.style.backgroundColor = "";
    btn.style.color = "";
    btn.style.boxShadow = "";
    btn.onmouseover = null;
    btn.onmouseout = null;
  }

  const desc = card.querySelector('p');
  if (desc) desc.textContent = "Install borderless Home Screen App for immersive reading.";
}

function setWebFeatured(card, btn) {
  card.className = "glass p-8 rounded-[32px] border border-gold-500/30 hover:border-gold-500/60 hover:scale-[1.02] transition-all duration-500 flex flex-col items-center justify-between shadow-gold group text-center cursor-pointer block";
  card.style.borderColor = "";
  card.style.boxShadow = "";
  card.onmouseover = null;
  card.onmouseout = null;

  const icon = card.querySelector('#icon-web');
  if (icon) {
    icon.className = "mb-6 inline-flex items-center justify-center group-hover:scale-110 transition-transform duration-300";
    icon.style.fontSize = "60pt";
    icon.style.width = "auto";
    icon.style.height = "auto";
  }

  if (btn) {
    btn.className = "w-full py-3 bg-brand-primary text-neutral-950 rounded-full text-center text-xs font-bold hover:bg-gold-400 transition duration-300 shadow-gold mt-6";
    btn.style.backgroundColor = "";
    btn.style.color = "";
    btn.style.boxShadow = "";
    btn.onmouseover = null;
    btn.onmouseout = null;
  }

  const desc = card.querySelector('p');
  if (desc) desc.textContent = "Instant, zero-install desktop reading with local book loading.";
}

function setWebStandard(card, btn) {
  card.className = "glass p-10 rounded-[32px] border border-neutral-800 hover:border-gold-500/30 hover:scale-[1.02] transition-all duration-500 flex flex-col items-center justify-between group text-center cursor-pointer";
  card.style.borderColor = "";
  card.style.boxShadow = "";
  card.onmouseover = null;
  card.onmouseout = null;

  const icon = card.querySelector('#icon-web');
  if (icon) {
    icon.className = "mb-6 inline-flex items-center justify-center group-hover:scale-110 transition-transform duration-300";
    icon.style.fontSize = "60pt";
    icon.style.width = "auto";
    icon.style.height = "auto";
  }

  if (btn) {
    btn.className = "w-full py-3 border border-neutral-700 rounded-full text-center text-xs font-bold text-neutral-300 group-hover:border-gold-500 group-hover:text-gold-500 transition duration-300 mt-8";
    btn.style.backgroundColor = "";
    btn.style.color = "";
    btn.style.boxShadow = "";
    btn.onmouseover = null;
    btn.onmouseout = null;
  }

  const desc = card.querySelector('p');
  if (desc) desc.textContent = "Instant, zero-install desktop reading with local book loading.";
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
    // 1. Move iOS card to hero
    setIosFeatured(cardIos, btnIos);
    heroContainer.appendChild(cardIos);

    // 2. Move Android & Web cards to matrix
    setAndroidStandard(cardAndroid, btnAndroid);
    setWebStandard(cardWeb, btnWeb);
    matrixContainer.appendChild(cardAndroid);
    matrixContainer.appendChild(cardWeb);
  } else if (device === 'desktop') {
    // 1. Move Web Reader card to hero
    setWebFeatured(cardWeb, btnWeb);
    heroContainer.appendChild(cardWeb);

    // 2. Move Android & iOS cards to matrix
    setAndroidStandard(cardAndroid, btnAndroid);
    setIosStandard(cardIos, btnIos);
    matrixContainer.appendChild(cardAndroid);
    matrixContainer.appendChild(cardIos);
  } else {
    // default (Android or unrecognized device) -> Featured is Android!
    // 1. Move Android card to hero
    setAndroidFeatured(cardAndroid, btnAndroid);
    heroContainer.appendChild(cardAndroid);

    // 2. Move iOS & Web cards to matrix
    setIosStandard(cardIos, btnIos);
    setWebStandard(cardWeb, btnWeb);
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
