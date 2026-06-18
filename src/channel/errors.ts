import { Schema } from "effect";
import { LineChannelId, LineChannelRecordId } from "./domain.ts";

/** Error raised when a LINE channel is not found by its record ID. */
export class ChannelNotFoundError extends Schema.TaggedErrorClass<ChannelNotFoundError>()(
  "ChannelNotFoundError",
  {
    recordId: LineChannelRecordId,
  },
) {}

/** Error raised when attempting to create a LINE channel with a duplicate channel ID. */
export class ChannelDuplicateError extends Schema.TaggedErrorClass<ChannelDuplicateError>()(
  "ChannelDuplicateError",
  {
    channelId: LineChannelId,
  },
) {}
