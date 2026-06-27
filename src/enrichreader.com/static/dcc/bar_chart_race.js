// ═══════════════════════════════════════════════════════════════
// Bar Chart Race — Dungeon Crawler Carl species visualizations
// ═══════════════════════════════════════════════════════════════

class TimeSeriesPlayer {
  constructor(opts) {
    this.minChapter = opts.minChapter || 2;
    this.maxChapter = opts.maxChapter;
    this.currentChapter = this.minChapter;
    this.isPlaying = false;
    this.interval = null;
    this.speed = 1;
    this.onUpdate = opts.onUpdate;
    this.startAt = opts.startAt || this.minChapter;

    this.playBtn = document.getElementById(opts.playBtnId);
    this.playIcon = document.getElementById(opts.playIconId);
    this.pauseIcon = document.getElementById(opts.pauseIconId);
    this.slider = document.getElementById(opts.sliderId);
    this.chapterNum = document.getElementById(opts.chapterNumId);
    this.speedBtns = document.querySelectorAll(opts.speedBtnSelector);

    this._bindEvents();
  }

  _bindEvents() {
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        this.isPlaying ? this.stop() : this.play();
      });
    }

    if (this.slider) {
      this.slider.addEventListener('input', () => {
        if (this.isPlaying) this.stop();
        this.goTo(parseInt(this.slider.value, 10));
      });
    }

    this.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speed = parseInt(btn.dataset.speed, 10);
        if (this.isPlaying) {
          this._restartInterval();
        }
      });
    });
  }

  goTo(chapter) {
    if (chapter < this.minChapter) chapter = this.minChapter;
    if (chapter > this.maxChapter) chapter = this.maxChapter;
    this.currentChapter = chapter;
    if (this.slider) this.slider.value = chapter;
    if (this.chapterNum) this.chapterNum.textContent = chapter;
    this.onUpdate(chapter);
  }

  play() {
    if (this.currentChapter >= this.maxChapter) {
      this.currentChapter = this.startAt;
    }
    this.isPlaying = true;
    if (this.playIcon) this.playIcon.style.display = 'none';
    if (this.pauseIcon) this.pauseIcon.style.display = 'block';
    if (this.playBtn) this.playBtn.classList.add('active');
    this._restartInterval();
  }

  stop() {
    this.isPlaying = false;
    clearInterval(this.interval);
    this.interval = null;
    if (this.playIcon) this.playIcon.style.display = 'block';
    if (this.pauseIcon) this.pauseIcon.style.display = 'none';
    if (this.playBtn) this.playBtn.classList.remove('active');
  }

  _restartInterval() {
    clearInterval(this.interval);
    this.interval = setInterval(() => {
      if (this.currentChapter >= this.maxChapter) {
        this.stop();
        return;
      }
      this.currentChapter += 2; // Step by 2 in series scale for smoother play speed
      if (this.currentChapter > this.maxChapter) {
        this.currentChapter = this.maxChapter;
      }
      this.goTo(this.currentChapter);
    }, 250 / this.speed); // Slightly faster interval for 515 chapters
  }
}

// Global player registry to share with other scripts
window.TimeSeriesPlayer = TimeSeriesPlayer;

// Fetch promise for cached data access
const dataContainer = document.querySelector('[data-series-data]');
const dataUrl = dataContainer ? dataContainer.getAttribute('data-series-data') : 'dcc_data.json';

window.dccDataPromise = window.dccDataPromise || fetch(dataUrl).then(res => {
  if (!res.ok) throw new Error('Failed to load ' + dataUrl);
  return res.json();
});

// Bar Chart Race configuration
const TOP_N = 12;
const BAR_HEIGHT = 42; 
const colorMap = {
  person: 'var(--color-person)',
  location: 'var(--color-location)',
  organization: 'var(--color-org)',
  item: 'var(--color-item)',
  event: 'var(--color-event)',
  other: 'var(--color-other)',
};

