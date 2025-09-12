const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

(async function run() {
  try {
    const html =
      '<!doctype html><html><head></head><body><select id="skills"></select><select id="categorias"></select></body></html>';
    const dom = new JSDOM(html);
    const { window } = dom;

    // Minimal shims so admin-expertos.js doesn't try to load Choices from network
    window._choicesLoadedPromise = Promise.resolve();
    window.ensureChoicesLoaded = function () {
      return Promise.resolve();
    };

    // Mock a simple Choices constructor that records instances and supports destroy()
    window._choicesInstances = window._choicesInstances || {};
    window.Choices = function (element, options) {
      const id =
        (options && options.instanceKey) ||
        (element && element.id) ||
        "choices-" + Math.random().toString(36).slice(2, 8);
      const inst = {
        id,
        el: element,
        opts: options,
        destroyed: false,
        destroy: function () {
          this.destroyed = true;
        },
      };
      window._choicesInstances[id] = inst;
      return inst;
    };

    // Load the admin-expertos.js content
    const filePath = path.resolve(
      __dirname,
      "..",
      "assets",
      "js",
      "admin",
      "admin-expertos.js"
    );
    const code = fs.readFileSync(filePath, "utf8");

    // Run in vm with the jsdom window as global context
    const context = vm.createContext(window);
    const script = new vm.Script(code, { filename: "admin-expertos.js" });
    script.runInContext(context);

    // Small delay for any promise-based initialization
    await new Promise((r) => setTimeout(r, 50));

    if (typeof window.initializeChoicesOn !== "function") {
      console.error("initializeChoicesOn is not defined in the loaded script");
      process.exit(2);
    }

    // First initialization
    await window.initializeChoicesOn(
      "skills",
      { removeItemButton: true },
      "skills"
    );
    await new Promise((r) => setTimeout(r, 50));
    const inst1 =
      window._choicesInstances && window._choicesInstances["skills"];
    if (!inst1) {
      console.error("First initialization failed: instance not found");
      process.exit(3);
    }

    // Call again to test idempotency (should destroy previous instance)
    await window.initializeChoicesOn(
      "skills",
      { removeItemButton: true },
      "skills"
    );
    await new Promise((r) => setTimeout(r, 50));
    const inst2 =
      window._choicesInstances && window._choicesInstances["skills"];
    if (!inst2) {
      console.error("Second initialization failed: instance not found");
      process.exit(4);
    }

    if (inst1 === inst2) {
      console.error(
        "Instance not recreated; expected new instance object or re-initialization behavior"
      );
      process.exit(5);
    }

    if (!inst1.destroyed && inst1.destroy) {
      console.error("Previous instance was not destroyed");
      process.exit(6);
    }

    console.log(
      "PASS: initializeChoicesOn is idempotent (previous instance destroyed, new instance created)"
    );
    process.exit(0);
  } catch (err) {
    console.error("TEST ERROR:", err);
    process.exit(1);
  }
})();
