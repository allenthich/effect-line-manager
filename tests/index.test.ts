import { expect, test } from "vite-plus/test";
import {
  CreateLineChannelInput,
  LineApiResponseError,
  LineApiAuthenticationError,
  LineApiRateLimitError,
  LineApiTimeoutError,
  LineChannel,
  LineChannelId,
  LineChannelRecordId,
  LineChannelNotFoundError,
  LineClientRegistry,
  LineMessages,
  LineRepository,
  LineSignatureError,
  LineTextMessage,
  makeLineApiClient,
  verifyLineSignature,
  verifyLineSignatureString,
} from "../src/index.ts";

test("exports the stable LINE manager API", () => {
  expect([
    CreateLineChannelInput,
    LineApiAuthenticationError,
    LineApiRateLimitError,
    LineApiResponseError,
    LineApiTimeoutError,
    LineChannel,
    LineChannelId,
    LineChannelRecordId,
    LineChannelNotFoundError,
    LineClientRegistry,
    LineMessages,
    LineRepository,
    LineSignatureError,
    LineTextMessage,
    makeLineApiClient,
    verifyLineSignature,
    verifyLineSignatureString,
  ]).not.toContain(undefined);
});
