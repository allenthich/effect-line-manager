import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const jsr = JSON.parse(fs.readFileSync("./jsr.json", "utf-8"));

if (jsr.version !== pkg.version) {
  jsr.version = pkg.version;
  fs.writeFileSync("./jsr.json", JSON.stringify(jsr, null, 2) + "\n");
  console.log(`✓ Synced jsr.json version to ${pkg.version}`);
}
