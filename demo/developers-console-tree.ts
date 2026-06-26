import {
  defineLineDevelopersConsoleElements,
  type LineDevelopersConsole,
} from "../src/web/developers-console/index.ts";
import { createDemoConsoleAdapter } from "./developers-console-seed.ts";

defineLineDevelopersConsoleElements();

const element = document.querySelector<LineDevelopersConsole>("#developers-console");
if (element === null) throw new Error("Missing #developers-console element");

element.adapter = createDemoConsoleAdapter();
element.variant = "tree";

element.addEventListener("line-developers-console-error", (event) => {
  console.error("developers-console error", (event as CustomEvent).detail);
});
element.addEventListener("line-developers-console-copy", (event) => {
  console.info("copied secret", (event as CustomEvent).detail);
});
