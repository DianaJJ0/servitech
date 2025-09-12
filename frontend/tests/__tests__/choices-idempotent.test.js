/**
 * Jest test to verify initializeChoicesOn is idempotent.
 * Mocks fetch and Choices to avoid network and DOM side effects.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('initializeChoicesOn idempotency', () => {
  let window;

  beforeAll(() => {
    const html = '<!doctype html><html><head></head><body><select id="skills"></select><select id="categorias"></select></body></html>';
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    window = dom.window;

    // Provide global fetch mock to avoid network calls
    window.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));

    // Provide minimal ensureChoicesLoaded to short-circuit network loading
    window.ensureChoicesLoaded = () => Promise.resolve();

    // Mock Choices constructor
    window._choicesInstances = window._choicesInstances || {};
    window.Choices = function(element, options) {
      const id = options && options.instanceKey ? options.instanceKey : (element && element.id) ? element.id : ('choices-' + Math.random().toString(36).slice(2,8));
      const inst = { id, el: element, opts: options, destroyed: false, destroy() { this.destroyed = true; } };
      window._choicesInstances[id] = inst;
      return inst;
    };

    // Load admin-expertos.js into the vm context of jsdom
    const code = fs.readFileSync(path.resolve(__dirname, '..', '..', 'assets', 'js', 'admin', 'admin-expertos.js'), 'utf8');
    // Execute in the window's global scope
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.body.appendChild(scriptEl);
  });

  afterAll(() => {
    if (window && window.close) window.close();
  });

  test('reinitializing choices destroys previous instance and creates new one', async () => {
    expect(typeof window.initializeChoicesOn).toBe('function');

    await window.initializeChoicesOn('skills', { removeItemButton: true }, 'skills');
    await new Promise((r) => setTimeout(r, 20));
    const inst1 = window._choicesInstances && window._choicesInstances['skills'];
    expect(inst1).toBeDefined();

    await window.initializeChoicesOn('skills', { removeItemButton: true }, 'skills');
    await new Promise((r) => setTimeout(r, 20));
    const inst2 = window._choicesInstances && window._choicesInstances['skills'];
    expect(inst2).toBeDefined();

    // previous should have been destroyed
    expect(inst1.destroyed).toBe(true);
    // new instance should be a different object
    expect(inst1).not.toBe(inst2);
  });
});
