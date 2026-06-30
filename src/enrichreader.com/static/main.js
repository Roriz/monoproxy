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
        nav.style.top = '28px';
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

// Helper to extract a slugified filename based on the chart's control-label text title
function getSlugifiedTitle(card, fallbackId) {
  const labelEl = card.querySelector('.control-label');
  if (!labelEl) return `enrichreader-${fallbackId}`;
  
  let title = labelEl.textContent.trim().toLowerCase();
  title = title.replace(/\([^)]*\)/g, ''); // Remove content inside parentheses
  title = title.replace(/[^a-z0-9\s-]/g, ''); // Remove special characters
  title = title.replace(/[\s-]+/g, '-'); // Replace spaces/hyphens with a single hyphen
  title = title.trim().replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
  
  return title ? `enrichreader-${title}` : `enrichreader-${fallbackId}`;
}

// Chart sharing and exporting logic
function initChartActions() {
  document.querySelectorAll('.btn-share').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const card = btn.closest('.chart-card');
      if (!card) return;
      const section = card.closest('section');
      const sectionId = section ? section.id : '';
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      const success = await shareChart(card, sectionId);
      if (success) {
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>
          <span style="color: #22c55e;">Copied!</span>
        `;
      } else {
        btn.innerHTML = `
          <span style="color: #ef4444;">Failed</span>
        `;
      }
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }, 1500);
    });
  });

  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const card = btn.closest('.chart-card');
      if (!card) return;
      const section = card.closest('section');
      const sectionId = section ? section.id : 'chart';
      const filename = `${getSlugifiedTitle(card, sectionId)}.png`;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        <span>Exporting...</span>
      `;
      try {
        await downloadCardAsImage(card, filename);
      } catch (err) {
        console.error('Export failed:', err);
      }
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }, 1000);
    });
  });
}

async function shareChart(card, sectionId) {
  const url = window.location.origin + window.location.pathname + (sectionId ? '#' + sectionId : '');
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'EnrichReader Narrative Analytics',
        text: 'Check out this interactive reader analytics chart!',
        url: url
      });
      return true;
    } catch (e) {
      // Fallback to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (e) {
    console.error('Clipboard copy failed:', e);
    return false;
  }
}

async function getBase64Image(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to convert image to base64:', url, e);
    return url;
  }
}

async function replaceImagesWithBase64(element) {
  const images = element.querySelectorAll('img');
  for (const img of Array.from(images)) {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:')) {
      const base64 = await getBase64Image(src);
      img.src = base64;
    }
  }
}

function inlineStyles(src, dest) {
  const computed = window.getComputedStyle(src);
  for (let i = 0; i < computed.length; i++) {
    const key = computed[i];
    // Skip interactive and resource-fetching properties that cause canvas tainting
    if (key === 'cursor' || key.includes('list-style-image')) continue;

    const value = computed.getPropertyValue(key);
    // Allow data URI inline urls, skip external/relative url resources
    if (value && value.includes('url(') && !value.includes('url("data:') && !value.includes('url(\'data:') && !value.includes('url(data:')) {
      continue;
    }
    dest.style.setProperty(key, value);
  }

  for (let i = 0; i < src.children.length; i++) {
    inlineStyles(src.children[i], dest.children[i]);
  }
}

