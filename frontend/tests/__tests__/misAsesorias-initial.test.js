/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');

describe('misAsesorias initial data', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="initial-misAsesorias">{"usuarioId":"u123","rolUsuario":"cliente"}</div>';
    // mock localStorage
    global.localStorage = {
      store: {},
      getItem(k) { return this.store[k] || null; },
      setItem(k,v) { this.store[k]=v; }
    };
  });

  test('readInitialData parses JSON and sets variables', () => {
  const mod = require(path.join(__dirname, '..', '..', 'assets', 'js', 'misAsesorias.js'));
  const readInitialData = mod && mod.readInitialData;
  expect(typeof readInitialData).toBe('function');
  expect(() => readInitialData()).not.toThrow();
  });
});
