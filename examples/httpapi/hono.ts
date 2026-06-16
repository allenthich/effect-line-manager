import { Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { Hono, type MiddlewareHandler } from "hono";
import { LineAccountManagement } from "../../src/account/management.ts";
import { LineApiLayer } from "../../src/httpapi/index.ts";

export interface HonoLineAccountManagementOptions {
  readonly managementLayer: Layer.Layer<LineAccountManagement, unknown, never>;
  readonly prefix?: string | undefined;
  readonly authorize?: MiddlewareHandler | undefined;
}

export const createHonoLineAccountManagementApp = (options: HonoLineAccountManagementOptions) => {
  const prefix = options.prefix ?? "/api/admin";
  const apiLayer = LineApiLayer.pipe(
    Layer.provide(options.managementLayer),
    Layer.provide(HttpServer.layerServices),
  );
  const webHandler = HttpRouter.toWebHandler(apiLayer, { disableLogger: true });
  const app = new Hono();

  if (options.authorize !== undefined) {
    app.use(`${prefix}/*`, options.authorize);
  }
  app.mount(prefix, webHandler.handler);

  return {
    app,
    dispose: webHandler.dispose,
  } as const;
};
