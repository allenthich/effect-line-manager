import { expect, test } from "vite-plus/test";
import {
  CreateLineChannelInput,
  LineApiResponseError,
  LineChannel,
  LineChannelNotFoundError,
  LineClientRegistry,
  LineMessages,
  LineRepository,
  LineSignatureError,
  LineTextMessage,
  makeLineApiClient,
  makeLineClientRegistryLayer,
  verifyLineSignature,
  verifyLineSignatureString,
} from "../src/index.ts";

test("exports the stable LINE manager API", () => {
  expect([
    CreateLineChannelInput,
    LineApiResponseError,
    LineChannel,
    LineChannelNotFoundError,
    LineClientRegistry,
    LineMessages,
    LineRepository,
    LineSignatureError,
    LineTextMessage,
    makeLineApiClient,
    makeLineClientRegistryLayer,
    verifyLineSignature,
    verifyLineSignatureString,
  ]).not.toContain(undefined);
});
