import { PeaError } from "./guards";
import type { Constructor } from "./types";

export const proxyKey = Symbol("proxy-key");

export function newProxy<T extends Constructor>(
  key: unknown,
  instance: () => InstanceType<T>,
) {
  return new Proxy({} as InstanceType<T>, {
    get(_target, prop) {
      if (prop === proxyKey) {
        return key;
      }
      const val: unknown = proxyable(instance());
      //So sometimes a factory value returns a primitive, this handles that.
      if (
        val instanceof Number ||
        val instanceof String ||
        val instanceof Boolean
      ) {
        const prim = val;
        if (
          prop === Symbol.toPrimitive ||
          prop === Symbol.toStringTag ||
          prop === "$$typeof"
        ) {
          return (prim as any)[prop];
        }
        const value = (prim as any)[prop as any];
        return value == null
          ? prim
          : typeof value === "function"
            ? value.bind(prim)
            : value;
      }
      return (val as any)[prop];
    },
    set(_target, prop, value) {
      instance()[prop] = value;
      return true;
    },
    ownKeys: () => {
      return Object.keys(instance());
    },
    getPrototypeOf: () => {
      const v = instance();
      const proto = Object.getPrototypeOf(v);
      return proto;
    },
  });
}
const proxyable = (value: any) => {
  switch (typeof value) {
    case "string":
      return new String(value);
    case "number":
      return new Number(value);
    case "boolean":
      return new Boolean(value);
    case "symbol":
      throw new PeaError(`symbol not supported`);
    case "bigint":
      throw new PeaError(`bigint not supported`);
    default:
      return value;
  }
};
