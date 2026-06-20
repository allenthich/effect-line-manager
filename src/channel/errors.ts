import { Schema } from "effect";
import { LineChannelId } from "./domain.ts";

/** Error raised when a LINE channel is not found by its channel ID. */
export class ChannelNotFoundError extends Schema.TaggedErrorClass<ChannelNotFoundError>()(
  "ChannelNotFoundError",
  {
    channelId: LineChannelId,
  },
) {}

/** Error raised when attempting to create a LINE channel with a duplicate channel ID. */
export class ChannelDuplicateError extends Schema.TaggedErrorClass<ChannelDuplicateError>()(
  "ChannelDuplicateError",
  {
    channelId: LineChannelId,
  },
) {}
