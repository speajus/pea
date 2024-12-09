import { it, describe, expect } from "vitest";
import { MetricsConfig } from "../MetricsConfig";

describe("metrics", () => {
  it("config", () => {
    const metricConfig = new MetricsConfig("9090");
    expect(metricConfig.port).toBe(9090);
  });
});
