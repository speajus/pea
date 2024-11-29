import { describe, it, expect } from "vitest";
import { context, pea, peaKey } from "../index";
import '../async';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
describe("scope", () => {
  it("should maintain separate values across async operations", async () => {
    const scopedKey = peaKey<string>("async-scoped-value");

    class ScopedValue {
      constructor(public value: string = pea(scopedKey)) { }
    }
    const sv = pea(ScopedValue);
    const scopeHandler = context.scoped(scopedKey);

    // Create a promise that resolves after all async operations complete
    const results: string[] = [];

    await Promise.all([
      // First async operation
      async () => {
        scopeHandler("value1");
        expect(sv.value == "value1").toBe(true);
        await wait(100);
        expect(sv.value == "value1").toBe(true);
      },
      async () => {
        scopeHandler("value2");
        expect(sv.value == "value2").toBe(true);
        await wait(100);
        expect(sv.value == "value2").toBe(true);
      },
    ]);

    // Verify that accessing outside of any scope throws an error
    expect(() => context.resolve(scopedKey)).toThrow();
  });
});
