// ═══════════════════════════════════════════════════════════════
// Entity Journey, Funnel, Absence Spans & Word Cloud — LOTM
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

function resolveCSSVar(colorVal) {
  if (typeof colorVal === 'string' && colorVal.startsWith('var(')) {
    const varName = colorVal.slice(4, -1).trim();
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return computed || colorVal;
  }
  return colorVal;
}

// Global classifications map and category totals
window.entityClassifications = new Map();
window.categoryTotals = {
  person: 0,
  location: 0,
  organization: 0,
  item: 0,
  event: 0,
  other: 0
};
window.totalMentionsAtEnd = 0;

async function initEntityJourney() {
  try {
    const rawData = await window.dccDataPromise;
    if (!rawData) {
      console.warn('No data returned from dccDataPromise');
      return;
    }
    const chapters = rawData.chapters || [];
    const totalChapters = chapters.length || 797;
    const minCh = (chapters && chapters[0]) ? (chapters[0].series_index || 1) : 1;
    const maxCh = (chapters && chapters.length > 0) ? (chapters[chapters.length - 1].series_index || totalChapters) : totalChapters;

    // 0. Build dynamic maps & counts safely
    if (rawData.race_data && rawData.race_data.length > 0) {
      rawData.race_data.forEach(snapshot => {
        if (snapshot && snapshot.data) {
          snapshot.data.forEach(item => {
            if (item && item.entity && item.classification) {
              window.entityClassifications.set(item.entity.toString().toLowerCase(), item.classification);
            }
          });
        }
      });

      // Sum final mentions from the last snapshot
      const lastSnapshot = rawData.race_data[rawData.race_data.length - 1];
      if (lastSnapshot && lastSnapshot.data) {
        lastSnapshot.data.forEach(item => {
          if (item && item.mentions) {
            window.totalMentionsAtEnd += item.mentions;
          }
        });
      }
    }
    
    // Add words from word_cloud for fallback classification lookup
    if (rawData.word_cloud) {
      rawData.word_cloud.forEach(item => {
        if (item && item.text && item.category) {
          window.entityClassifications.set(item.text.toString().toLowerCase(), item.category);
        }
      });
    }

    // Compute unique counts per category
    window.entityClassifications.forEach((classification) => {
      if (window.categoryTotals[classification] !== undefined) {
        window.categoryTotals[classification]++;
      } else {
        window.categoryTotals.other++;
      }
    });

    // Fallbacks if metadata doesn't exist
    const metadata = rawData.metadata || {
      total_chapters: totalChapters,
      total_words: 1874256,
      total_characters: 351
    };

    // 0.1 Update Hero Stats dynamically
    const valChapters = document.getElementById('val-chapters');
    const valWords = document.getElementById('val-words');
    const valEntities = document.getElementById('val-entities');
    if (valChapters) valChapters.textContent = (metadata.total_chapters || totalChapters).toLocaleString();
    if (valWords) valWords.textContent = (metadata.total_words || 1874256).toLocaleString();
    if (valEntities) valEntities.textContent = (metadata.total_characters || 351).toLocaleString();

    const slider = document.getElementById('journeySlider');
    if (slider) {
      slider.min = minCh;
      slider.max = maxCh;
    }

    // Set static metrics
    const statsWords = document.getElementById('stats-words');
    const statsChapters = document.getElementById('stats-chapters');
    if (statsWords) statsWords.textContent = (metadata.total_words || 1874256).toLocaleString();
    if (statsChapters) statsChapters.textContent = (metadata.total_chapters || totalChapters).toLocaleString();

    // 1. Initial render at max index to show final state
    updateScrubberState(maxCh, rawData);

    // 2. Render static word cloud once
    if (rawData.word_cloud) {
      renderWordCloud(rawData.word_cloud);
    }

    // 3. Render pronouns chart once
    if (rawData.breakdowns && rawData.breakdowns.pronouns) {
      renderPronounsChart(rawData.breakdowns.pronouns);
    }

    // 4. Keyboard Navigation Registry
    const player = new TimeSeriesPlayer({
      playBtnId: 'journeyPlayBtn',
      playIconId: 'journeyPlayIcon',
      pauseIconId: 'journeyPauseIcon',
      sliderId: 'journeySlider',
      chapterNumId: null,
      speedBtnSelector: null,
      defaultSpeed: 4,
      minChapter: minCh,
      maxChapter: maxCh,
      onUpdate(seriesIndex) {
        updateScrubberState(seriesIndex, rawData);
      }
    });

    window.playerRegistry = window.playerRegistry || [];
    window.playerRegistry.push(player);

    // 5. Build Gaps Chart once
    if (rawData.absence_gaps) {
      renderAbsenceSpansChart(rawData.absence_gaps, maxCh);
    }

    // 6. Initialize Funnel Scroll Animation
    initFunnelAnimationObserver();

  } catch (err) {
    console.error('Error starting narrative visualizers:', err);
  }
}

