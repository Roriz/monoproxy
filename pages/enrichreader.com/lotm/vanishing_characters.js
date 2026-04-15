// ═══════════════════════════════════════════════════════════════
// Vanishing Characters — Lord of the Mysteries data visualizations
// ═══════════════════════════════════════════════════════════════

const VANISH_TOP_N = 12;

/**
 * Renders the vanishing characters chart.
 */
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
  const rowCount = Math.max(frameData.length, VANISH_TOP_N);
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, TOP_PAD);
    ctx.lineTo(x, TOP_PAD + rowCount * ROW_HEIGHT);
    ctx.stroke();
  });

  // "Now" line
  if (nowCh > 0 && nowCh <= maxCh) {
    const nowX = chToX(nowCh);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(nowX, TOP_PAD - 5);
    ctx.lineTo(nowX, TOP_PAD + rowCount * ROW_HEIGHT + 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Render Active Gaps ──
  frameData.forEach((d, i) => {
    const y = TOP_PAD + i * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x1 = chToX(d.lastSeen);
    const x2 = chToX(d.reappears);

    // Entity name label
    ctx.fillStyle = labelColor;
    ctx.font = '500 12.5px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.name, CHART_LEFT - 14, y);

    // Dashed gap line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Actual dots
    ctx.fillStyle = dotColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(129, 108, 219, 0.4)';
    ctx.beginPath();
    ctx.arc(x1, y, dotRadius, 0, Math.PI * 2);
    ctx.arc(x2, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Gap label
    ctx.fillStyle = gapLabelColor;
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.gap + ' ch.', x2 + 14, y);
  });

  // X-axis tick labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  xTicks.forEach(ch => {
    ctx.fillText('ch. ' + ch, chToX(ch), axisY);
  });
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
  const startAt = Math.floor(totalFrames * 0.25); // Skip early empty chapters

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
  let currentFrameIdx = 0;

  const player = new TimeSeriesPlayer({
    playBtnId: 'vanishPlayBtn',
    playIconId: 'vanishPlayIcon',
    pauseIconId: 'vanishPauseIcon',
    sliderId: 'vanishSlider',
    chapterNumId: 'vanishChapterNum',
    speedBtnSelector: '.vanish-speed-btn',
    maxChapter: totalFrames,
    startAt: startAt, // Use the defined variable
    onUpdate(frameNum) {
      currentFrameIdx = frameNum - 1;
      const realCh = getRealChapter(currentFrameIdx);
      drawVanishChart(canvas, ctx, getFrame(currentFrameIdx), realCh, xMax);
    },
  });

  const totalDisplay = document.getElementById('vanishTotalChapters');
  if (totalDisplay) totalDisplay.textContent = '/' + totalFrames;

  const vanishSlider = document.getElementById('vanishSlider');
  if (vanishSlider) vanishSlider.max = totalFrames;

  function getFrame(idx) {
    return frames[Math.max(0, Math.min(idx, frames.length - 1))] || [];
  }

  function getRealChapter(idx) {
    return chapterNums[Math.max(0, Math.min(idx, chapterNums.length - 1))] || 1;
  }

  // Initial State: Start at the Skip point
  player.goTo(totalFrames);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    const realCh = getRealChapter(currentFrameIdx);
    resizeTimer = setTimeout(() => drawVanishChart(canvas, ctx, getFrame(currentFrameIdx), realCh, xMax), 150);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await initVanishChart();
});
