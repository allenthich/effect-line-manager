import { Effect, Exit, Layer, Scope } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { NodeHttpServer } from "@effect/platform-node";
import type { RequestHandler } from "express";
import { LineAccountManagement } from "../../src/account/management.ts";
import { LineAccountManagementApiLayer } from "../../src/httpapi/index.ts";

export interface ExpressLineAccountManagementOptions {
  readonly managementLayer: Layer.Layer<LineAccountManagement, unknown, never>;
}

export interface ExpressLineAccountManagementMiddleware {
  readonly middleware: RequestHandler;
  readonly dispose: () => Promise<void>;
}

export const createExpressLineAccountManagementMiddleware = (
  options: ExpressLineAccountManagementOptions,
): ExpressLineAccountManagementMiddleware => {
  const scope = Effect.runSync(Scope.make());
  const apiLayer = LineAccountManagementApiLayer.pipe(
    Layer.provide(options.managementLayer),
    Layer.provide(HttpServer.layerServices),
  );
  const handlerResult = Effect.runPromise(
    HttpRouter.toHttpEffect(apiLayer).pipe(
      Effect.provideService(Scope.Scope, scope),
      Effect.flatMap((httpEffect) => NodeHttpServer.makeHandler(httpEffect, { scope })),
    ),
  ).then(
    (handler) => ({ _tag: "Success", handler }) as const,
    (error: unknown) => ({ _tag: "Failure", error }) as const,
  );
  let disposed = false;

  const middleware: RequestHandler = (request, response, next) => {
    void handlerResult.then((result) => {
      if (result._tag === "Failure") {
        next(result.error);
        return;
      }
      const { handler } = result;
      if (disposed) {
        next(new Error("LINE account HTTP API middleware has been disposed"));
        return;
      }
      try {
        handler(request, response);
      } catch (error) {
        next(error);
      }
    });
  };

  return {
    middleware,
    dispose: async () => {
      if (disposed) return;
      disposed = true;
      await handlerResult;
      await Effect.runPromise(Scope.close(scope, Exit.void));
    },
  } as const;
};
