/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');

describe('admin-common CSRF init', () => {
  test('initCsrf attaches token and injects hidden inputs on DOMContentLoaded', () => {
  const mod = require(path.join(__dirname, '..', '..', 'assets', 'js', 'admin-common.js'));
  // module registers window.__adminCommon when loaded
  expect(window.__adminCommon).toBeDefined();
  expect(typeof window.__adminCommon.initCsrf).toBe('function');

    // create a form
    document.body.innerHTML = '<form method="post" id="f1"></form>';
    window.__adminCommon.initCsrf('tok-abc');
    // trigger DOMContentLoaded
    const evt = document.createEvent('Event');
    evt.initEvent('DOMContentLoaded', true, true);
    document.dispatchEvent(evt);

    const input = document.querySelector('form#f1 input[name="_csrf"]');
    expect(input).not.toBeNull();
    expect(input.value).toBe('tok-abc');
  });
});
