// ═══════════════════════════════════════════════════════════════
// Pathway Selection Matrix — Lord of the Mysteries
// ═══════════════════════════════════════════════════════════════

let matrixData = null;
let matrixSearchQuery = '';
let matrixSortBy = 'total';
let matrixShowAll = false;
const MATRIX_TOP_N = 30;

let matrixTooltipEl = null;

// Expose processRaceMatrixData for unit testing
function processRaceMatrixData(data, searchQuery, sortBy, limit = null) {
  if (!data) return [];

  const allRaces = new Set();
  if (data.series && data.series.counts) {
    Object.keys(data.series.counts).forEach(r => allRaces.add(r));
  }
  if (Array.isArray(data.volumes)) {
    data.volumes.forEach(vol => {
      if (vol.counts) {
        Object.keys(vol.counts).forEach(r => allRaces.add(r));
      }
    });
  }

  let races = Array.from(allRaces);

  // Filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    races = races.filter(r => r.toLowerCase().includes(q));
  }

  // Sort
  if (sortBy === 'total') {
    races.sort((a, b) => {
      const aCount = (data.series && data.series.counts && data.series.counts[a]) || 0;
      const bCount = (data.series && data.series.counts && data.series.counts[b]) || 0;
      if (bCount !== aCount) {
        return bCount - aCount;
      }
      return a.localeCompare(b);
    });
  } else if (sortBy === 'alpha') {
    races.sort((a, b) => a.localeCompare(b));
  }

  // Limit
  if (limit && limit > 0 && races.length > limit) {
    races = races.slice(0, limit);
  }

  return races;
}

// Generate the matrix table rows based on filtered & sorted races
function renderMatrixRows(races, data) {
  const tbody = document.getElementById('matrixTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (races.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '10');
    td.className = 'text-center py-8 text-neutral-500 font-mono';
    td.textContent = 'No matching pathway selections found';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  races.forEach(race => {
    const tr = document.createElement('tr');
    tr.className = 'matrix-tr';

    const displayRaceName = race.charAt(0).toUpperCase() + race.slice(1);

    // 1. Pathway Name Column
    const tdRace = document.createElement('td');
    tdRace.className = 'matrix-td-race-name';
    tdRace.textContent = displayRaceName;
    tr.appendChild(tdRace);

    // 2. Volume Columns (1 to 8)
    for (let i = 0; i < 8; i++) {
      const volObj = data.volumes[i] || {};
      const volNum = i + 1;
      const count = (volObj.counts && volObj.counts[race]) || 0;
      const examples = (volObj.examples && volObj.examples[race]) || [];

      const tdVal = document.createElement('td');
      tdVal.className = 'matrix-td-value';

      const pill = document.createElement('div');
      pill.className = 'matrix-cell-value';
      
      if (count > 0) {
        pill.classList.add('has-count');
        pill.textContent = count;
        
        // Heatmap background styling
        let opacity = 0.15;
        if (count === 2) opacity = 0.35;
        if (count >= 3 && count <= 5) opacity = 0.6;
        if (count >= 6) opacity = 0.85;
        
        pill.style.backgroundColor = `oklch(78% 0.16 85 / ${opacity})`;
        if (count >= 6) {
          pill.style.color = 'var(--color-surface-base)';
          pill.style.fontWeight = '700';
        } else {
          pill.style.color = 'var(--color-text-primary)';
          pill.style.fontWeight = count > 1 ? '600' : '400';
        }

        // Add tooltip data attributes
        pill.setAttribute('data-tooltip-title', displayRaceName);
        pill.setAttribute('data-tooltip-subtitle', `Volume ${volNum}`);
        pill.setAttribute('data-tooltip-names', JSON.stringify(examples));
      } else {
        pill.textContent = '—';
        pill.style.opacity = '0.15';
      }

      tdVal.appendChild(pill);
      tr.appendChild(tdVal);
    }

    // 3. Series Total Column
    const totalCount = (data.series && data.series.counts && data.series.counts[race]) || 0;
    const seriesExamples = (data.series && data.series.examples && data.series.examples[race]) || [];
    
    const tdTotal = document.createElement('td');
    tdTotal.className = 'matrix-td-value';

    const totalPill = document.createElement('div');
    totalPill.className = 'matrix-cell-value series-total-pill';
    
    if (totalCount > 0) {
      totalPill.classList.add('has-count');
      totalPill.textContent = totalCount;
      
      // Muted background for total
      totalPill.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
      totalPill.style.border = '1px solid rgba(255, 255, 255, 0.12)';
      totalPill.style.color = 'var(--color-person)';
      totalPill.style.fontWeight = '600';

      totalPill.setAttribute('data-tooltip-title', displayRaceName);
      totalPill.setAttribute('data-tooltip-subtitle', 'Series Total');
      totalPill.setAttribute('data-tooltip-names', JSON.stringify(seriesExamples));
    } else {
      totalPill.textContent = '—';
      totalPill.style.opacity = '0.15';
    }

    tdTotal.appendChild(totalPill);
    tr.appendChild(tdTotal);

    tbody.appendChild(tr);
  });

  setupTooltipEvents();
}

// Fetch and load the pathway selection counts data
async function initRaceSelectionMatrix() {
  try {
    const res = await fetch('/lotm/person_pathway_counts.json');
    if (!res.ok) throw new Error('Failed to load pathway selection data');
    matrixData = await res.json();
    
    setupMatrixControls();
    renderMatrix();
  } catch (err) {
    console.error('Error initializing pathway selection matrix:', err);
  }
}

// Filter, Sort, Limit and Render the table rows
function renderMatrix() {
  if (!matrixData) return;

  const totalRaces = processRaceMatrixData(matrixData, matrixSearchQuery, matrixSortBy, null);
  const activeLimit = matrixShowAll ? null : MATRIX_TOP_N;
  const racesToRender = processRaceMatrixData(matrixData, matrixSearchQuery, matrixSortBy, activeLimit);

  renderMatrixRows(racesToRender, matrixData);

  // Manage visibility of "Show All" button and state
  const toggleBtn = document.getElementById('matrixToggleBtn');
  const toggleContainer = document.getElementById('matrixToggleContainer');

  if (toggleBtn && toggleContainer) {
    if (totalRaces.length <= MATRIX_TOP_N) {
      toggleContainer.style.display = 'none';
    } else {
      toggleContainer.style.display = 'flex';
      toggleBtn.textContent = matrixShowAll 
        ? 'Show Less' 
        : `Show all ${totalRaces.length} pathways (yes, even Spectator)`;
    }
  }
}

// Setup input and button events
function setupMatrixControls() {
  const searchInput = document.getElementById('matrixSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      matrixSearchQuery = e.target.value;
      renderMatrix();
    });
  }

  const sortTotalBtn = document.getElementById('matrixSortTotal');
  const sortAlphaBtn = document.getElementById('matrixSortAlpha');

  if (sortTotalBtn && sortAlphaBtn) {
    sortTotalBtn.addEventListener('click', () => {
      sortTotalBtn.classList.add('active');
      sortAlphaBtn.classList.remove('active');
      matrixSortBy = 'total';
      renderMatrix();
    });

    sortAlphaBtn.addEventListener('click', () => {
      sortAlphaBtn.classList.add('active');
      sortTotalBtn.classList.remove('active');
      matrixSortBy = 'alpha';
      renderMatrix();
    });
  }

  const toggleBtn = document.getElementById('matrixToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      matrixShowAll = !matrixShowAll;
      renderMatrix();
    });
  }

  // Create global tooltip element if it doesn't exist
  if (!matrixTooltipEl) {
    matrixTooltipEl = document.createElement('div');
    matrixTooltipEl.className = 'matrix-tooltip';
    document.body.appendChild(matrixTooltipEl);
  }
}

