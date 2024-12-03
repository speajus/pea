import { nullableSymbol, PeaError } from "./guards";
import { ServiceDescriptor } from "./ServiceDescriptor";
import type { Constructor } from "./types";

export const proxyKey = Symbol("@pea/proxy-key");

export function newProxy<T extends Constructor>(
  key: unknown,
  service: ServiceDescriptor<any, any>,
) {
  return new Proxy({} as InstanceType<T>, {
    get(_target, prop) {
      if (prop === proxyKey) {
        return key;
      }
      const val = service.invoke();
      if (prop === nullableSymbol) {
        return val == null;
      }
      if (val == null) {
        if (prop === 'toString') {
          return () => val + '';
        }
        return null;
      }

      //So sometimes a factory value returns a primitive, this handles that.
      if (service.primitive) {
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

      return typeof (val as any)[prop] === "function"
        ? (val as any)[prop].bind(val)
        : (val as any)[prop];
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(service.invoke(), prop);
    },
    set(_target, prop, value) {
      service.invoke()[prop] = value;
      return true;
    },
    ownKeys() {
      const value = service.invoke();
      if (service.primitive) {
        return [];
      }
      const keys = Reflect.ownKeys(value);
      return keys;
    },
    has(_target, prop) {
      const val = service.invoke();
      if (service.primitive) {
        return false;
      }
      return prop in val;
    },
    getPrototypeOf() {
      return Object.getPrototypeOf(service.invoke());
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