async function initBarChartRace() {
  try {
    const rawData = await window.dccDataPromise;
    const raceSnapshots = rawData.race_data;
    
    const totalChapters = raceSnapshots.length;
    const minCh = raceSnapshots[0].series_index;
    const maxCh = raceSnapshots[totalChapters - 1].series_index;

    const container = document.getElementById('raceChart');
    if (!container) return;
    container.style.height = (TOP_N * BAR_HEIGHT) + 'px';

    // Update dynamic total label
    const totalDisplay = document.getElementById('raceTotalChapters');
    if (totalDisplay) totalDisplay.textContent = '/' + maxCh;

    const slider = document.getElementById('raceSlider');
    if (slider) {
      slider.min = minCh;
      slider.max = maxCh;
    }

    const barElements = new Map();
    const disposalTimeouts = new Map();

    // References to category filters
    const filterPerson = document.getElementById('filter-person');
    const filterLocation = document.getElementById('filter-location');
    const filterOrg = document.getElementById('filter-org');
    const filterItem = document.getElementById('filter-item');
    const filterEvent = document.getElementById('filter-event');

    function updateChart(seriesIndex) {
      // Find snapshot for active series_index
      let snapshot = raceSnapshots.find(s => s.series_index === seriesIndex);
      if (!snapshot) {
        // Fallback to nearest series_index if needed
        snapshot = raceSnapshots.reduce((prev, curr) => {
          return (Math.abs(curr.series_index - seriesIndex) < Math.abs(prev.series_index - seriesIndex) ? curr : prev);
        });
      }

      if (!snapshot) return;

      const labelEl = document.getElementById('raceChapterNum');
      if (labelEl) {
        labelEl.textContent = snapshot.label;
      }

      // Filter active snapshot data based on toggles
      let filteredData = snapshot.data;
      if (filterPerson || filterLocation || filterOrg || filterItem || filterEvent) {
        filteredData = filteredData.filter(d => {
          if (d.classification === 'person' && filterPerson && !filterPerson.checked) return false;
          if (d.classification === 'location' && filterLocation && !filterLocation.checked) return false;
          if (d.classification === 'organization' && filterOrg && !filterOrg.checked) return false;
          if (d.classification === 'item' && filterItem && !filterItem.checked) return false;
          if (d.classification === 'event' && filterEvent && !filterEvent.checked) return false;
          return true;
        });
      }

      // Sort and slice top N
      const sortedData = filteredData
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, TOP_N);

      if (sortedData.length === 0) return;

      const maxValue = sortedData[0].mentions || 1;
      const currentIds = new Set(sortedData.map(d => d.entity));

      // Update or create bars
      sortedData.forEach((data, index) => {
        let el = barElements.get(data.entity);
        
        if (disposalTimeouts.has(data.entity)) {
          clearTimeout(disposalTimeouts.get(data.entity));
          disposalTimeouts.delete(data.entity);
          el.style.opacity = '1';
        }

        if (!el) {
          el = createBarElement(data);
          container.appendChild(el);
          barElements.set(data.entity, el);
          
          el.style.transform = `translateY(${(index + 1) * BAR_HEIGHT}px) translateX(0)`;
          el.style.opacity = '0';
          requestAnimationFrame(() => el.style.opacity = '1');
        }

        const widthPercent = (data.mentions / maxValue) * 100;
        el.style.transform = `translateY(${index * BAR_HEIGHT}px) translateX(0)`;
        
        const innerBar = el.querySelector('.race-bar-inner');
        innerBar.style.width = `${widthPercent}%`;
        innerBar.style.backgroundColor = colorMap[data.classification] || colorMap.other;
        
        el.querySelector('.race-bar-value').textContent = data.mentions.toLocaleString();
      });

      // Handle removals
      for (const [id, el] of barElements.entries()) {
        if (!currentIds.has(id) && !disposalTimeouts.has(id)) {
          el.style.opacity = '0';
          
          const transformMatch = el.style.transform.match(/translateY\(([^p]+)px\)/);
          const currentY = transformMatch ? parseInt(transformMatch[1], 10) : 0;
          el.style.transform = `translateY(${currentY}px) translateX(-20px)`;
          
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
      
      const label = document.createElement('div');
      label.className = 'race-bar-label';
      label.title = data.entity;
      label.textContent = data.entity;
      
      const outer = document.createElement('div');
      outer.className = 'race-bar-outer';
      
      const inner = document.createElement('div');
      inner.className = 'race-bar-inner';
      inner.style.width = '0%';
      inner.style.backgroundColor = colorMap[data.classification] || colorMap.other;
      
      const value = document.createElement('div');
      value.className = 'race-bar-value';
      value.textContent = '0';
      
      inner.appendChild(value);
      outer.appendChild(inner);
      wrapper.appendChild(label);
      wrapper.appendChild(outer);
      
      return wrapper;
    }

    const player = new TimeSeriesPlayer({
      playBtnId: 'racePlayBtn',
      playIconId: 'playIcon',
      pauseIconId: 'pauseIcon',
      sliderId: 'raceSlider',
      chapterNumId: null, // Set to null to prevent integer updates override
      speedBtnSelector: '#entity-race .speed-btn',
      minChapter: minCh,
      maxChapter: maxCh,
      onUpdate(seriesIndex) {
        updateChart(seriesIndex);
      },
    });

    window.playerRegistry = window.playerRegistry || [];
    window.playerRegistry.push(player);

    // Initial render at max chapter to show final values on load
    player.goTo(maxCh);

    // Re-render when checkboxes change
    [filterPerson, filterLocation, filterOrg, filterItem, filterEvent].forEach(chk => {
      if (chk) {
        chk.addEventListener('change', () => {
          updateChart(player.currentChapter);
        });
      }
    });

  } catch (err) {
    console.error('Error starting bar chart race:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initBarChartRace();
});