// ── Update Scrubber updates both Funnel & Donut Chart ──
function updateScrubberState(seriesIndex, rawData) {
  const chapters = rawData.chapters || [];
  const totalChapters = chapters.length || 797;
  const currentCh = chapters.find(c => c.series_index === seriesIndex) || chapters[0] || { label: `Vol. 1, Ch. ${seriesIndex}` };

  const labelEl = document.getElementById('journeyChapterNum');
  if (labelEl) {
    labelEl.textContent = currentCh.label;
  }

  // Calculate ratio
  const progressRatio = Math.max(0.01, Math.min(1.0, seriesIndex / totalChapters));

  // 1. Update Funnel Counts
  const rawMentions = Math.round((window.totalMentionsAtEnd || 10000) * progressRatio);
  const totalChars = (rawData.metadata && rawData.metadata.total_characters) || 351;
  const uniqueChars = Math.round(totalChars * progressRatio);

  const funnel1 = document.getElementById('funnel-stage1-count');
  const funnel3 = document.getElementById('funnel-stage3-count');
  if (funnel1) funnel1.textContent = Math.max(10, rawMentions).toLocaleString();
  if (funnel3) funnel3.textContent = Math.max(1, uniqueChars).toLocaleString();

  // 2. Update Donut Chart
  if (rawData.breakdowns) {
    updateBreakdownDonut(progressRatio, rawData);
  }

  // 3. Update Mortality Feed in section 3 synchronously
  if (window.updateMortalityFeed) {
    window.updateMortalityFeed(seriesIndex);
  }
}

function updateBreakdownDonut(progressRatio, rawData) {
  const ctx = document.getElementById('entityDonutChart')?.getContext('2d');
  if (!ctx) return;

  const totalChars = (rawData && rawData.metadata && rawData.metadata.total_characters) || 351;

  // Approximate category distribution for active chapter (simulate data growth)
  const categories = {
    person: Math.max(1, Math.round(totalChars * progressRatio)),
    location: Math.max(1, Math.round(120 * progressRatio)),
    organization: Math.max(1, Math.round(82 * progressRatio)),
    item: Math.max(1, Math.round(23 * progressRatio)),
    event: Math.max(1, Math.round(30 * progressRatio)),
    other: Math.max(1, Math.round(54 * progressRatio))
  };

  const labels = Object.keys(categories);
  const dataset = Object.values(categories);
  const total = dataset.reduce((a, b) => a + b, 0);

  // Update center count text
  const totalDisplay = document.getElementById('donut-total-count');
  if (totalDisplay) totalDisplay.textContent = total.toLocaleString();

  const chartColors = [
    resolveCSSVar(COLOR_MAP.person),
    resolveCSSVar(COLOR_MAP.location),
    resolveCSSVar(COLOR_MAP.organization),
    resolveCSSVar(COLOR_MAP.item),
    resolveCSSVar(COLOR_MAP.event),
    resolveCSSVar(COLOR_MAP.other)
  ];

  if (!donutChart) {
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataset,
          backgroundColor: chartColors,
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
            cornerRadius: 6,
            callbacks: {
              label: (context) => ` ${context.label}: ${context.raw} unique`
            }
          }
        }
      }
    });
  } else {
    donutChart.data.datasets[0].data = dataset;
    donutChart.update('none'); // silent updates
  }

  // Update HTML legend counts
  const legendGrid = document.getElementById('entityLegendGrid');
  if (legendGrid) {
    legendGrid.replaceChildren();
    
    labels.forEach((label, idx) => {
      const val = dataset[idx];
      const percent = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
      
      const item = document.createElement('span');
      item.className = 'legend-item';
      item.style.color = COLOR_MAP[label];
      
      const dot = document.createElement('span');
      dot.className = 'w-1.5 h-1.5 rounded-full';
      dot.style.background = COLOR_MAP[label];
      
      const textSpan = document.createElement('span');
      textSpan.textContent = ` ${label === 'org' ? 'organization' : label}: ${val} (${percent}%)`;
      
      item.appendChild(dot);
      item.appendChild(textSpan);
      legendGrid.appendChild(item);
    });
  }
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
  const colors = labels.map(l => resolveCSSVar(pronounColors[l] || '#fff'));

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
      
      const tdVal = document.createElement('td');
      tdVal.style.textAlign = 'right';
      tdVal.textContent = val.toLocaleString();
      
      const tdPct = document.createElement('td');
      tdPct.style.textAlign = 'right';
      tdPct.style.color = 'var(--color-text-dim)';
      tdPct.textContent = pct;
      
      tr.appendChild(tdLabel);
      tr.appendChild(tdVal);
      tr.appendChild(tdPct);
      tbody.appendChild(tr);
    });
  }
}

