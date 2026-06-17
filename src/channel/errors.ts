import { Schema } from "effect";
import { LineChannelId, LineChannelRecordId } from "./domain.ts";

export class ChannelNotFoundError extends Schema.TaggedErrorClass<ChannelNotFoundError>()(
  "ChannelNotFoundError",
  {
    recordId: LineChannelRecordId,
  },
) {}

export class ChannelDuplicateError extends Schema.TaggedErrorClass<ChannelDuplicateError>()(
  "ChannelDuplicateError",
  {
    channelId: LineChannelId,
  },
) {}
