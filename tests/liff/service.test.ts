import { describe, expect, test } from "vite-plus/test";
import { Effect, Layer, Option, Schema } from "effect";
import { LineLoginChannelRepository } from "../../src/channels/repository.ts";
import {
  LineLiffId,
  LineLiffUid,
  type CreateLiffAppRecordInput,
  type UpdateLiffAppRecordInput,
} from "../../src/liff/domain.ts";
import { LineLiffRepository, type LineLiffRepositoryService } from "../../src/liff/repository.ts";
import { LineLiffManagement, toLiffAppView } from "../../src/liff/service.ts";
import { LineProviderRepository } from "../../src/provider/repository.ts";
import { LineClientRegistry } from "../../src/registry/index.ts";
import { LineLoginChannelId } from "../../src/shared/domain.ts";

const loginChannelId = Schema.decodeUnknownSync(LineLoginChannelId)("2001043291");
const liffId = Schema.decodeUnknownSync(LineLiffId)("2001043291-AbCdEf12");
const liffUid = Schema.decodeUnknownSync(LineLiffUid)("liff-record-1");

const makeRepository = (captured: {
  create?: CreateLiffAppRecordInput;
  update?: UpdateLiffAppRecordInput;
}): LineLiffRepositoryService =>
  ({
    createLiffApp: (input: CreateLiffAppRecordInput) =>
      Effect.sync(() => {
        captured.create = input;
        return {
          id: liffUid,
          loginChannelId: input.loginChannelId,
          liffId: input.liffId,
          view: input.view,
          additionalUrlParameters: input.additionalUrlParameters,
          description: input.description,
          createdAt: new Date("2026-07-23T00:00:00.000Z"),
          updatedAt: new Date("2026-07-23T00:00:00.000Z"),
        } as any;
      }),
    updateLiffApp: (_id: LineLiffId, input: UpdateLiffAppRecordInput) =>
      Effect.sync(() => {
        captured.update = input;
        return {
          id: liffUid,
          loginChannelId,
          liffId,
          view: { type: "tall", url: "https://example.com/liff" },
          additionalUrlParameters: input.additionalUrlParameters ?? "campaign=old",
          createdAt: new Date("2026-07-23T00:00:00.000Z"),
          updatedAt: new Date("2026-07-23T00:00:00.000Z"),
        } as any;
      }),
    findLiffAppByLiffId: () => Effect.die("unused"),
    listLiffAppsByChannel: () => Effect.die("unused"),
    deleteLiffApp: () => Effect.die("unused"),
  }) as LineLiffRepositoryService;

const run = <A, E>(
  effect: Effect.Effect<A, E, LineLiffManagement>,
  repository: LineLiffRepositoryService,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        LineLiffManagement.layer.pipe(
          Layer.provide(Layer.succeed(LineLiffRepository)(repository)),
          Layer.provide(
            Layer.succeed(LineLoginChannelRepository)({
              findByLineChannelId: () => Effect.succeed(Option.some({ channelId: loginChannelId })),
            } as any),
          ),
          Layer.provide(Layer.succeed(LineProviderRepository)({} as any)),
          Layer.provide(
            Layer.succeed(LineClientRegistry)({
              invalidateLiff: () => Effect.void,
            } as any),
          ),
        ),
      ),
    ),
  );

describe("LineLiffManagement additional URL parameters", () => {
  test("maps legacy repository records without parameters to an empty public value", () => {
    const view = toLiffAppView({
      id: liffUid,
      loginChannelId,
      liffId,
      view: { type: "tall", url: "https://example.com/liff" },
      createdAt: new Date("2026-07-23T00:00:00.000Z"),
      updatedAt: new Date("2026-07-23T00:00:00.000Z"),
    } as any);

    expect(view.additionalUrlParameters).toBe("");
  });

  test("defaults omitted create parameters to an empty canonical value", async () => {
    const captured: { create?: CreateLiffAppRecordInput } = {};

    const view = await run(
      Effect.flatMap(LineLiffManagement, (management) =>
        management.createLiffApp({
          loginChannelId,
          liffId,
          view: { type: "tall", url: "https://example.com/liff" },
        }),
      ),
      makeRepository(captured),
    );

    expect(captured.create?.additionalUrlParameters).toBe("");
    expect(view.additionalUrlParameters).toBe("");
  });

  test("canonicalizes provided update parameters before persistence", async () => {
    const captured: { update?: UpdateLiffAppRecordInput } = {};

    const view = await run(
      Effect.flatMap(LineLiffManagement, (management) =>
        management.updateLiffApp(liffId, {
          additionalUrlParameters: "  &&campaign=spring&source=poster  ",
        }),
      ),
      makeRepository(captured),
    );

    expect(captured.update?.additionalUrlParameters).toBe("campaign=spring&source=poster");
    expect(view.additionalUrlParameters).toBe("campaign=spring&source=poster");
  });
});
