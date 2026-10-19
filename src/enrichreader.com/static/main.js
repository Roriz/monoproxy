/**
 * Shared logic for EnrichReader
 */

function initParticles() {
  const voidEl = document.getElementById('void');
  if (!voidEl) return;

  const starCount = 120;
  const fragment = document.createDocumentFragment();
  const stars = [];

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2 + 1;
    const left = Math.random() * 100;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = left + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
    stars.push({ star, left, size });
    fragment.appendChild(star);
  }

  // Stars keep full strength in the side gutters and fade to --void-center-alpha
  // behind the reading column (see .void-bg in input.css). The fade is a per-star
  // opacity, not a mask-image on the star layer: a mask turns the whole viewport
  // into an offscreen pass that is redrawn on every twinkle frame. It depends on
  // the viewport width only, so it is recomputed when the width changes.
  let fadedWidth = 0;
  const fadeStars = () => {
    const width = voidEl.clientWidth;
    if (!width || width === fadedWidth) return;
    fadedWidth = width;
    const vars = getComputedStyle(voidEl);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const column = parseFloat(vars.getPropertyValue('--void-column')) * rem;
    const ramp = parseFloat(vars.getPropertyValue('--void-ramp')) * rem;
    const floor = parseFloat(vars.getPropertyValue('--void-center-alpha'));
    stars.forEach(({ star, left, size }) => {
      const fromColumn = Math.abs(left / 100 * width + size / 2 - width / 2) - column;
      const fade = Math.min(1, Math.max(floor, floor + (1 - floor) * fromColumn / ramp));
      star.style.setProperty('--fade', fade.toFixed(3));
    });
  };
  fadeStars();

  let fadeQueued = false;
  window.addEventListener('resize', () => {
    if (fadeQueued) return;
    fadeQueued = true;
    requestAnimationFrame(() => { fadeQueued = false; fadeStars(); });
  }, { passive: true });

  const layer = document.createElement('div');
  layer.className = 'void-stars';
  layer.appendChild(fragment);
  voidEl.appendChild(layer);
}

const TICKER_ITEMS = [
  { title: "Primal Hunter Vol 9", chapters: 320 },
  { title: "Defiance of the Fall Vol 12", chapters: 890 },
  { title: "Dungeon Crawler Carl Vol 7", chapters: 515 },
  { title: "Lord of the Mysteries Vol 8", chapters: 1551 },
  { title: "He Who Fights With Monsters Vol 11", chapters: 780 },
  { title: "Chrysalis Vol 5", chapters: 450 },
  { title: "The Wandering Inn Vol 10", chapters: 1200 },
  { title: "Shadow Slave Vol 4", chapters: 800 },
  { title: "Super Supportive Vol 2", chapters: 210 },
  { title: "Cradle: Waybound", chapters: 420 },
  { title: "Mother of Learning Vol 4", chapters: 118 },
  { title: "Reborn as a Demonic Tree Vol 3", chapters: 290 },
  { title: "The Beginning After The End Vol 10", chapters: 520 },
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
  initTicker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
