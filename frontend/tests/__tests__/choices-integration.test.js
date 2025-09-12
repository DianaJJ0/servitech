/** @jest-environment jsdom */

const path = require("path");

describe("admin-expertos integration (controlled DOM ready)", () => {
  beforeAll(() => {
    // minimal DOM elements the script expects
    document.body.innerHTML =
      '\n      <select id="skills"></select>\n      <select id="categorias"></select>\n      <div id="admin-habilidades">[]</div>\n      <div id="initial-expertos">[]</div>\n    ';

    // mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );

    // mock Choices constructor; store instances by key
    global._choicesInstances = {};
    global.Choices = function (element, options) {
      const key =
        (options && options.instanceKey) ||
        (element && element.id) ||
        "choices-" + Math.random().toString(36).slice(2, 8);
      const inst = {
        key,
        el: element,
        opts: options,
        destroyed: false,
        destroy() {
          this.destroyed = true;
        },
      };
      global._choicesInstances[key] = inst;
      return inst;
    };

    // Mock getComputedStyle and MutationObserver
    global.getComputedStyle = (el) => ({
      display: el && el.style ? el.style.display || "" : "",
    });
    global.MutationObserver = class {
      constructor(cb) {
        this.cb = cb;
      }
      observe() {}
      disconnect() {}
    };

    // ensure module can be required without firing DOMContentLoaded handlers
    const adminPath = path.resolve(
      __dirname,
      "..",
      "..",
      "assets",
      "js",
      "admin",
      "admin-expertos.js"
    );
    const mod = require(adminPath);

    // If the script exported defers, execute them now to simulate DOMContentLoaded
    if (
      mod &&
      mod.__adminExpertsDeferredDOMContentLoaded &&
      Array.isArray(mod.__adminExpertsDeferredDOMContentLoaded)
    ) {
      mod.__adminExpertsDeferredDOMContentLoaded.forEach((fn) => {
        try {
          fn();
        } catch (e) {}
      });
    }

    // Expose initializeChoicesOn to window if module exported it
    if (mod && typeof mod.initializeChoicesOn === "function") {
      window.initializeChoicesOn = mod.initializeChoicesOn;
    }
  });

  test("initializeChoicesOn idempotency in integration", async () => {
    expect(typeof window.initializeChoicesOn).toBe("function");

    await window.initializeChoicesOn(
      "skills",
      { removeItemButton: true },
      "skills"
    );
    // allow any async load to settle
    await new Promise((r) => setTimeout(r, 30));
    const first =
      global._choicesInstances["skills"] || global._choicesInstances["skills"];
    expect(first).toBeDefined();

    await window.initializeChoicesOn(
      "skills",
      { removeItemButton: true },
      "skills"
    );
    await new Promise((r) => setTimeout(r, 30));
    const second = global._choicesInstances["skills"];
    expect(second).toBeDefined();
    expect(first.destroyed).toBe(true);
    expect(first).not.toBe(second);
  });
});
