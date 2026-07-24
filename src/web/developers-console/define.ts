import { LineDevelopersConsole } from "./line-developers-console.ts";

const defineElement = (name: string, constructor: CustomElementConstructor): void => {
  if (customElements.get(name) === undefined) {
    customElements.define(name, constructor);
  }
};

/** Registers the &lt;line-developers-console&gt; custom element. */
export const defineLineDevelopersConsole = (): void => {
  defineElement("line-developers-console", LineDevelopersConsole);
};

/** Convenience alias for {@link defineLineDevelopersConsole}. */
export const defineLineDevelopersConsoleElements = (): void => {
  defineLineDevelopersConsole();
};
