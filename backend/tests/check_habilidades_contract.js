#!/usr/bin/env node
// Script de comprobación rápida del contrato de la API /api/habilidades
// Sale con código de error 1 si la comprobación falla, 0 si pasa.

const http = require("http");
const url = "http://127.0.0.1:5020/api/habilidades";

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

function ok(msg) {
  console.log("OK:", msg);
}

http
  .get(url, (res) => {
    const { statusCode } = res;
    const contentType = res.headers["content-type"] || "";

    if (statusCode !== 200) {
      fail(`Status expected 200 but got ${statusCode}`);
      res.resume();
      return;
    }

    let raw = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      raw += chunk;
    });
    res.on("end", () => {
      try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) {
          fail("Response is not an array");
          return;
        }
        if (data.length === 0) {
          ok("Response is empty array (allowed)");
          process.exitCode = 0;
          return;
        }
        // Validate first few items
        for (let i = 0; i < Math.min(5, data.length); i++) {
          const item = data[i];
          if (!item || typeof item !== "object") {
            fail(`Item ${i} is not an object`);
            return;
          }
          if (!("_id" in item)) {
            fail(`Item ${i} missing _id`);
            return;
          }
          if (!("nombre" in item)) {
            fail(`Item ${i} missing nombre`);
            return;
          }
        }
        ok("Contract validated for first items");
        process.exitCode = 0;
      } catch (e) {
        fail("Invalid JSON: " + e.message);
      }
    });
  })
  .on("error", (err) => {
    fail("Request error: " + err.message);
  });
