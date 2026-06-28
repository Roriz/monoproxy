// ═══════════════════════════════════════════════════════════════
// Character Mortality & Survival Curve — Dungeon Crawler Carl
// ═══════════════════════════════════════════════════════════════

let survivalChart = null;

async function initCharacterMortality() {
  try {
    const rawData = await window.dccDataPromise;
    const timeline = rawData.survival_timeline;
    
    // Draw the static Line Chart showing the overall survival curve (All Volumes)
    const ctx = document.getElementById('survivalChart')?.getContext('2d');
    if (!ctx) return;

    const labels = timeline.map(t => t.label);
    const aliveData = timeline.map(t => t.alive_count);
    const deadData = timeline.map(t => t.dead_count);
    const mortalityRateData = timeline.map(t => {
      const total = t.alive_count + t.dead_count;
      return total > 0 ? Number(((t.dead_count / total) * 100).toFixed(1)) : 0;
    });

    survivalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Alive Count',
            data: aliveData,
            yAxisID: 'y',
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
            yAxisID: 'y',
            borderColor: 'oklch(58% 0.18 28)', // Crimson / Event color
            backgroundColor: 'oklch(58% 0.18 28 / 0.03)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.1
          },
          {
            label: 'Mortality Rate',
            data: mortalityRateData,
            yAxisID: 'yRate',
            borderColor: 'oklch(62% 0.14 290)', // Lavender / Other color
            borderWidth: 2,
            borderDash: [5, 5], // Dashed line
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false,
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
              label: (context) => {
                const label = context.dataset.label;
                const val = context.raw;
                if (label === 'Mortality Rate') {
                  return ` ${label}: ${val}%`;
                }
                return ` ${label}: ${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: 'rgba(255, 255, 255, 0.3)',
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              maxTicksLimit: window.innerWidth < 768 ? 6 : 15
            }
          },
          y: {
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: 'rgba(255, 255, 255, 0.3)',
              font: { family: "'JetBrains Mono', monospace", size: 9 }
            }
          },
          yRate: {
            position: 'right',
            min: 0,
            max: 100,
            grid: { display: false },
            ticks: {
              color: 'rgba(255, 255, 255, 0.3)',
              font: { family: "'JetBrains Mono', monospace", size: 9 },
              callback: (value) => `${value}%`
            }
          }
        }
      }
    });


  } catch (err) {
    console.error('Error initializing character mortality visualizer:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initCharacterMortality();
});
