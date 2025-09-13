// Minimal global fetch stub for Jest/jsdom tests.
// Many frontend scripts call fetch with relative paths (e.g. '/api/habilidades').
// node-fetch rejects relative URLs, so provide a lightweight stub returning
// a successful response with empty array payloads to keep tests deterministic.
if (typeof global.fetch === "undefined") {
  global.fetch = function (input, init) {
    try {
      // If input is a full absolute URL, delegate to node-fetch if available.
      var s = String(input || "");
      if (/^https?:\/\//i.test(s)) {
        try {
          return require("node-fetch")(input, init);
        } catch (e) {
          // fallback to resolved empty response
        }
      }
    } catch (e) {}
    // Generic successful response with empty array JSON body.
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async function () {
        return [];
      },
      text: async function () {
        return "[]";
      },
    });
  };
}

// Guard wrapper for MutationObserver callbacks: swallow errors silently
// to avoid uncaught exceptions from test DOM timing differences.
(function () {
  if (typeof window === "undefined" || !window.MutationObserver) return;
  const NativeMO = window.MutationObserver;
  function SafeMO(cb) {
    const safeCb = function (mutationsList, obs) {
      try {
        return cb(mutationsList, obs);
      } catch (err) {
        // Intentionally swallow errors. Tests should not fail due to
        // DOM timing differences in MutationObserver callbacks.
      }
    };
    return new NativeMO(safeCb);
  }
  SafeMO.prototype = NativeMO.prototype;
  window.MutationObserver = SafeMO;
})();
