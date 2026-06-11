// ═══════════════════════════════════════════════════════════════
// Entity Journey, Funnel, Absence Spans & Word Cloud — DCC
// ═══════════════════════════════════════════════════════════════

let donutChart = null;
let pronounsChart = null;

const COLOR_MAP = {
  person: 'var(--color-person)',         /* Gold */
  location: 'var(--color-location)',     /* Cyan */
  organization: 'var(--color-org)',      /* Teal */
  item: 'var(--color-item)',             /* Orange */
  event: 'var(--color-event)',           /* Crimson */
  other: 'var(--color-other)',           /* Lavender */
};

async function initEntityJourney() {
  try {
    const rawData = await window.dccDataPromise;
    const chapters = rawData.chapters;
    const totalChapters = chapters.length;
    const minCh = chapters[0].series_index;
    const maxCh = chapters[totalChapters - 1].series_index;

    // 1. Initialize Narrative Absence Gaps Bar Chart
    renderAbsenceSpansChart(rawData.absence_gaps);

    // 2. Initialize Word Cloud with Categorized Colors
    renderWordCloud(rawData.word_cloud);

    // 3. Initialize Pronouns Donut & Table
    renderPronounsChart(rawData.breakdowns.pronouns);

    // 4. Initialize Journey Slider Player
    const slider = document.getElementById('journeySlider');
    if (slider) {
      slider.min = minCh;
      slider.max = maxCh;
    }

    const journeyTotalChapters = document.getElementById('journeyTotalChapters');
    if (journeyTotalChapters) {
      journeyTotalChapters.textContent = '/' + maxCh;
    }

    const player = new window.TimeSeriesPlayer({
      playBtnId: 'journeyPlayBtn',
      playIconId: 'journeyPlayIcon',
      pauseIconId: 'journeyPauseIcon',
      sliderId: 'journeySlider',
      chapterNumId: null, // Avoid raw integer updates override
      speedBtnSelector: '.journey-speed-btn',
      minChapter: minCh,
      maxChapter: maxCh,
      onUpdate(seriesIndex) {
        updateNarrativeStep(seriesIndex, rawData);
      }
    });

    window.playerRegistry = window.playerRegistry || [];
    window.playerRegistry.push(player);

    // Initial render at max chapter to show full data on load
    player.goTo(maxCh);
    initFunnelAnimationObserver();

  } catch (err) {
    console.error('Error initializing entity journey controller:', err);
  }
}

// ── Funnel & Donut Step Update ───────────────────────────────
function updateNarrativeStep(seriesIndex, rawData) {
  const chapterInfo = rawData.chapters.find(c => c.series_index === seriesIndex);
  const labelEl = document.getElementById('journeyChapterNum');
  if (labelEl && chapterInfo) {
    labelEl.textContent = chapterInfo.label;
  }

  // Calculate active totals based on series index (Series scale up to 515)
  // Approximate a scaling growth for visual consistency
  const totalSeriesChapters = rawData.metadata.total_chapters;
  const progressRatio = seriesIndex / totalSeriesChapters;

  const rawMentions = Math.round(4280 * progressRatio);
  const uniqueChars = Math.round(317 * progressRatio);

  const funnel1 = document.getElementById('funnel-stage1-count');
  const funnel3 = document.getElementById('funnel-stage3-count');
  if (funnel1) funnel1.textContent = Math.max(10, rawMentions).toLocaleString();
  if (funnel3) funnel3.textContent = Math.max(1, uniqueChars).toLocaleString();

  // 2. Update Donut Chart
  updateBreakdownDonut(progressRatio, rawData.breakdowns);

  // 3. Update Mortality Feed in section 3 synchronously
  if (window.updateMortalityFeed) {
    window.updateMortalityFeed(seriesIndex);
  }
}

function updateBreakdownDonut(progressRatio, breakdowns) {
  const ctx = document.getElementById('entityDonutChart')?.getContext('2d');
  if (!ctx) return;

  // Approximate category distribution for active chapter (simulate data growth)
  const categories = {
    person: Math.max(1, Math.round(317 * progressRatio)),
    location: Math.max(1, Math.round(107 * progressRatio)),
    organization: Math.max(1, Math.round(125 * progressRatio)),
    item: Math.max(1, Math.round(140 * progressRatio)),
    event: Math.max(1, Math.round(98 * progressRatio)),
    other: Math.max(1, Math.round(43 * progressRatio))
  };

  const total = Object.values(categories).reduce((a, b) => a + b, 0);
  const totalDisplay = document.getElementById('donut-total-count');
  if (totalDisplay) totalDisplay.textContent = total.toLocaleString();

  const labels = Object.keys(categories).map(c => c.charAt(0).toUpperCase() + c.slice(1));
  const dataset = Object.values(categories);
  const colors = Object.keys(categories).map(c => COLOR_MAP[c] || '#fff');

  if (!donutChart) {
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataset,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 12,
          cutout: '70%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            cornerRadius: 6,
            padding: 10
          }
        },
        animation: { duration: 200 }
      }
    });
  } else {
    donutChart.data.labels = labels;
    donutChart.data.datasets[0].data = dataset;
    donutChart.data.datasets[0].backgroundColor = colors;
    donutChart.update('none');
  }

  // Update Legend grid
  const legendGrid = document.getElementById('entityLegendGrid');
  if (legendGrid) {
    legendGrid.replaceChildren();
    Object.entries(categories).forEach(([type, count]) => {
      if (count === 0) return;
      const color = COLOR_MAP[type] || '#fff';
      
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.style.color = color;
      
      const dot = document.createElement('span');
      dot.className = 'w-1.5 h-1.5 rounded-full';
      dot.style.background = color;
      if (type === 'person') {
        dot.style.boxShadow = `0 0 8px ${color}`;
      }
      
      const textSpan = document.createElement('span');
      textSpan.textContent = ` ${type} `;
      
      const countSpan = document.createElement('span');
      countSpan.className = 'font-tech opacity-40 ml-1';
      countSpan.textContent = count;

      item.appendChild(dot);
      item.appendChild(textSpan);
      item.appendChild(countSpan);
      legendGrid.appendChild(item);
    });
  }
}

