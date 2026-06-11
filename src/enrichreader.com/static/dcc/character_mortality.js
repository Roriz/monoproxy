// ═══════════════════════════════════════════════════════════════
// Character Mortality & Survival Curve — Dungeon Crawler Carl
// ═══════════════════════════════════════════════════════════════

let survivalChart = null;

async function initCharacterMortality() {
  try {
    const rawData = await window.dccDataPromise;
    const timeline = rawData.survival_timeline;
    const mortalityEvents = rawData.mortality_events;
    const chapterMap = new Map(rawData.chapters.map(c => [c.series_index, c]));
    
    // Draw the static Line Chart showing the overall survival curve (All Volumes)
    const ctx = document.getElementById('survivalChart')?.getContext('2d');
    if (!ctx) return;

    const labels = timeline.map(t => t.label);
    const aliveData = timeline.map(t => t.alive_count);
    const deadData = timeline.map(t => t.dead_count);

    survivalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Alive Count',
            data: aliveData,
            borderColor: 'oklch(78% 0.16 85)', // Gold / Person color
            backgroundColor: 'oklch(78% 0.16 85 / 0.03)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.1
          },
          {
            label: 'Dead Count',
            data: deadData,
            borderColor: 'oklch(58% 0.18 28)', // Crimson / Event color
            backgroundColor: 'oklch(58% 0.18 28 / 0.03)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            titleColor: 'oklch(78% 0.16 85)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: (context) => context[0].label,
              label: (context) => ` ${context.dataset.label}: ${context.raw}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: 'rgba(255, 255, 255, 0.3)',
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              maxTicksLimit: 15
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: 'rgba(255, 255, 255, 0.3)',
              font: { family: "'JetBrains Mono', monospace", size: 9 }
            }
          }
        }
      }
    });

    // Function to update the Mortality Feed based on active seriesIndex
    window.updateMortalityFeed = function(seriesIndex) {
      const feedContainer = document.getElementById('mortality-feed-list');
      const feedIndicator = document.getElementById('feed-chapter-indicator');
      if (!feedContainer) return;

      const activeTimelineItem = timeline.find(t => t.series_index === seriesIndex);
      const friendlyLabel = activeTimelineItem ? activeTimelineItem.label : `Ch. ${seriesIndex}`;

      // Update chapter label
      if (feedIndicator) {
        feedIndicator.textContent = `up to ${friendlyLabel}`;
      }

      // Filter deaths that occurred up to the active seriesIndex
      const relevantDeaths = mortalityEvents.filter(event => {
        return event.series_index <= seriesIndex;
      });

      // Clear list safely
      feedContainer.replaceChildren();

      if (relevantDeaths.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'text-xs text-neutral-500 italic text-center py-12';
        emptyMsg.textContent = 'No mortality events recorded up to this chapter.';
        feedContainer.appendChild(emptyMsg);
        return;
      }

      // Render feed items using secure DOM APIs
      relevantDeaths.forEach(death => {
        const item = document.createElement('div');
        item.className = 'mortality-feed-item';

        const nameEl = document.createElement('span');
        nameEl.className = 'feed-name';
        nameEl.textContent = death.character.charAt(0).toUpperCase() + death.character.slice(1);

        const chEl = document.createElement('span');
        chEl.className = 'feed-chapter';
        const deathChInfo = chapterMap.get(death.series_index);
        chEl.textContent = deathChInfo ? deathChInfo.label : `Ch. ${death.series_index}`;

        const statusEl = document.createElement('span');
        statusEl.className = 'feed-status';
        statusEl.textContent = death.status_at_death || 'deceased';

        item.appendChild(nameEl);
        item.appendChild(chEl);
        item.appendChild(statusEl);
        feedContainer.appendChild(item);
      });
    };

    // Initialize the feed at the max series index
    const lastSeriesIndex = timeline[timeline.length - 1].series_index;
    window.updateMortalityFeed(lastSeriesIndex);

    // Update most lethal chapter KPI stats card
    const lethalLabel = document.getElementById('most-lethal-chapter-label');
    if (lethalLabel && rawData.metadata) {
      lethalLabel.textContent = `Ch. ${rawData.metadata.most_lethal_chapter} (${rawData.metadata.max_deaths_single_chapter} deaths)`;
    }

  } catch (err) {
    console.error('Error initializing character mortality visualizer:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initCharacterMortality();
});
