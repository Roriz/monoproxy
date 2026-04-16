/**
 * Entity Journey Visualization (Time-Series)
 * Fetches timeline data and provides chapter-by-chapter playback.
 */

const COLOR_MAP = {
    'person': '#8b5cf6',
    'location': '#f97316',
    'other': '#64748b',
    'organization': '#10b981',
    'object': '#f59e0b',
    'event': '#ef4444'
};

let journeyChart = null;
let journeyTimeline = [];
let journeyPlayer = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('entity_data.json');
        const data = await response.json();
        journeyTimeline = data.timeline;
        
        const totalChapters = journeyTimeline.length;
        const totalDisplay = document.getElementById('journeyTotalChapters');
        if (totalDisplay) totalDisplay.textContent = '/' + totalChapters;
        
        const slider = document.getElementById('journeySlider');
        if (slider) slider.max = totalChapters;

        journeyPlayer = new TimeSeriesPlayer({
            playBtnId: 'journeyPlayBtn',
            playIconId: 'journeyPlayIcon',
            pauseIconId: 'journeyPauseIcon',
            sliderId: 'journeySlider',
            chapterNumId: 'journeyChapterNum',
            speedBtnSelector: '.journey-speed-btn',
            maxChapter: totalChapters,
            onUpdate: (chapterIndex) => {
                updateStep(chapterIndex - 1);
            }
        });

        // Initialize at the LAST chapter
        journeyPlayer.goTo(totalChapters);
        initFunnelObserver();
    } catch (err) {
        console.error('Error loading entity journey data:', err);
    }
});

function updateStep(index) {
    const frame = journeyTimeline[index];
    if (!frame) return;

    // 1. Update Funnel
    updateElement('funnel-stage1-count', frame.stage1.toLocaleString());
    updateElement('funnel-stage1-label', 'raw entities detected');
    updateElement('funnel-stage2-count', frame.stage2.toLocaleString());
    updateElement('funnel-stage2-label', 'mentioned 5+ times');
    updateElement('funnel-stage3-count', frame.stage3.toLocaleString());
    updateElement('funnel-stage3-label', 'unique entities');

    // 2. Update Stats
    updateElement('stats-words', frame.cumulative_words.toLocaleString());
    updateElement('stats-chapters', frame.story_chapter_index);

    // 3. Update Donut
    updateDonut(frame.breakdown);

    // 4. Update Legend
    updateLegend(frame.breakdown);
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateDonut(breakdown) {
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    updateElement('donut-total-count', total);

    const labels = Object.keys(breakdown).map(capitalize);
    const dataset = Object.values(breakdown);
    const colors = Object.keys(breakdown).map(type => COLOR_MAP[type] || '#fff');

    const ctx = document.getElementById('entityDonutChart')?.getContext('2d');
    if (!ctx) return;

    if (!journeyChart) {
        journeyChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataset,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 15,
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                animation: {
                    duration: 400, // Faster during playback
                    easing: 'easeOutQuart'
                }
            }
        });
    } else {
        journeyChart.data.labels = labels;
        journeyChart.data.datasets[0].data = dataset;
        journeyChart.data.datasets[0].backgroundColor = colors;
        journeyChart.update('none'); // Update without full re-animation for speed
    }
}

function updateLegend(breakdown) {
    const legendGrid = document.getElementById('entityLegendGrid');
    if (!legendGrid) return;

    legendGrid.innerHTML = '';
    Object.entries(breakdown).forEach(([type, count]) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <span class="legend-dot" style="background: ${COLOR_MAP[type] || '#fff'};"></span>
            <span>${capitalize(type)} — ${count}</span>
        `;
        legendGrid.appendChild(item);
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function initFunnelObserver() {
    const funnel = document.querySelector('.funnel-container');
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
