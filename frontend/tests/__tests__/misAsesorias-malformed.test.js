/** @jest-environment jsdom */
const path = require('path');

describe('misAsesorias malformed JSON', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="initial-misAsesorias">{not:valid,json</div>';
  });

  test('readInitialData does not throw on malformed JSON', () => {
    const mod = require(path.join(__dirname, '..', '..', 'assets', 'js', 'misAsesorias.js'));
    const readInitialData = mod && mod.readInitialData;
    expect(typeof readInitialData).toBe('function');
    expect(() => readInitialData()).not.toThrow();
  });
});
