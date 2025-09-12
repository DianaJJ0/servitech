/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');

describe('SSE init', () => {
  let initSseReload;
  beforeAll(() => {
    const mod = require(path.join(__dirname, '..', '..', 'assets', 'js', 'expertos.js'));
    initSseReload = mod && mod.initSseReload;
  });

  test('initSseReload is defined and idempotent', () => {
    expect(typeof initSseReload).toBe('function');
    // First call: should set __expertosSseInitialized flag
    initSseReload();
    expect(window.__expertosSseInitialized).toBe(true);
    // Subsequent calls should not throw and keep flag true
    expect(() => initSseReload()).not.toThrow();
    expect(window.__expertosSseInitialized).toBe(true);
  });
});
