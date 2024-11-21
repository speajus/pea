import { isPrimitiveType } from "./guards";
import type { Primitive, PrimitiveType, Class, CtxValue } from "./types";

export function newProxy<T extends Class>(
  instance: () => InstanceType<T>
) {
  return new Proxy({} as InstanceType<T>, {
    get(_target, prop) {
      return instance()[prop];
    },
    set(_target, prop, value) {
      instance()[prop] = value;
      return true;
    },
    ownKeys: () => {
      return Object.keys(instance());
    },
    getPrototypeOf: () => {
      return Object.getPrototypeOf(instance());
    },
  });

}


export function createPrimitiveProxy(ctx: CtxValue<Primitive>) {
  return new Proxy(ctx, {
    getPrototypeOf() {
      switch (typeof ctx.instance) {
        case 'string':
          return String.prototype;
        case 'number':
          return Number.prototype;
        case 'boolean':
          return Boolean.prototype;
        case 'symbol':
          return Symbol.prototype;
        case 'bigint':
          return BigInt.prototype;
      }
      return Object.getPrototypeOf(ctx.instance);
    },
    get(target, prop) {
      const prim = Reflect.get(target, 'instance');
      const value = prim[prop];
      return typeof value === 'function' ? value.bind(prim) : value;
    },
    // set(target, prop, value) {
    //   target.value = value;
    //   return true;
    // }
  });
}

