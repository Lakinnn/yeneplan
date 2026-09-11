import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function unauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("planner security", () => {
  it("blocks dashboard reads without a signed-in user", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.dashboard.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks coach requests without a signed-in user", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.coach.chat({ message: "Tell me what to do" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
