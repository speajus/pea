import { it, describe, expect } from "vitest";
import { MetricsConfig } from "../MetricsConfig";
import { register, registerKey } from "../pea";
import { createNewContext } from "@speajus/pea";

describe("metrics", () => {
  it("config", () => {
    const metricConfig = new MetricsConfig("9090");
    expect(metricConfig.port).toBe(9090);
  });
  it('should boot', async () => {
    const ctx = createNewContext();
    register(ctx);
    const registry = ctx.resolve(registerKey);
    expect(await registry.metrics()).toMatch(/pea_up/);
  })
});
