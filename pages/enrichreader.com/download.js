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

function getAndroidCta() {
  return `
    <div class="glass p-6 rounded-[32px] border border-gold-500/20 shadow-gold animate-reveal-up max-w-md mx-auto">
      <h3 class="text-xl font-bold serif italic text-cream-100 mb-2">Android Detected</h3>
      <p class="text-xs text-neutral-400 mb-6">Native fullscreen reading with offline book storage.</p>
      <a href="https://play.google.com/store/apps/details?id=com.enrichreader.app" target="_blank"
        class="inline-block px-8 py-3.5 bg-brand-primary text-neutral-950 rounded-full font-bold text-sm hover:bg-gold-400 transition-all shadow-gold transform hover:scale-105">
        Get on Google Play
      </a>
    </div>
  `;
}

function getIosCta() {
  return `
    <div class="glass p-6 rounded-[32px] border border-gold-500/20 shadow-gold animate-reveal-up max-w-md mx-auto">
      <h3 class="text-xl font-bold serif italic text-cream-100 mb-2">iOS Detected</h3>
      <p class="text-xs text-neutral-400 mb-6">Install borderless Home Screen App for immersive reading.</p>
      <button onclick="triggerPwaModal('ios')"
        class="px-8 py-3.5 bg-brand-primary text-neutral-950 rounded-full font-bold text-sm hover:bg-gold-400 transition-all shadow-gold transform hover:scale-105">
        View Install Steps
      </button>
    </div>
  `;
}

function getDesktopCta() {
  return `
    <div class="glass p-6 rounded-[32px] border border-gold-500/20 shadow-gold animate-reveal-up max-w-md mx-auto">
      <h3 class="text-xl font-bold serif italic text-cream-100 mb-2">Desktop Detected</h3>
      <p class="text-xs text-neutral-400 mb-6">Drag-and-drop local reader inside your browser.</p>
      <a href="https://app.enrichreader.com" target="_blank"
        class="inline-block px-8 py-3.5 bg-brand-primary text-neutral-950 rounded-full font-bold text-sm hover:bg-gold-400 transition-all shadow-gold transform hover:scale-105">
        Launch Web Reader
      </a>
    </div>
  `;
}

function getCtaContent(device) {
  if (device === 'android') return getAndroidCta();
  if (device === 'ios') return getIosCta();
  return getDesktopCta();
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

function initDownloadPage() {
  const ctaBox = document.getElementById('dynamic-cta-box');
  if (!ctaBox) return;

  ctaBox.innerHTML = getCtaContent(detectDevice());
}

document.addEventListener('DOMContentLoaded', () => {
  initDownloadPage();
});
