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
  const ribbon = document.getElementById('reader-ribbon') || document.getElementById('enterprise-ribbon');
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
      drawer.classList.add('open');
      iconPath.setAttribute('d', closeIcon);
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('open');
      iconPath.setAttribute('d', openIcon);
      document.body.style.overflow = '';
    }
  }

  toggleBtn.addEventListener('click', toggleMenu);

  const navLinks = drawer.querySelectorAll('.mobile-nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (isOpen) toggleMenu();
    });
  });
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
  initHeaderScroll();
  initMobileMenu();
  initTicker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
