/**
 * Adapter Types
 *
 * Shared interfaces and types for the adapter pattern used across
 * LINE account management. These types define the contract between
 * consumers and the web component UI layer.
 *
 * Legacy generic shim DTOs (`CreateChannelInput`, `UpdateChannelInput`,
 * `ListChannelsQuery`) live in `./compat.ts` and are imported directly by
 * the web types and the HTTP API client. They are deliberately NOT
 * re-exported from the root — they exist solely to back the backward-
 * compatible adapter shim methods (`listChannels`, `createChannel`, etc.)
 * and consumers should migrate to the aggregate-specific surface.
 *
 * @module
 */
export * from "./types.ts";
