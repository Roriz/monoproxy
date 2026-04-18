// ═══════════════════════════════════════════════════════════════
// Bar Chart Race — Lord of the Mysteries data visualizations
// ═══════════════════════════════════════════════════════════════

// ── Scroll reveal ────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in-up, .fade-in').forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════════════════
// Reusable time-series playback controller
// ═══════════════════════════════════════════════════════════════

class TimeSeriesPlayer {
  constructor(opts) {
    this.maxChapter = opts.maxChapter;
    this.currentChapter = 1;
    this.isPlaying = false;
    this.interval = null;
    this.speed = 1;
    this.onUpdate = opts.onUpdate;
    this.startAt = opts.startAt || 0; // The point to restart from

    this.playBtn = document.getElementById(opts.playBtnId);
    this.playIcon = document.getElementById(opts.playIconId);
    this.pauseIcon = document.getElementById(opts.pauseIconId);
    this.slider = document.getElementById(opts.sliderId);
    this.chapterNum = document.getElementById(opts.chapterNumId);
    this.speedBtns = document.querySelectorAll(opts.speedBtnSelector);

    this._bindEvents();
  }

  _bindEvents() {
    this.playBtn.addEventListener('click', () => {
      this.isPlaying ? this.stop() : this.play();
    });

    this.slider.addEventListener('input', () => {
      if (this.isPlaying) this.stop();
      this.goTo(parseInt(this.slider.value));
    });

    this.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speed = parseInt(btn.dataset.speed);
        if (this.isPlaying) {
          this._restartInterval();
        }
      });
    });
  }

  goTo(chapter) {
    if (chapter < 1) chapter = 1;
    if (chapter > this.maxChapter) chapter = this.maxChapter;
    this.currentChapter = chapter;
    this.slider.value = chapter;
    this.chapterNum.textContent = chapter;
    this.onUpdate(chapter);
  }

  play() {
    if (this.currentChapter >= this.maxChapter) {
      this.currentChapter = this.startAt; 
    }
    this.isPlaying = true;
    this.playIcon.style.display = 'none';
    this.pauseIcon.style.display = 'block';
    this.playBtn.classList.add('active');
    this._restartInterval();
  }

  stop() {
    this.isPlaying = false;
    clearInterval(this.interval);
    this.interval = null;
    this.playIcon.style.display = 'block';
    this.pauseIcon.style.display = 'none';
    this.playBtn.classList.remove('active');
  }

  _restartInterval() {
    clearInterval(this.interval);
    this.interval = setInterval(() => {
      if (this.currentChapter >= this.maxChapter) {
        this.stop();
        return;
      }
      this.currentChapter++;
      this.goTo(this.currentChapter);
    }, 400 / this.speed);
  }
}

// ═══════════════════════════════════════════════════════════════
// Chart 02 — Bar Chart Race (DOM Version)
// ═══════════════════════════════════════════════════════════════

// Configuration
const TOP_N = 12;
const BAR_HEIGHT = 42; 
const colorMap = {
  person: 'oklch(78% 0.16 85 / 0.85)',       /* Beyonder Gold */
  organization: 'oklch(65% 0.12 180 / 0.85)', /* Alchemical Teal */
  lore: 'oklch(58% 0.18 28 / 0.85)',         /* Ancient Crimson */
  location: 'oklch(62% 0.1 250 / 0.85)',     /* Mystic Blue */
  other: 'oklch(55% 0.05 285 / 0.85)',       /* Shadow Slate */
};

async function initBarChartRace() {
  const dataRes = await fetch('race_data.json');
  const rawData = await dataRes.json();
  
  const snapshots = rawData.map(ch => {
    return ch.data
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, TOP_N)
      .map(d => ({
        id: d.entity,
        name: d.entity.charAt(0).toUpperCase() + d.entity.slice(1),
        type: d.classification.toLowerCase(),
        value: d.mentions
      }));
  });

  const totalChapters = snapshots.length;
  const container = document.getElementById('raceChart');
  container.style.height = (TOP_N * BAR_HEIGHT) + 'px';

  // Update dynamic total label
  const totalDisplay = document.getElementById('raceTotalChapters');
  if (totalDisplay) totalDisplay.textContent = '/' + totalChapters;

  // Tracking state
  const barElements = new Map();
  const disposalTimeouts = new Map(); // Track pending removals

  function updateChart(chapterIndex) {
    const frame = snapshots[chapterIndex] || [];
    if (frame.length === 0) return;

    const maxValue = frame[0].value || 1;
    const currentIds = new Set(frame.map(d => d.id));

    // Update or create bars
    frame.forEach((data, index) => {
      let el = barElements.get(data.id);
      
      // If bar was about to be removed, rescue it
      if (disposalTimeouts.has(data.id)) {
        clearTimeout(disposalTimeouts.get(data.id));
        disposalTimeouts.delete(data.id);
        el.style.opacity = '1';
      }

      if (!el) {
        el = createBarElement(data);
        container.appendChild(el);
        barElements.set(data.id, el);
        
        // Initial state
        el.style.transform = `translateY(${(index + 1) * BAR_HEIGHT}px) translateX(0)`;
        el.style.opacity = '0';
        requestAnimationFrame(() => el.style.opacity = '1');
      }

      // Explicitly set transform without additive strings
      const widthPercent = (data.value / maxValue) * 100;
      el.style.transform = `translateY(${index * BAR_HEIGHT}px) translateX(0)`;
      
      const innerBar = el.querySelector('.race-bar-inner');
      innerBar.style.width = `${widthPercent}%`;
      innerBar.style.backgroundColor = colorMap[data.type] || colorMap.other;
      
      el.querySelector('.race-bar-value').textContent = data.value.toLocaleString();
    });

    // Handle removals
    for (const [id, el] of barElements.entries()) {
      if (!currentIds.has(id) && !disposalTimeouts.has(id)) {
        el.style.opacity = '0';
        el.style.transform = `translateY(${parseInt(el.style.transform.match(/translateY\(([^)]+)\)/)[1])}px) translateX(-20px)`;
        
        const timeoutId = setTimeout(() => {
          if (el.parentNode === container) {
            container.removeChild(el);
          }
          barElements.delete(id);
          disposalTimeouts.delete(id);
        }, 400);
        disposalTimeouts.set(id, timeoutId);
      }
    }
  }

  function createBarElement(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'race-bar-wrapper';
    wrapper.innerHTML = `
      <div class="race-bar-label" title="${data.name}">${data.name}</div>
      <div class="race-bar-outer">
        <div class="race-bar-inner" style="width: 0%; background-color: ${colorMap[data.type] || colorMap.other}">
          <div class="race-bar-value">0</div>
        </div>
      </div>
    `;
    return wrapper;
  }

  const player = new TimeSeriesPlayer({
    playBtnId: 'racePlayBtn',
    playIconId: 'playIcon',
    pauseIconId: 'pauseIcon',
    sliderId: 'raceSlider',
    chapterNumId: 'raceChapterNum',
    speedBtnSelector: '#entity-race .speed-btn',
    maxChapter: totalChapters,
    onUpdate(chapter) {
      updateChart(chapter - 1);
    },
  });

  window.playerRegistry = window.playerRegistry || [];
  window.playerRegistry.push(player);

  player.goTo(1);
  const slider = document.getElementById('raceSlider');
  if (slider) slider.max = totalChapters;
}

document.addEventListener('DOMContentLoaded', async () => {
  initScrollReveal();
  await initBarChartRace();
});
