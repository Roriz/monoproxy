const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

// 1. Read and load the code in a mocked VM context
const codePath = path.join(__dirname, 'entity_journey.js');
const rawCode = fs.readFileSync(codePath, 'utf8');

// Mock DOM element constructor
class MockElement {
  constructor(tagName = 'DIV') {
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.textContent = '';
    this.children = [];
    this.style = {
      setProperty: (prop, val) => { this.style[prop] = val; }
    };
    this.title = '';
  }

  appendChild(child) {
    this.children.push(child);
  }

  replaceChildren() {
    this.children = [];
  }
}

// Set up mock window/document context
const mockElements = {
  'absence-chart-container': new MockElement('div'),
  'absence-grid-bg': new MockElement('div'),
  'absence-ruler-container': new MockElement('div')
};

const context = {
  window: {},
  document: {
    addEventListener: () => {},
    getElementById: (id) => mockElements[id] || null,
    createElement: (tag) => new MockElement(tag),
    documentElement: {}
  },
  getComputedStyle: () => {
    return {
      getPropertyValue: (propName) => {
        if (propName === '--color-person') return 'oklch(78% 0.16 85)';
        if (propName === '--color-item') return 'oklch(68% 0.18 45)';
        return '#ffffff';
      }
    };
  },
  COLOR_MAP: {
    person: 'var(--color-person)',
    location: 'var(--color-location)',
    organization: 'var(--color-org)',
    item: 'var(--color-item)',
    event: 'var(--color-event)',
    other: 'var(--color-other)'
  },
  console: console
};

vm.createContext(context);
vm.runInContext(rawCode, context);

// Populate mock classifications after initialization
context.window.entityClassifications.set('zev', 'person');
context.window.entityClassifications.set('juice box', 'item');
context.window.entityClassifications.set('prepotente', 'other');

const renderAbsenceSpansChart = context.renderAbsenceSpansChart;

test('Narrative Absence Spans Chart Unit Tests', async (t) => {

  t.beforeEach(() => {
    // Reset mock elements before each test
    Object.values(mockElements).forEach(el => el.replaceChildren());
  });

  await t.test('should correctly render grid lines and ruler ticks based on total chapters', () => {
    const gaps = [];
    const totalChapters = 500;

    renderAbsenceSpansChart(gaps, totalChapters);

    const gridLines = mockElements['absence-grid-bg'].children;
    const rulerContainer = mockElements['absence-ruler-container'];
    
    assert.strictEqual(rulerContainer.children.length, 1, 'Ruler container should contain one ruler track');
    const rulerTrack = rulerContainer.children[0];
    
    // With 500 chapters and step 50, ticks should be at 0, 50, 100, ..., 500 (11 ticks)
    assert.strictEqual(rulerTrack.children.length, 11, 'Ruler track should have 11 tick labels');
    assert.strictEqual(gridLines.length, 11, 'Grid background should have 11 lines');

    // Verify first and last ticks
    assert.strictEqual(rulerTrack.children[0].textContent, 'ch. 0');
    assert.strictEqual(rulerTrack.children[0].style.left, '0%');
    assert.strictEqual(rulerTrack.children[10].textContent, 'ch. 500');
    assert.strictEqual(rulerTrack.children[10].style.left, '100%');
  });

  await t.test('should resolve entity properties generically (from_chapter vs start_chapter)', () => {
    const gaps = [
      {
        character: 'Zev',
        gap_chapters: 285,
        from_chapter: 82,
        to_chapter: 367
      },
      {
        entity: 'Juice Box',
        gap: 188,
        start_chapter: 200,
        end_chapter: 388
      }
    ];

    renderAbsenceSpansChart(gaps, 500);

    const chartContainer = mockElements['absence-chart-container'];
    assert.strictEqual(chartContainer.children.length, 2, 'Should render 2 rows');

    // Row 1: Zev (DCC key names)
    const row1 = chartContainer.children[0];
    const label1 = row1.children[0];
    const track1 = row1.children[1];
    const segment1 = track1.children[0];
    
    assert.strictEqual(label1.textContent, 'Zev');
    assert.strictEqual(segment1.style.left, `${(82 / 500) * 100}%`);
    assert.strictEqual(segment1.style.width, `${(285 / 500) * 100}%`);
    assert.strictEqual(segment1.style.color, 'var(--color-person)'); // Zev classification: person

    // Row 2: Juice Box (LOTM key names)
    const row2 = chartContainer.children[1];
    const label2 = row2.children[0];
    const track2 = row2.children[1];
    const segment2 = track2.children[0];
    
    assert.strictEqual(label2.textContent, 'Juice Box');
    assert.strictEqual(segment2.style.left, `${(200 / 500) * 100}%`);
    assert.strictEqual(segment2.style.width, `${(188 / 500) * 100}%`);
    assert.strictEqual(segment2.style.color, 'var(--color-item)'); // Juice Box classification: item
  });

  await t.test('should correctly build DOM hierarchy for dots and lines', () => {
    const gaps = [
      {
        character: 'Zev',
        gap_chapters: 200,
        from_chapter: 100,
        to_chapter: 300
      }
    ];

    renderAbsenceSpansChart(gaps, 500);

    const chartContainer = mockElements['absence-chart-container'];
    const track = chartContainer.children[0].children[1];
    const segment = track.children[0];

    // Children: dotStart, line, dotEnd, value
    assert.strictEqual(segment.children.length, 4, 'Segment should have 4 child elements');
    assert.strictEqual(segment.children[0].className, 'absence-dot dot-start');
    assert.strictEqual(segment.children[1].className, 'absence-line');
    assert.strictEqual(segment.children[2].className, 'absence-dot dot-end');
    assert.strictEqual(segment.children[3].className, 'absence-value');
    assert.strictEqual(segment.children[3].textContent, '200 ch.');
  });
});
