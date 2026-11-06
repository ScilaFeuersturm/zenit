const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const out = path.join(root, "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of ["index.html", "css", "js", "assets"]) {
  fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
}
const config = {
  APP_URL: process.env.APP_URL || "http://localhost:19006",
  API_URL: process.env.API_URL || "http://localhost:8000",
};
for (const value of Object.values(config)) {
  if (!["http:", "https:"].includes(new URL(value).protocol)) {
    throw new Error("Las URLs deben usar HTTP o HTTPS");
  }
}
fs.writeFileSync(path.join(out, "js/config.js"), `window.ZENIT_CONFIG = ${JSON.stringify(config)};\n`);
