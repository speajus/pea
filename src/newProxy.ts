import { PeaError } from "./guards";
import type { Constructor } from "./types";

export const proxyKey = Symbol("@@proxy-key");

export function newProxy<T extends Constructor>(
  key: unknown,
  instance: () => InstanceType<T>,
) {
  return new Proxy({} as InstanceType<T>, {
    get(_target, prop) {
      if (prop === proxyKey) {
        return key;
      }
      const [isPrim, val] = proxyable(instance());
      //So sometimes a factory value returns a primitive, this handles that.
      if (isPrim) {
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
      return val == null ? val
        : typeof (val as any)[prop] === "function"
          ? (val as any)[prop].bind(val)
          : (val as any)[prop];
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
      return [true, new String(value)] as const;
    case "number":
      return [true, new Number(value)] as const;
    case "boolean":
      return [true, new Boolean(value)] as const;
    case "symbol":
      throw new PeaError(`symbol not supported`);
    case "bigint":
      throw new PeaError(`bigint not supported`);
    default:
      return [false, value] as const;
  }
};
