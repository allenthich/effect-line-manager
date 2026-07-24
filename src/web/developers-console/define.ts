import { defineLineAccountDialog, defineLineAccountForm } from "../define.ts";
import { LineDevelopersConsole } from "./line-developers-console.ts";

const defineElement = (name: string, constructor: CustomElementConstructor): void => {
  if (customElements.get(name) === undefined) {
    customElements.define(name, constructor);
  }
};

/** Registers the <line-developers-console> custom element and child dialog dependencies. */
export const defineLineDevelopersConsole = (): void => {
  defineLineAccountDialog();
  defineLineAccountForm();
  defineElement("line-developers-console", LineDevelopersConsole);
};

/** Convenience alias for {@link defineLineDevelopersConsole}. */
export const defineLineDevelopersConsoleElements = (): void => {
  defineLineDevelopersConsole();
};
