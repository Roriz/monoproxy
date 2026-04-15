// ═══════════════════════════════════════════════════════════════
// LOTM Charts — Lord of the Mysteries data visualizations
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
  }, { threshold: 0.15 });
  document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════════════════
// Reusable time-series playback controller
// ═══════════════════════════════════════════════════════════════

class TimeSeriesPlayer {
  /**
   * @param {object} opts
   * @param {string} opts.playBtnId
   * @param {string} opts.playIconId
   * @param {string} opts.pauseIconId
   * @param {string} opts.sliderId
   * @param {string} opts.chapterNumId
   * @param {string} opts.speedBtnSelector
   * @param {number} opts.maxChapter
   * @param {function(number): void} opts.onUpdate – called with current chapter
   */
  constructor(opts) {
    this.maxChapter = opts.maxChapter;
    this.currentChapter = 1;
    this.isPlaying = false;
    this.interval = null;
    this.speed = 1;
    this.onUpdate = opts.onUpdate;

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
    this.currentChapter = chapter;
    this.slider.value = chapter;
    this.chapterNum.textContent = chapter;
    this.onUpdate(chapter);
  }

  play() {
    if (this.currentChapter >= this.maxChapter) {
      this.currentChapter = 1;
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
// Chart 02 — Bar Chart Race
// ═══════════════════════════════════════════════════════════════

const RACE_TOTAL_CHAPTERS = 140;
const RACE_TOP_N = 12;

const raceEntities = [
  {
    name: 'Klein', type: 'person', start: 1,
    grow: (ch) => 30 + Math.sin(ch * 0.07) * 8 + Math.random() * 12
  },
  {
    name: 'Dunn', type: 'person', start: 1,
    grow: (ch) => ch <= 60 ? 8 + Math.random() * 5 : (ch <= 75 ? 3 + Math.random() * 2 : Math.random() * 0.5)
  },
  {
    name: 'Audrey', type: 'person', start: 15,
    grow: (ch) => ch < 15 ? 0 : (3 + Math.sin(ch * 0.04) * 1.5 + Math.random() * 2)
  },
  {
    name: 'Neil', type: 'person', start: 1,
    grow: (ch) => ch <= 50 ? 4 + Math.random() * 3 : (ch <= 80 ? 2 + Math.random() * 1.5 : Math.random() * 0.8)
  },
  {
    name: 'Leonard Mitchell', type: 'person', start: 1,
    grow: (ch) => ch <= 45 ? 4 + Math.random() * 2 : (ch <= 90 ? 1.5 + Math.random() * 1 : Math.random() * 0.3)
  },
  {
    name: 'Melissa Moretti', type: 'person', start: 3,
    grow: (ch) => ch < 3 ? 0 : (ch <= 55 ? 3.5 + Math.random() * 2 : (ch <= 90 ? 1 + Math.random() * 1 : Math.random() * 0.3))
  },
  {
    name: 'Alger', type: 'person', start: 20,
    grow: (ch) => ch < 20 ? 0 : (1.5 + Math.sin(ch * 0.03) * 0.8 + Math.random() * 1.2)
  },
  {
    name: 'Benson Moretti', type: 'person', start: 3,
    grow: (ch) => ch < 3 ? 0 : (ch <= 50 ? 3 + Math.random() * 2 : (ch <= 80 ? 0.8 + Math.random() * 0.6 : Math.random() * 0.2))
  },
  {
    name: 'Nighthawks', type: 'organization', start: 5,
    grow: (ch) => ch < 5 ? 0 : (ch <= 65 ? (Math.random() > 0.4 ? 1.5 + Math.random() * 2 : 0) : Math.random() * 0.3)
  },
  {
    name: 'Beyonders', type: 'lore', start: 8,
    grow: (ch) => {
      if (ch < 8) return 0;
      const bursts = [15, 30, 55, 80, 110];
      const nearBurst = bursts.some(b => Math.abs(ch - b) <= 3);
      return nearBurst ? 4 + Math.random() * 3 : (Math.random() > 0.5 ? 0.5 + Math.random() * 0.5 : 0);
    }
  },
  {
    name: 'Blackthorn Security Co.', type: 'organization', start: 1,
    grow: (ch) => ch <= 55 ? 1.5 + Math.random() * 1.2 : Math.random() * 0.2
  },
  {
    name: 'Fool', type: 'person', start: 25,
    grow: (ch) => ch < 25 ? 0 : (0.5 + (ch / 140) * 1.2 + Math.random() * 0.8)
  },
];

function generateRaceData() {
  let seed = 42;
  const seededRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const origRandom = Math.random;
  Math.random = seededRandom;

  const data = [];
  const cumulative = {};
  raceEntities.forEach(e => cumulative[e.name] = 0);

  for (let ch = 1; ch <= RACE_TOTAL_CHAPTERS; ch++) {
    raceEntities.forEach(e => {
      if (ch >= e.start) {
        cumulative[e.name] += Math.max(0, e.grow(ch));
      }
    });
    const snapshot = raceEntities
      .map(e => ({ name: e.name, type: e.type, value: Math.round(cumulative[e.name]) }))
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, RACE_TOP_N);
    data.push(snapshot);
  }

  Math.random = origRandom;
  return data;
}

const raceColorMap = {
  person: 'rgba(167, 139, 250, 0.85)',
  organization: 'rgba(45, 212, 191, 0.85)',
  lore: 'rgba(245, 158, 11, 0.85)',
};

function initBarChartRace() {
  const raceData = generateRaceData();

  const raceCtx = document.getElementById('raceChart').getContext('2d');
  const raceContainer = document.getElementById('raceChartContainer');
  raceContainer.style.height = (RACE_TOP_N * 42 + 50) + 'px';

  function getFrameData(chapterIndex) {
    const frame = raceData[chapterIndex];
    while (frame.length < RACE_TOP_N) {
      frame.push({ name: '', type: 'person', value: 0 });
    }
    return frame;
  }

  const initialFrame = getFrameData(0);

  const raceChart = new Chart(raceCtx, {
    type: 'bar',
    data: {
      labels: initialFrame.map(d => d.name),
      datasets: [{
        data: initialFrame.map(d => d.value),
        backgroundColor: initialFrame.map(d => raceColorMap[d.type]),
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 26,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 16 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,10,10,0.92)',
          borderColor: 'rgba(168,85,247,0.25)',
          borderWidth: 1,
          titleFont: { family: "'Inter', sans-serif", size: 13, weight: 600 },
          bodyFont: { family: "'Inter', sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: (item) => {
              const d = getFrameData(player.currentChapter - 1)[item.dataIndex];
              if (!d || !d.name) return '';
              const typeLabel = d.type === 'lore' ? 'Lore term'
                : d.type.charAt(0).toUpperCase() + d.type.slice(1);
              return `  ${item.formattedValue} mentions  ·  ${typeLabel}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawTicks: false },
          border: { display: false },
          ticks: {
            color: 'rgba(255,255,255,0.25)',
            font: { family: "'Inter', sans-serif", size: 11 },
            callback: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v,
            padding: 8,
          },
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: 'rgba(255,255,255,0.55)',
            font: { family: "'Inter', sans-serif", size: 12, weight: 500 },
            padding: 12,
          },
        },
      },
      animation: {
        duration: 250,
        easing: 'easeOutCubic',
      },
    },
  });

  const player = new TimeSeriesPlayer({
    playBtnId: 'racePlayBtn',
    playIconId: 'playIcon',
    pauseIconId: 'pauseIcon',
    sliderId: 'raceSlider',
    chapterNumId: 'raceChapterNum',
    speedBtnSelector: '#entity-race .speed-btn',
    maxChapter: RACE_TOTAL_CHAPTERS,
    onUpdate(chapter) {
      const frame = getFrameData(chapter - 1);
      raceChart.data.labels = frame.map(d => d.name);
      raceChart.data.datasets[0].data = frame.map(d => d.value);
      raceChart.data.datasets[0].backgroundColor = frame.map(d => raceColorMap[d.type]);
      raceChart.update('none');
    },
  });

  player.goTo(1);
}


// ═══════════════════════════════════════════════════════════════
// Chart 03 — Vanishing Characters (Time Series)
// ═══════════════════════════════════════════════════════════════

const VANISH_TOP_N = 12;

function drawVanishChart(canvas, ctx, frameData, nowCh, maxCh) {
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const width = container.clientWidth;

  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = Math.min(170, width * 0.22);
  const GAP_LABEL_WIDTH = 80;
  const CHART_LEFT = LABEL_WIDTH;
  const CHART_RIGHT = width - GAP_LABEL_WIDTH;
  const CHART_WIDTH = CHART_RIGHT - CHART_LEFT;
  const TOP_PAD = 10;
  const BOTTOM_PAD = 40;
  const rowCount = frameData.length || VANISH_TOP_N;
  const totalHeight = TOP_PAD + rowCount * ROW_HEIGHT + BOTTOM_PAD;

  canvas.width = width * dpr;
  canvas.height = totalHeight * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = totalHeight + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, totalHeight);

  const dotColor = 'rgba(129, 108, 219, 0.9)';
  const lineColor = 'rgba(129, 108, 219, 0.35)';
  const labelColor = 'rgba(255, 255, 255, 0.55)';
  const gapLabelColor = 'rgba(129, 108, 219, 0.75)';
  const dotRadius = 5;

  const chToX = (ch) => CHART_LEFT + (ch / maxCh) * CHART_WIDTH;

  // Vertical grid lines
  const tickStep = maxCh <= 50 ? 10 : 50;
  const xTicks = [];
  for (let t = 0; t <= maxCh; t += tickStep) xTicks.push(t);
  const axisY = TOP_PAD + rowCount * ROW_HEIGHT + 20;
  xTicks.forEach(ch => {
    const x = chToX(ch);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, TOP_PAD);
    ctx.lineTo(x, TOP_PAD + rowCount * ROW_HEIGHT);
    ctx.stroke();
  });

  // "Now" line — marks the current chapter position
  if (nowCh > 0 && nowCh <= maxCh) {
    const nowX = chToX(nowCh);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(nowX, TOP_PAD - 5);
    ctx.lineTo(nowX, TOP_PAD + rowCount * ROW_HEIGHT + 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Entity rows — each entry in frameData is a completed gap to render
  frameData.forEach((d, i) => {
    const y = TOP_PAD + i * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Entity name label
    ctx.fillStyle = labelColor;
    ctx.font = '500 12.5px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.name, CHART_LEFT - 14, y);

    const x1 = chToX(d.lastSeen);
    const x2 = chToX(d.reappears);

    // Dashed gap line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start dot ("last seen")
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x1, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // End dot with glow ring ("reappears")
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x2, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(129, 108, 219, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x2, y, dotRadius + 3, 0, Math.PI * 2);
    ctx.stroke();

    // Gap label
    ctx.fillStyle = gapLabelColor;
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.gap + ' ch.', x2 + 14, y);
  });

  // X-axis tick labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  xTicks.forEach(ch => {
    ctx.fillText('ch. ' + ch, chToX(ch), axisY);
  });
}

async function initVanishChart() {
  const res = await fetch('gaps_per_chapter.json');
  const rawChapters = await res.json();

  // Extract actual chapter numbers from the chapter key (e.g. "chapter-008-..." → 8)
  const chapterNums = rawChapters.map(ch => {
    const match = ch.chapter.match(/chapter-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

  // Build per-chapter frames: each frame is the top N gaps at that chapter
  const frames = rawChapters.map(ch => {
    return ch.data
      .sort((a, b) => b.gap - a.gap)
      .slice(0, VANISH_TOP_N)
      .map(d => ({
        name: d.entity,
        lastSeen: d.start_chapter,
        reappears: d.end_chapter,
        gap: d.gap,
        classification: d.classification,
      }));
  });

  const totalFrames = frames.length;

  // Determine x-axis max from the data (furthest end_chapter across all frames)
  let xMax = 0;
  frames.forEach(frame => {
    frame.forEach(d => {
      if (d.reappears > xMax) xMax = d.reappears;
    });
  });
  xMax = Math.ceil(xMax / 50) * 50;
  if (xMax < 50) xMax = 50;

  const canvas = document.getElementById('vanishChart');
  const ctx = canvas.getContext('2d');
  let currentFrame = 0;

  // Update slider max to match actual frame count
  const slider = document.getElementById('vanishSlider');
  slider.max = totalFrames;
  // Update the "/N" label
  const chapterDisplay = document.querySelector('#vanishing-characters .chapter-display');
  if (chapterDisplay) {
    const span = chapterDisplay.querySelector('span');
    if (span) span.textContent = '/' + totalFrames;
  }

  function getFrame(frameIdx) {
    const idx = Math.max(0, Math.min(frameIdx, frames.length - 1));
    return frames[idx] || [];
  }

  function getRealChapter(frameIdx) {
    const idx = Math.max(0, Math.min(frameIdx, chapterNums.length - 1));
    return chapterNums[idx] || 1;
  }

  const player = new TimeSeriesPlayer({
    playBtnId: 'vanishPlayBtn',
    playIconId: 'vanishPlayIcon',
    pauseIconId: 'vanishPauseIcon',
    sliderId: 'vanishSlider',
    chapterNumId: 'vanishChapterNum',
    speedBtnSelector: '.vanish-speed-btn',
    maxChapter: totalFrames,
    onUpdate(frameNum) {
      currentFrame = frameNum - 1;
      const realCh = getRealChapter(currentFrame);
      drawVanishChart(canvas, ctx, getFrame(currentFrame), realCh, xMax);
    },
  });

  player.goTo(1);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    const realCh = getRealChapter(currentFrame);
    resizeTimer = setTimeout(() => drawVanishChart(canvas, ctx, getFrame(currentFrame), realCh, xMax), 150);
  });
}


// ═══════════════════════════════════════════════════════════════
// Bootstrap — initialize all charts on DOM ready
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  initScrollReveal();
  initBarChartRace();
  await initVanishChart();
});
