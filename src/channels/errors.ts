import { Schema } from "effect";
import { LineLoginChannelId, LineMessagingChannelId } from "./domain.ts";

/** Error raised when a LINE Messaging channel is not found by its channel ID. */
export class MessagingChannelNotFoundError extends Schema.TaggedErrorClass<MessagingChannelNotFoundError>()(
  "MessagingChannelNotFoundError",
  {
    channelId: LineMessagingChannelId,
  },
) {}

/** Error raised when a LINE Login channel is not found by its channel ID. */
export class LoginChannelNotFoundError extends Schema.TaggedErrorClass<LoginChannelNotFoundError>()(
  "LoginChannelNotFoundError",
  {
    channelId: LineLoginChannelId,
  },
) {}
