import type { Primitive, CtxValue, Constructor, RegistryType } from "./types";

export function newProxy<T extends Constructor>(
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
      const v = instance();
      const proto = Object.getPrototypeOf(v);
      return proto;
    },
  });

}
const proxyable = (value: any) => {
  switch (typeof value) {
    case 'string': return new String(value);
    case 'number': return new Number(value);
    case 'boolean': return new Boolean(value);
    case 'symbol': throw new Error(`symbol not supported`);
    case 'bigint': throw new Error(`bigint not supported`);
    default:
      throw new Error(`unknown type ${typeof value}`);
  }
}

export function createPrimitiveProxy<TRegistry extends RegistryType>(ctx: CtxValue<TRegistry, Primitive>) {

  return new Proxy(proxyable(ctx.instance), {
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
      const prim = ctx.instance as any;
      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag || prop === '$$typeof') {
        return prim[prop];
      }
      const value = prim[prop as any];
      return value == null ? prim : typeof value === 'function' ? value.bind(prim) : value;
    },
    ownKeys() {
      const ret = Object.getOwnPropertyNames(proxyable(ctx.instance));
      return ret;
    },
    // set(target, prop, value) {
    //   target.value = value;
    //   return true;
    // }
  });
}

