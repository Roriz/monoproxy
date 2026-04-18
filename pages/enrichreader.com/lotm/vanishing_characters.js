// ═══════════════════════════════════════════════════════════════
// Vanishing Characters — Lord of the Mysteries data visualizations
// ═══════════════════════════════════════════════════════════════

const VANISH_TOP_N = 12;

const lerp = (a, b, t) => a + (b - a) * t;

// Decisive Ease Out Expo
const easeOutExpo = (t) => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

// Tracks visually rendered values for smooth interpolation
let visState = {
  entities: new Map(), // name -> { y, x1, x2, alpha, gap }
  nowCh: 1,
  targetNowCh: 1,
  targetEntities: new Map()
};

// Helper: Title Case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Main render function that draws the state at any given frame.
 */
function renderVanishChart(canvas, ctx, state, maxChConfig) {
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  if (!container) return;
  const width = container.clientWidth;

  const isMobile = width < 768;
  const ROW_HEIGHT = isMobile ? 42 : 50;
  const LABEL_WIDTH = isMobile ? width * 0.35 : Math.min(200, width * 0.25);
  const GAP_LABEL_WIDTH = 90;
  const CHART_LEFT = LABEL_WIDTH;
  const CHART_RIGHT = width - GAP_LABEL_WIDTH;
  const CHART_WIDTH = CHART_RIGHT - CHART_LEFT;
  const TOP_PAD = 20;
  const BOTTOM_PAD = 50;
  const rowCount = VANISH_TOP_N;
  const totalHeight = TOP_PAD + rowCount * ROW_HEIGHT + BOTTOM_PAD;

  // Sync canvas size if needed (avoiding constant resize)
  if (canvas.width !== width * dpr || canvas.height !== totalHeight * dpr) {
    canvas.width = width * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = totalHeight + 'px';
    ctx.scale(dpr, dpr);
  }

  ctx.clearRect(0, 0, width, totalHeight);

  const dotRadius = 6;
  const chToX = (ch) => CHART_LEFT + (ch / maxChConfig) * CHART_WIDTH;

  // Retrieve theme colors from CSS
  const style = getComputedStyle(document.documentElement);
  const accentColor = style.getPropertyValue('--color-accent') || '#cab372';
  const parchmentColor = style.getPropertyValue('--color-text-primary') || '#ebebe1';

  // Grid and Axis
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const tickStep = 50;
  for (let t = 0; t <= maxChConfig; t += tickStep) {
    const x = chToX(t);
    ctx.beginPath();
    ctx.moveTo(x, TOP_PAD);
    ctx.lineTo(x, TOP_PAD + rowCount * ROW_HEIGHT);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ch.' + t, x, TOP_PAD + rowCount * ROW_HEIGHT + 24);
  }

  // "Now" line
  const nowX = chToX(state.nowCh);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(nowX, TOP_PAD - 10);
  ctx.lineTo(nowX, TOP_PAD + rowCount * ROW_HEIGHT + 10);
  ctx.stroke();
  
  // "Now" label
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '700 9px "Manrope", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CURRENT CHAPTER', nowX, TOP_PAD - 14);

  // ── Render Entities ──
  state.entities.forEach((d, name) => {
    if (d.alpha <= 0.01) return;

    ctx.globalAlpha = d.alpha;
    const y = TOP_PAD + d.y + ROW_HEIGHT / 2;
    const x1 = chToX(d.x1);
    const x2 = chToX(d.x2);

    // Entity name label
    ctx.fillStyle = parchmentColor;
    ctx.globalAlpha = d.alpha; // High contrast
    ctx.font = `600 ${isMobile ? '10px' : '13px'} "Spectral", serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(toTitleCase(name), CHART_LEFT - 18, y);

    // Absence span line (Thicker dotted)
    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = 0.4 * d.alpha;
    ctx.lineWidth = 3.5;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Actual dots
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 1.0 * d.alpha;
    ctx.beginPath();
    ctx.arc(x1, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Gap label
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 1.0 * d.alpha;
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(d.gap) + ' ch.', x2 + 18, y);
    
    ctx.globalAlpha = 1.0;
  });
}

/**
 * Main animation loop
 */
let animationRunning = false;
let xMaxConfig = 0;

function startAnimation(canvas, ctx) {
  if (animationRunning) return;
  animationRunning = true;

  const ROW_HEIGHT = 44;
  const DAMPING = 0.15; // Smoothness factor
  const MIN_DELTA = 0.01;

  function loop() {
    let diff = 0;

    // Interpolate Global Values
    if (Math.abs(visState.nowCh - visState.targetNowCh) > 0.1) {
      visState.nowCh = lerp(visState.nowCh, visState.targetNowCh, DAMPING);
      diff += Math.abs(visState.nowCh - visState.targetNowCh);
    } else {
      visState.nowCh = visState.targetNowCh;
    }

    // Interpolate Entities
    visState.entities.forEach((vis, name) => {
      const target = visState.targetEntities.get(name);
      
      // If entity is no longer in target, fade it out
      if (!target) {
        vis.alpha = lerp(vis.alpha, 0, DAMPING);
        diff += vis.alpha;
        if (vis.alpha < 0.01) visState.entities.delete(name);
        return;
      }

      // Smooth Rank (Y-axis)
      vis.y = lerp(vis.y, target.rank * ROW_HEIGHT, DAMPING);
      vis.x1 = lerp(vis.x1, target.x1, DAMPING);
      vis.x2 = lerp(vis.x2, target.x2, DAMPING);
      vis.alpha = lerp(vis.alpha, 1, DAMPING);
      vis.gap = lerp(vis.gap, target.gap, DAMPING);

      diff += Math.abs(vis.y - target.rank * ROW_HEIGHT);
      diff += Math.abs(vis.x1 - target.x1);
    });

    // Check for new target entities not in vis
    visState.targetEntities.forEach((target, name) => {
      if (!visState.entities.has(name)) {
        visState.entities.set(name, {
          y: target.rank * ROW_HEIGHT,
          x1: target.x1,
          x2: target.x2,
          alpha: 0,
          gap: target.gap
        });
        diff += 1;
      }
    });

    renderVanishChart(canvas, ctx, visState, xMaxConfig);

    if (diff > MIN_DELTA || Math.abs(visState.nowCh - visState.targetNowCh) > 0.1) {
      requestAnimationFrame(loop);
    } else {
      animationRunning = false;
    }
  }

  requestAnimationFrame(loop);
}

async function initVanishChart() {
  const res = await fetch('gaps_per_chapter.json');
  const rawChapters = await res.json();

  const chapterNums = rawChapters.map(ch => {
    const match = ch.chapter.match(/chapter-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

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
  const startAt = Math.floor(totalFrames * 0.25); 

  frames.forEach(frame => {
    frame.forEach(d => {
      if (d.reappears > xMaxConfig) xMaxConfig = d.reappears;
    });
  });
  xMaxConfig = Math.ceil(xMaxConfig / 50) * 50;
  if (xMaxConfig < 50) xMaxConfig = 50;

  const canvas = document.getElementById('vanishChart');
  const ctx = canvas.getContext('2d');
  
  // Set up visState targets
  visState.targetNowCh = 1;
  visState.targetEntities = new Map();

  const player = new TimeSeriesPlayer({
    playBtnId: 'vanishPlayBtn',
    playIconId: 'vanishPlayIcon',
    pauseIconId: 'vanishPauseIcon',
    sliderId: 'vanishSlider',
    chapterNumId: 'vanishChapterNum',
    speedBtnSelector: '.vanish-speed-btn',
    maxChapter: totalFrames,
    startAt: startAt, 
    onUpdate(frameNum) {
      const idx = frameNum - 1;
      const frameData = frames[idx] || [];
      const realCh = chapterNums[idx] || 1;

      visState.targetNowCh = realCh;
      visState.targetEntities = new Map(frameData.map((d, i) => [d.name, {
        rank: i,
        x1: d.lastSeen,
        x2: d.reappears,
        gap: d.gap
      }]));

      startAnimation(canvas, ctx);
    },
  });

  window.playerRegistry = window.playerRegistry || [];
  window.playerRegistry.push(player);

  const totalDisplay = document.getElementById('vanishTotalChapters');
  if (totalDisplay) totalDisplay.textContent = '/' + totalFrames;

  const vanishSlider = document.getElementById('vanishSlider');
  if (vanishSlider) vanishSlider.max = totalFrames;

  // Initial State
  player.goTo(totalFrames);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!animationRunning) startAnimation(canvas, ctx);
    }, 150);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await initVanishChart();
});
