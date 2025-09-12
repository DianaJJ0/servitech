/** @jest-environment jsdom */
const path = require('path');

test('initSseReload handles missing EventSource gracefully', () => {
  // simulate environment without EventSource
  delete global.EventSource;
  const mod = require(path.join(__dirname, '..', '..', 'assets', 'js', 'expertos.js'));
  const initSseReload = mod && mod.initSseReload;
  expect(typeof initSseReload).toBe('function');
  expect(() => initSseReload()).not.toThrow();
});
