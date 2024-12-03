
import { it, describe, expect } from "vitest";
import { ExpressAuthConfigClass } from "../auth.config";
import { context } from "@speajus/pea/context";

describe("auth config", () => {
    it("should work", async () => {
        const config = context.resolve(ExpressAuthConfigClass);
        expect(config).toBeInstanceOf(ExpressAuthConfigClass);
        const result = await config.adapter.createUser!({ id: "1", name: "John", email: `john${Date.now()}@example.com`, "emailVerified": new Date() });
        expect(result.name).toBe("John");

    });
});