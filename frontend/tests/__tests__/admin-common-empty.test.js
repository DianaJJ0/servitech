/** @jest-environment jsdom */
const path = require('path');

test('initCsrf with empty token is no-op', () => {
  const mod = require(path.join(__dirname, '..', '..', 'assets', 'js', 'admin-common.js'));
  expect(window.__adminCommon).toBeDefined();
  expect(typeof window.__adminCommon.initCsrf).toBe('function');
  document.body.innerHTML = '<form id="f2"></form>';
  expect(() => window.__adminCommon.initCsrf('')).not.toThrow();
  const input = document.querySelector('#f2 input[name="_csrf"]');
  expect(input).toBeNull();
});