// ── Narrative Absence Spans Chart (Dots and Dashed Line Timeline) ──
function renderAbsenceSpansChart(gaps, totalChapters) {
  const container = document.getElementById('absence-chart-container');
  const gridBg = document.getElementById('absence-grid-bg');
  const rulerContainer = document.getElementById('absence-ruler-container');
  if (!container || !gaps) return;

  container.replaceChildren();
  if (gridBg) gridBg.replaceChildren();
  if (rulerContainer) rulerContainer.replaceChildren();

  // 1. Draw ticks and grid lines dynamically
  const maxChVal = Number(totalChapters) || 797;
  const tickStep = maxChVal > 800 ? 100 : (maxChVal > 300 ? 50 : 20);
  
  let rulerTrack = null;
  if (rulerContainer) {
    rulerTrack = document.createElement('div');
    rulerTrack.className = 'absence-ruler-track';
    rulerContainer.appendChild(rulerTrack);
  }

  for (let ch = 0; ch <= maxChVal; ch += tickStep) {
    const pct = (ch / maxChVal) * 100;

    // Grid line
    if (gridBg) {
      const line = document.createElement('div');
      line.className = 'absence-grid-line';
      line.style.left = `${pct}%`;
      gridBg.appendChild(line);
    }

    // Tick label
    if (rulerTrack) {
      const tick = document.createElement('div');
      tick.className = 'absence-tick';
      tick.style.left = `${pct}%`;
      tick.textContent = `ch. ${ch}`;
      rulerTrack.appendChild(tick);
    }
  }

  // Handle case where maximum chapter is not a multiple of tickStep
  if (maxChVal % tickStep !== 0) {
    const pct = 100;
    if (gridBg) {
      const line = document.createElement('div');
      line.className = 'absence-grid-line';
      line.style.left = `${pct}%`;
      gridBg.appendChild(line);
    }
    if (rulerTrack) {
      const tick = document.createElement('div');
      tick.className = 'absence-tick';
      tick.style.left = `${pct}%`;
      tick.textContent = `ch. ${maxChVal}`;
      rulerTrack.appendChild(tick);
    }
  }

  // 2. Render each gap segment
  gaps.forEach(g => {
    const entityName = String(g.character || g.entity || g.name || 'Unknown');
    const fromCh = Number(g.from_chapter !== undefined ? g.from_chapter : (g.start_chapter !== undefined ? g.start_chapter : (g.lastSeen || 0)));
    const toCh = Number(g.to_chapter !== undefined ? g.to_chapter : (g.end_chapter !== undefined ? g.end_chapter : (g.reappears || maxChVal)));
    const gapSize = Number(g.gap_chapters !== undefined ? g.gap_chapters : (g.gap !== undefined ? g.gap : (toCh - fromCh)));

    const nameLower = entityName.toLowerCase();
    const classification = window.entityClassifications.get(nameLower) || 'person';
    const colorVar = COLOR_MAP[classification] || COLOR_MAP.other;

    const row = document.createElement('div');
    row.className = 'absence-row';

    const label = document.createElement('div');
    label.className = 'absence-label';
    label.textContent = entityName;

    const track = document.createElement('div');
    track.className = 'absence-timeline-track';

    const segment = document.createElement('div');
    segment.className = 'absence-segment';
    
    // Position based on fromCh and toCh relative to totalChapters
    const leftPct = (fromCh / maxChVal) * 100;
    const widthPct = (Math.max(0, toCh - fromCh) / maxChVal) * 100;

    segment.style.color = colorVar;
    segment.style.left = `${leftPct}%`;
    segment.style.width = `${widthPct}%`;

    row.title = `${entityName} (${classification}): absent for ${gapSize} chapters (from ch. ${fromCh} to ch. ${toCh})`;

    const dotStart = document.createElement('span');
    dotStart.className = 'absence-dot dot-start';

    const line = document.createElement('span');
    line.className = 'absence-line';

    const dotEnd = document.createElement('span');
    dotEnd.className = 'absence-dot dot-end';

    const value = document.createElement('span');
    value.className = 'absence-value';
    value.textContent = `${gapSize} ch.`;

    segment.appendChild(dotStart);
    segment.appendChild(line);
    segment.appendChild(dotEnd);
    segment.appendChild(value);

    track.appendChild(segment);
    row.appendChild(label);
    row.appendChild(track);
    container.appendChild(row);
  });
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

// Expose renderAbsenceSpansChart for unit testing context
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    renderAbsenceSpansChart
  };
}