// Position and update the floating tooltip
function setupTooltipEvents() {
  const cells = document.querySelectorAll('.matrix-cell-value.has-count');
  cells.forEach(cell => {
    cell.addEventListener('mouseenter', (e) => {
      const title = cell.getAttribute('data-tooltip-title');
      const subtitle = cell.getAttribute('data-tooltip-subtitle');
      let names = [];
      try {
        names = JSON.parse(cell.getAttribute('data-tooltip-names') || '[]');
      } catch (err) {}

      if (matrixTooltipEl) {
        matrixTooltipEl.innerHTML = `
          <div class="matrix-tooltip-header">
            <span>${subtitle}</span>
            <span>${names.length} ${names.length === 1 ? 'character' : 'characters'}</span>
          </div>
          <div class="matrix-tooltip-title">${title}</div>
          ${names.length > 0 
            ? `<div class="matrix-tooltip-names">${names.join(', ')}</div>` 
            : '<div class="matrix-tooltip-content">No character names listed.</div>'
          }
        `;
        matrixTooltipEl.style.opacity = '1';
        positionTooltip(e);
      }
    });

    cell.addEventListener('mousemove', (e) => {
      positionTooltip(e);
    });

    cell.addEventListener('mouseleave', () => {
      if (matrixTooltipEl) {
        matrixTooltipEl.style.opacity = '0';
      }
    });
  });
}

function positionTooltip(e) {
  if (!matrixTooltipEl) return;

  const tooltipWidth = matrixTooltipEl.offsetWidth;
  const tooltipHeight = matrixTooltipEl.offsetHeight;
  
  let x = e.pageX + 15;
  let y = e.pageY + 15;

  // Viewport bounds checking
  if (x + tooltipWidth > window.innerWidth + window.scrollX - 20) {
    x = e.pageX - tooltipWidth - 15;
  }
  if (y + tooltipHeight > window.innerHeight + window.scrollY - 20) {
    y = e.pageY - tooltipHeight - 15;
  }

  matrixTooltipEl.style.left = `${x}px`;
  matrixTooltipEl.style.top = `${y}px`;
}

// Global initialization
document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('matrixTableBody')) {
    await initRaceSelectionMatrix();
  }
});

// For testing VM imports
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    processRaceMatrixData
  };
}
if (typeof window !== 'undefined') {
  window.processRaceMatrixData = processRaceMatrixData;
}
