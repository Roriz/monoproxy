const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert');

// Load the JavaScript code
const codePath = path.join(__dirname, 'race_selection_matrix.js');
const code = fs.readFileSync(codePath, 'utf8');

// Set up minimal globals for execution
const mockWindow = {};
const mockModule = { exports: {} };
const mockDocument = {
  addEventListener: () => {},
  getElementById: () => null
};

// Evaluate the script within a function context to isolate globals
const evalFn = new Function('window', 'document', 'module', 'exports', code);
evalFn(mockWindow, mockDocument, mockModule, mockModule.exports);

const processRaceMatrixData = mockModule.exports.processRaceMatrixData || mockWindow.processRaceMatrixData;

test('Pathway Selection Matrix Data Processor Unit Tests', async (t) => {

  const sampleData = {
    classification: 'person',
    field: 'pathway',
    volumes: [
      {
        volume: 'v-lotm-1',
        counts: {
          'Sleepless': 4,
          'Spectator': 2
        }
      },
      {
        volume: 'v-lotm-2',
        counts: {
          'Sailor': 2,
          'Sleepless': 1
        }
      }
    ],
    series: {
      counts: {
        'Sleepless': 4,
        'Sailor': 2,
        'Spectator': 2,
        'Seer': 1
      }
    }
  };

  await t.test('should return empty array if no data is provided', () => {
    assert.deepStrictEqual(processRaceMatrixData(null, '', 'total'), []);
    assert.deepStrictEqual(processRaceMatrixData(undefined, '', 'total'), []);
  });

  await t.test('should extract all unique pathway names from series and volumes', () => {
    const pathways = processRaceMatrixData(sampleData, '', 'alpha');
    // Unique list: Sleepless, Spectator, Sailor, Seer
    assert.strictEqual(pathways.length, 4);
    assert.ok(pathways.includes('Sleepless'));
    assert.ok(pathways.includes('Spectator'));
    assert.ok(pathways.includes('Sailor'));
    assert.ok(pathways.includes('Seer'));
  });

  await t.test('should filter pathway names case-insensitively', () => {
    const filtered1 = processRaceMatrixData(sampleData, 'sleep', 'alpha');
    assert.deepStrictEqual(filtered1, ['Sleepless']);

    const filtered2 = processRaceMatrixData(sampleData, 'S', 'alpha');
    // Sleepless, Sailor, Spectator, Seer all contain 's' or 'S'
    assert.strictEqual(filtered2.length, 4);
  });

  await t.test('should sort pathway names by total count descending (tie-breaker alphabetical)', () => {
    const sorted = processRaceMatrixData(sampleData, '', 'total');
    // Counts: Sleepless (4), Sailor (2), Spectator (2), Seer (1)
    // Sailor and Spectator are tied at 2, so alphabetical tie-breaker should place Sailor before Spectator
    assert.deepStrictEqual(sorted, ['Sleepless', 'Sailor', 'Spectator', 'Seer']);
  });

  await t.test('should sort pathway names alphabetically', () => {
    const sorted = processRaceMatrixData(sampleData, '', 'alpha');
    assert.deepStrictEqual(sorted, ['Sailor', 'Seer', 'Sleepless', 'Spectator']);
  });

  await t.test('should limit results if limit is provided', () => {
    const limitedTotal = processRaceMatrixData(sampleData, '', 'total', 2);
    assert.deepStrictEqual(limitedTotal, ['Sleepless', 'Sailor']);

    const limitedAlpha = processRaceMatrixData(sampleData, '', 'alpha', 3);
    assert.deepStrictEqual(limitedAlpha, ['Sailor', 'Seer', 'Sleepless']);
  });

});
