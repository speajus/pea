import { it, describe, expect } from "vitest";
import { peaKey } from "../symbols";
import { ServiceDescriptor } from "../ServiceDescriptor";
describe("ServiceDescription", () => {
  describe("ServiceDescription#name", () => {
    it("should name it with peakey", () => {
      const myKey = peaKey<string>("my-cool-key");
      expect(new ServiceDescriptor(myKey).name).toEqual("my-cool-key");
    });
    it("should name it with Constructor", () => {
      expect(new ServiceDescriptor(class A {}).name).toEqual("A");
    });
    it("should return anonymous", () => {
      expect(new ServiceDescriptor(() => "what").name).toEqual("<anonymous>");
    });
    it("should use function name", () => {
      const myFunc = () => "w";
      expect(new ServiceDescriptor(myFunc).name).toEqual("myFunc");
    });
    it("should use symbol description", () => {
      const desc = Symbol("my-sym");
      expect(new ServiceDescriptor(desc).name).toEqual("my-sym");
    });
  });
});
