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

test('Race Selection Matrix Data Processor Unit Tests', async (t) => {

  const sampleData = {
    classification: 'person',
    field: 'race_selection',
    volumes: [
      {
        volume: 'v-dungeon_crawler_carl_1',
        counts: {
          'Human': 4,
          'Goblin': 2
        }
      },
      {
        volume: 'v-dungeon_crawler_carl_2',
        counts: {
          'Orc': 2,
          'Human': 1
        }
      }
    ],
    series: {
      counts: {
        'Human': 4,
        'Orc': 2,
        'Goblin': 2,
        'Primal': 1
      }
    }
  };

  await t.test('should return empty array if no data is provided', () => {
    assert.deepStrictEqual(processRaceMatrixData(null, '', 'total'), []);
    assert.deepStrictEqual(processRaceMatrixData(undefined, '', 'total'), []);
  });

  await t.test('should extract all unique race names from series and volumes', () => {
    const races = processRaceMatrixData(sampleData, '', 'alpha');
    // Unique list: Human, Goblin, Orc, Primal
    assert.strictEqual(races.length, 4);
    assert.ok(races.includes('Human'));
    assert.ok(races.includes('Goblin'));
    assert.ok(races.includes('Orc'));
    assert.ok(races.includes('Primal'));
  });

  await t.test('should filter race names case-insensitively', () => {
    const filtered1 = processRaceMatrixData(sampleData, 'hum', 'alpha');
    assert.deepStrictEqual(filtered1, ['Human']);

    const filtered2 = processRaceMatrixData(sampleData, 'R', 'alpha');
    // Orc, Primal both contain 'r' or 'R'
    assert.strictEqual(filtered2.length, 2);
    assert.ok(filtered2.includes('Orc'));
    assert.ok(filtered2.includes('Primal'));
  });

  await t.test('should sort race names by total count descending (tie-breaker alphabetical)', () => {
    const sorted = processRaceMatrixData(sampleData, '', 'total');
    // Counts: Human (4), Goblin (2), Orc (2), Primal (1)
    // Goblin and Orc are tied at 2, so alphabetical tie-breaker should place Goblin before Orc
    assert.deepStrictEqual(sorted, ['Human', 'Goblin', 'Orc', 'Primal']);
  });

  await t.test('should sort race names alphabetically', () => {
    const sorted = processRaceMatrixData(sampleData, '', 'alpha');
    assert.deepStrictEqual(sorted, ['Goblin', 'Human', 'Orc', 'Primal']);
  });

  await t.test('should limit results if limit is provided', () => {
    const limitedTotal = processRaceMatrixData(sampleData, '', 'total', 2);
    assert.deepStrictEqual(limitedTotal, ['Human', 'Goblin']);

    const limitedAlpha = processRaceMatrixData(sampleData, '', 'alpha', 3);
    assert.deepStrictEqual(limitedAlpha, ['Goblin', 'Human', 'Orc']);
  });

});
