/**
 * effect-line-manager
 *
 * Headless Effect library for managing LINE Messaging API channels and clients.
 * Provides typed services for LINE Login, Messaging API, LIFF, HTTP API,
 * and web components with an adapter-based architecture.
 *
 * @example
 * ```ts
 * import { LineClientRegistry, LineChannelRepository, LineAccountManagementAdapter } from "@allenthich/effect-line-manager";
 * import { Effect, Layer } from "effect";
 *
 * // Compose services into a dependency layer
 * const registry = LineClientRegistry.layer({ capacity: 1000 });
 * ```
 *
 * @module
 */
export * from "./shared/index.ts";
export * from "./provider/index.ts";
export * from "./channel/index.ts";
export * from "./liff/index.ts";
export * from "./messaging/index.ts";
export * from "./login/index.ts";
export * from "./registry/index.ts";
export * from "./adapter/index.ts";
export * from "./httpapi/index.ts";
