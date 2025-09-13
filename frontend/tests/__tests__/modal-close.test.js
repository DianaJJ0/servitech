/** @jest-environment jsdom */

const path = require("path");

describe("modal close handlers", () => {
  beforeAll(() => {
    // crear un DOM mínimo con un modal y botón de cierre
    document.body.innerHTML = `
      <div class="modal-expert" style="display:flex;">
        <div class="modal-expert__content">
          <div class="modal-expert__header">
            <h2 class="modal-expert__title">Test</h2>
            <button class="btn-close"><i class="fas fa-times"></i></button>
          </div>
        </div>
      </div>
    `;

    // require the module (it will push deferred handlers when in test env)
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

    // Run any deferred DOMContentLoaded handlers registered
    if (mod && Array.isArray(mod.__adminExpertsDeferredDOMContentLoaded)) {
      mod.__adminExpertsDeferredDOMContentLoaded.forEach((fn) => {
        try {
          fn();
        } catch (e) {}
      });
    }
  });

  test("clicking .btn-close hides the modal", () => {
    const modal = document.querySelector(".modal-expert");
    const btnClose = document.querySelector(".btn-close");
    expect(modal).toBeTruthy();
    expect(btnClose).toBeTruthy();

    // simulate click
    btnClose.click();

    // after handler, modal.style.display should be 'none'
    expect(modal.style.display).toBe("none");
  });

  test("clicking on backdrop (outside container) hides the modal", () => {
    // reset display to visible
    const modal = document.querySelector(".modal-expert");
    modal.style.display = "flex";
    // create an inner container so our click can be outside it
    const inner = document.createElement("div");
    inner.className = "modal-expert__container";
    // move header into container
    const header = modal.querySelector(".modal-expert__header");
    if (header && header.parentNode) header.parentNode.removeChild(header);
    inner.appendChild(header);
    modal.appendChild(inner);

    // simulate click on modal backdrop
    const clickEvent = new MouseEvent("click", { bubbles: true });
    modal.dispatchEvent(clickEvent);

    expect(modal.style.display).toBe("none");
  });
});
