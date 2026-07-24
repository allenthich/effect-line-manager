import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const jsr = JSON.parse(fs.readFileSync("./jsr.json", "utf-8"));

let changed = false;

if (jsr.version !== pkg.version) {
  jsr.version = pkg.version;
  changed = true;
  console.log(`✓ Synced jsr.json version to ${pkg.version}`);
}

const newExports = {};
for (const [key, value] of Object.entries(pkg.exports)) {
  if (key === "./package.json") continue;
  const srcValue = value.replace(/^\.\/dist\//, "./src/").replace(/\.mjs$/, ".ts");
  newExports[key] = srcValue;
}

if (JSON.stringify(jsr.exports) !== JSON.stringify(newExports)) {
  jsr.exports = newExports;
  changed = true;
  console.log("✓ Synced jsr.json exports from package.json");
}

if (changed) {
  fs.writeFileSync("./jsr.json", JSON.stringify(jsr, null, 2) + "\n");
}