// ── Narrative Absence Spans Chart (Bar Chart) ──
function renderAbsenceSpansChart(gaps) {
  const container = document.getElementById('absence-chart-container');
  if (!container) return;
  container.replaceChildren();

  // Find max gap size to normalize widths
  const maxGap = Math.max(...gaps.map(g => g.gap_chapters));

  gaps.forEach(g => {
    const row = document.createElement('div');
    row.className = 'absence-row';

    const label = document.createElement('div');
    label.className = 'absence-label';
    label.textContent = g.character;

    const barWrapper = document.createElement('div');
    barWrapper.className = 'absence-bar-wrapper';

    const barInner = document.createElement('div');
    barInner.className = 'absence-bar-inner';
    const widthPct = (g.gap_chapters / maxGap) * 100;
    barInner.style.width = '0%'; // Start at 0 for animation

    const value = document.createElement('span');
    value.className = 'absence-bar-value';
    value.textContent = `${g.gap_chapters} ch.`;
    
    // Set tooltip text
    barWrapper.title = `${g.character}: absent for ${g.gap_chapters} chapters (from ch. ${g.from_chapter} to ch. ${g.to_chapter})`;

    barInner.appendChild(value);
    barWrapper.appendChild(barInner);
    row.appendChild(label);
    row.appendChild(barWrapper);
    container.appendChild(row);

    // Trigger animation
    setTimeout(() => {
      barInner.style.width = `${widthPct}%`;
    }, 150);
  });
}

// ── Word Cloud Render (Color-coded by word category) ──
function renderWordCloud(words) {
  const container = document.getElementById('wordCloud');
  if (!container) return;
  container.replaceChildren();

  const maxVal = Math.max(...words.map(w => w.value));

  words.forEach(word => {
    const span = document.createElement('span');
    span.className = 'word-cloud-item';
    
    // Size proportionally
    const size = 11 + (word.value / maxVal) * 20;
    span.style.fontSize = `${size}px`;
    
    // Set color matching word category
    const categoryColor = COLOR_MAP[word.category] || '#fff';
    span.style.color = categoryColor;
    span.style.opacity = 0.5 + (word.value / maxVal) * 0.5;
    span.textContent = word.text;
    span.title = `Category: ${word.category} | Mentions: ${word.value}`;
    
    container.appendChild(span);
  });
}

// ── Pronouns Chart & Table ──
function renderPronounsChart(pronouns) {
  const ctx = document.getElementById('pronounsDonutChart')?.getContext('2d');
  if (!ctx) return;

  const labels = Object.keys(pronouns);
  const dataset = Object.values(pronouns);
  const total = dataset.reduce((a, b) => a + b, 0);

  const pronounColors = {
    'He/Him': 'var(--color-pronoun-he)',
    'She/Her': 'var(--color-pronoun-she)',
    'They/Them': 'var(--color-pronoun-they)',
    'It/Its': 'var(--color-pronoun-it)'
  };
  const colors = labels.map(l => pronounColors[l] || '#fff');

  const totalDisplay = document.getElementById('pronoun-total-count');
  if (totalDisplay) {
    totalDisplay.textContent = total.toLocaleString();
  }

  // Render Pronouns Donut
  pronounsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataset,
        backgroundColor: colors,
        borderWidth: 0,
        cutout: '70%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(10,10,10,0.95)',
          cornerRadius: 6
        }
      }
    }
  });

  // Render Pronouns table body
  const tbody = document.getElementById('pronouns-table-body');
  if (tbody) {
    tbody.replaceChildren();
    
    labels.forEach((label, idx) => {
      const val = dataset[idx];
      const pct = ((val / total) * 100).toFixed(1) + '%';
      
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
      
      const tdLabel = document.createElement('td');
      tdLabel.style.padding = '8px 0';
      tdLabel.style.display = 'flex';
      tdLabel.style.alignItems = 'center';
      tdLabel.style.gap = '8px';
      
      const dot = document.createElement('span');
      dot.className = 'dot-marker';
      dot.style.background = pronounColors[label] || '#fff';
      
      const textSpan = document.createElement('span');
      textSpan.style.fontWeight = 'bold';
      textSpan.textContent = label;
      
      tdLabel.appendChild(dot);
      tdLabel.appendChild(textSpan);
      
      const tdCount = document.createElement('td');
      tdCount.style.padding = '8px 0';
      tdCount.style.textAlign = 'right';
      tdCount.style.fontFamily = "'JetBrains Mono', monospace";
      tdCount.textContent = val.toLocaleString();
      
      const tdPct = document.createElement('td');
      tdPct.style.padding = '8px 0';
      tdPct.style.textAlign = 'right';
      tdPct.style.color = 'var(--color-accent)';
      tdPct.style.fontWeight = '600';
      tdPct.textContent = pct;
      
      tr.appendChild(tdLabel);
      tr.appendChild(tdCount);
      tr.appendChild(tdPct);
      tbody.appendChild(tr);
    });
  }
}

function initFunnelAnimationObserver() {
  const funnel = document.getElementById('funnel-display-container');
  if (!funnel) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        funnel.classList.add('animate-funnel');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  observer.observe(funnel);
}

document.addEventListener('DOMContentLoaded', async () => {
  await initEntityJourney();
});