async function downloadCardAsImage(card, filename) {
  const canvas = card.querySelector('canvas');
  if (canvas) {
    try {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(canvas, 0, 0);

      const img = new Image();
      img.crossOrigin = "anonymous";
      const base64Logo = await getBase64Image('/assets/logo-4x1-dark-transparent.png');
      
      await new Promise((resolve) => {
        img.onload = () => {
          // Create repeating watermark pattern using the loaded image
          const patternCanvas = document.createElement('canvas');
          const pCtx = patternCanvas.getContext('2d');
          const tileW = 200;
          const tileH = 100;
          patternCanvas.width = tileW;
          patternCanvas.height = tileH;
          
          pCtx.clearRect(0, 0, tileW, tileH);
          pCtx.save();
          pCtx.translate(tileW / 2, tileH / 2);
          pCtx.rotate(-25 * Math.PI / 180);
          const logoW = 120;
          const logoH = (img.height / img.width) * logoW;
          pCtx.drawImage(img, -logoW / 2, -logoH / 2, logoW, logoH);
          pCtx.restore();
          
          const pattern = ctx.createPattern(patternCanvas, 'repeat');
          
          // Draw watermark pattern on top of the chart plots
          ctx.save();
          ctx.globalAlpha = 0.04; // 0.04 transparency
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.restore();

          // Draw bottom-right branding logo badge
          ctx.save();
          ctx.globalAlpha = 1.0;
          const pad = 20;
          const w = 120;
          const h = (img.height / img.width) * w;
          ctx.drawImage(img, tempCanvas.width - w - pad, tempCanvas.height - h - pad);
          ctx.restore();
          
          resolve();
        };
        img.onerror = () => {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'right';
          ctx.fillText('ENRICHREADER.COM', tempCanvas.width - 20, tempCanvas.height - 20);
          resolve();
        };
        img.src = base64Logo;
      });
      triggerDownload(tempCanvas.toDataURL('image/png'), filename);
    } catch (e) {
      console.error('Canvas export failed, downloading raw canvas:', e);
      triggerDownload(canvas.toDataURL('image/png'), filename);
    }
  } else {
    try {
      const matrixContainer = card.querySelector('.matrix-table-container');
      const exportTarget = matrixContainer || card;

      const width = exportTarget.scrollWidth;
      const height = exportTarget.scrollHeight;

      const clone = exportTarget.cloneNode(true);

      inlineStyles(exportTarget, clone);

      const toolbar = clone.querySelector('.chart-actions-toolbar');
      if (toolbar) toolbar.remove();

      const base64Logo = await getBase64Image('/assets/logo-4x1-dark-transparent.png');

      // If we are exporting only the matrix, wrap it in a padded card frame with watermark & logo
      let finalWidth = width;
      let finalHeight = height;

      if (matrixContainer) {
        const padding = 24;
        finalWidth = width + (padding * 2);
        finalHeight = height + (padding * 2) + 32; // Extra space at bottom for the logo

        clone.style.background = '#0a0a0c';
        clone.style.borderRadius = '1rem';
        clone.style.width = finalWidth + 'px';
        clone.style.height = finalHeight + 'px';
        clone.style.padding = `${padding}px ${padding}px ${padding + 32}px ${padding}px`;
        clone.style.boxSizing = 'border-box';
        clone.style.overflow = 'hidden';
        clone.style.position = 'relative';

        // Ensure table lies above background watermark
        const table = clone.querySelector('table');
        if (table) {
          table.style.position = 'relative';
          table.style.zIndex = '2';
          table.style.width = '100%';
        }

        // Append repeating watermark pattern
        const repeatingWatermark = document.createElement('div');
        repeatingWatermark.style.position = 'absolute';
        repeatingWatermark.style.top = '0';
        repeatingWatermark.style.left = '0';
        repeatingWatermark.style.width = '100%';
        repeatingWatermark.style.height = '100%';
        repeatingWatermark.style.pointerEvents = 'none';
        repeatingWatermark.style.zIndex = '9999';
        repeatingWatermark.style.overflow = 'hidden';

        const innerWatermark = document.createElement('div');
        innerWatermark.style.position = 'absolute';
        innerWatermark.style.top = '-50%';
        innerWatermark.style.left = '-50%';
        innerWatermark.style.width = '200%';
        innerWatermark.style.height = '200%';
        innerWatermark.style.backgroundImage = `url("${base64Logo}")`;
        innerWatermark.style.backgroundRepeat = 'repeat';
        innerWatermark.style.backgroundSize = '160px auto';
        innerWatermark.style.transform = 'rotate(-25deg)';
        innerWatermark.style.opacity = '0.04'; // 0.04 transparency
        innerWatermark.style.pointerEvents = 'none';

        repeatingWatermark.appendChild(innerWatermark);
        clone.appendChild(repeatingWatermark);

        // Append logo badge
        const logoBadge = document.createElement('div');
        logoBadge.style.position = 'absolute';
        logoBadge.style.bottom = '14px';
        logoBadge.style.right = '24px';
        logoBadge.style.opacity = '1';
        logoBadge.style.display = 'inline-flex';
        logoBadge.style.alignItems = 'center';
        logoBadge.style.gap = '8px';
        logoBadge.style.fontFamily = 'monospace';
        logoBadge.style.fontSize = '10px';
        logoBadge.style.textTransform = 'uppercase';
        logoBadge.style.letterSpacing = '0.15em';
        logoBadge.style.color = '#ffffff';
        logoBadge.style.zIndex = '10000';

        const logoText = document.createElement('span');
        logoText.textContent = 'Powered by';
        logoText.style.opacity = '0.5';

        const logoImg = document.createElement('img');
        logoImg.src = base64Logo;
        logoImg.style.height = '16px';
        logoImg.style.width = 'auto';

        logoBadge.appendChild(logoText);
        logoBadge.appendChild(logoImg);
        clone.appendChild(logoBadge);
      } else {
        clone.style.background = '#0a0a0c';
        clone.style.borderRadius = '1rem';
        clone.style.width = width + 'px';
        clone.style.height = height + 'px';
        clone.style.boxSizing = 'border-box';
        clone.style.overflow = 'hidden';

        const repeatingWatermark = clone.querySelector('.chart-watermark-overlay-repeating');
        if (repeatingWatermark) {
          repeatingWatermark.style.position = 'absolute';
          repeatingWatermark.style.top = '0';
          repeatingWatermark.style.left = '0';
          repeatingWatermark.style.width = '100%';
          repeatingWatermark.style.height = '100%';
          repeatingWatermark.style.overflow = 'hidden';
          repeatingWatermark.style.zIndex = '9999';
          repeatingWatermark.innerHTML = ''; // clear text SVG

          const innerWatermark = document.createElement('div');
          innerWatermark.style.position = 'absolute';
          innerWatermark.style.top = '-50%';
          innerWatermark.style.left = '-50%';
          innerWatermark.style.width = '200%';
          innerWatermark.style.height = '200%';
          innerWatermark.style.backgroundImage = `url("${base64Logo}")`;
          innerWatermark.style.backgroundRepeat = 'repeat';
          innerWatermark.style.backgroundSize = '160px auto';
          innerWatermark.style.transform = 'rotate(-25deg)';
          innerWatermark.style.opacity = '0.04'; // 0.04 transparency
          innerWatermark.style.pointerEvents = 'none';

          repeatingWatermark.appendChild(innerWatermark);
        }

        const badge = clone.querySelector('.card-branding-badge');
        if (badge) {
          badge.style.opacity = '0.8';
          badge.style.display = 'inline-flex';
        }
      }

      // Force all descendants to hide scrollbars to avoid rendering them in the image
      clone.querySelectorAll('*').forEach(el => {
        el.style.overflow = 'hidden';
        el.style.overflowX = 'hidden';
        el.style.overflowY = 'hidden';
      });

      await replaceImagesWithBase64(clone);

      const serializedHtml = new XMLSerializer().serializeToString(clone);
      const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${finalWidth}" height="${finalHeight}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="margin: 0; padding: 0; background: #0a0a0c; color: #ffffff; width: 100%; height: 100%;">
            ${serializedHtml}
          </div>
        </foreignObject>
      </svg>
      `;

      const tempCanvas = document.createElement('canvas');
      const scale = 2;
      tempCanvas.width = finalWidth * scale;
      tempCanvas.height = finalHeight * scale;
      const ctx = tempCanvas.getContext('2d');
      ctx.scale(scale, scale);

      const img = new Image();
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));

      await new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = (err) => {
          reject(err);
        };
        img.src = 'data:image/svg+xml;base64,' + svgBase64;
      });

      triggerDownload(tempCanvas.toDataURL('image/png'), filename);
    } catch (e) {
      console.warn('DOM screenshot capture failed, falling back to print preview:', e);
      card.classList.add('chart-card-print-target');
      window.print();
      setTimeout(() => {
        card.classList.remove('chart-card-print-target');
      }, 1000);
    }
  }
}

function triggerDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const TICKER_ITEMS = [
  { title: "Primal Hunter Vol 9", chapters: 320 },
  { title: "Defiance of the Fall Vol 12", chapters: 890 },
  { title: "Dungeon Crawler Carl Vol 7", chapters: 525 },
  { title: "Lord of the Mysteries Vol 8", chapters: 1432 },
  { title: "He Who Fights With Monsters Vol 11", chapters: 780 },
  { title: "Chrysalis Vol 5", chapters: 450 },
  { title: "The Wandering Inn Vol 10", chapters: 1200 },
  { title: "Shadow Slave Vol 4", chapters: 980 },
  { title: "Super Supportive Vol 2", chapters: 210 },
  { title: "Cradle: Waybound", chapters: 420 },
  { title: "Mother of Learning Vol 4", chapters: 108 },
  { title: "Reborn as a Demonic Tree Vol 3", chapters: 290 },
  { title: "The Beginning After The End Vol 10", chapters: 410 },
  { title: "Azarinth Healer Vol 4", chapters: 360 },
  { title: "Beware of Chicken Vol 4", chapters: 240 },
  { title: "System Apocalypse Vol 12", chapters: 680 },
  { title: "Iron Prince Vol 2", chapters: 180 },
  { title: "Mark of the Fool Vol 7", chapters: 490 },
  { title: "Path of Ascension Vol 6", chapters: 510 },
  { title: "Unbound Vol 8", chapters: 610 },
  { title: "Portal to Nova Roma Vol 3", chapters: 310 },
  { title: "Bastion Vol 3", chapters: 230 },
  { title: "Perfect Run Vol 3", chapters: 120 },
  { title: "Jake's Magical Market Vol 3", chapters: 250 },
  { title: "Randidly Ghosthound Vol 6", chapters: 670 }
];

function initTicker() {
  const tickerContainer = document.querySelector('.animate-marquee');
  if (!tickerContainer) return;

  const date = new Date();
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  
  // Seed calculation
  const seed = day + month * 31 + year;
  
  function getIndex(offset, max) {
    return (seed * 17 + offset * 31) % max;
  }
  
  const items = [...TICKER_ITEMS];
  
  const parsingIdx = getIndex(1, items.length);
  const parsingItem = items.splice(parsingIdx, 1)[0];
  
  const queued1Idx = getIndex(2, items.length);
  const queued1Item = items.splice(queued1Idx, 1)[0];
  
  const queued2Idx = getIndex(3, items.length);
  const queued2Item = items.splice(queued2Idx, 1)[0];
  
  const completed1Idx = getIndex(4, items.length);
  const completed1Item = items.splice(completed1Idx, 1)[0];
  
  const completed2Idx = getIndex(5, items.length);
  const completed2Item = items.splice(completed2Idx, 1)[0];
  
  const completed3Idx = getIndex(6, items.length);
  const completed3Item = items.splice(completed3Idx, 1)[0];
  
  const content = `
    <span>NOW PARSING: <strong class="text-gold-300">${parsingItem.title}</strong></span>
    <span class="text-neutral-700">·</span>
    <span>QUEUED: <strong class="text-neutral-500">${queued1Item.title}</strong>, <strong class="text-neutral-500">${queued2Item.title}</strong></span>
    <span class="text-neutral-700">·</span>
    <span>COMPLETED: <strong class="text-neutral-350">${completed1Item.title} (${completed1Item.chapters} chapters)</strong></span>
    <span class="text-neutral-700">·</span>
    <span>COMPLETED: <strong class="text-neutral-350">${completed2Item.title} (${completed2Item.chapters} chapters)</strong></span>
    <span class="text-neutral-700">·</span>
    <span>COMPLETED: <strong class="text-neutral-350">${completed3Item.title} (${completed3Item.chapters} chapters)</strong></span>
  `;
  
  tickerContainer.innerHTML = content + ` <span class="text-neutral-700">·</span> ` + content;
}

function initAll() {
  initParticles();
  initHeaderScroll();
  initMobileMenu();
  initChartActions();
  initTicker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
