import { AsyncLocalStorage } from "node:async_hooks";
import { hasA, isFn, isSymbol, PeaError } from "./guards";
import { Context as ContextImpl, keyOf } from "./context";
import type { PeaKeyType, RegistryType, ServiceArgs } from "./types";
import type { Registry } from "./registry";
import { ServiceDescriptor } from "./ServiceDescriptor";

//borrowed from https://eytanmanor.medium.com/should-you-use-asynclocalstorage-2063854356bb
const asyncLocalStorage = new AsyncLocalStorage<AsyncScope>();

export interface AsyncScope {
  [key: symbol]: unknown;
}

export class AsyncScope {
  static get() {
    const scope = asyncLocalStorage.getStore();
    if (!scope) {
      throw new PeaError("Scope not found");
    }

    return scope;
  }

  constructor(callback: () => void) {
    const parentScope = asyncLocalStorage.getStore();
    if (parentScope) {
      Object.setPrototypeOf(this, parentScope);
    }

    asyncLocalStorage.run(this, callback);
  }
}

export class AsyncVar<T> {
  constructor(private readonly symbol: symbol) { }

  set(value: T) {
    const scope = AsyncScope.get();

    scope[this.symbol] = value;
  }

  get() {
    if (!this.exists()) {
      throw new PeaError(`Varialble "${String(this.symbol)}" not found`);
    }

    const scope = AsyncScope.get();

    return scope[this.symbol] as T;
  }

  exists() {
    const scope = AsyncScope.get();

    return this.symbol in scope;
  }
}


/**
* Scoping allows for a variable to be scoped to a specific context.  This is
* useful for things like database connections, or other resources that need to be
* scoped to a specific context.   Note the requirement to use either a `Registry` key or
* a `peaKey`.
*
* @param key - pkey or registry key
* @returns
*/
const scoped = function <T extends RegistryType = Registry>(this: ContextImpl<T>, ...[key]: Parameters<ContextImpl<T>["scoped"]>) {
  const localStorage = new AsyncVar<ServiceDescriptor<any, any>>(key);
  const ckey = keyOf(key);
  const serviceDesc = this.get(ckey);
  if (hasA(serviceDesc, serviceProxySymbol, isSymbol) && serviceDesc[serviceProxySymbol] !== ckey as any) {
    throw new PeaError(
      `key ${String(key)} already registered as '${String(serviceDesc[serviceProxySymbol])}', can not register a key into more than one scope`,
    );
  }
  this.map.set(
    ckey,
    new Proxy(serviceDesc ?? new ServiceDescriptor(key), {
      get(target, prop) {
        if (prop === serviceProxySymbol) {
          return ckey;
        }
        if (prop === "invoke") {
          return () => {
            if (!localStorage.exists()) {
              throw new PeaError(
                `scope ${String(key)} not found accessing '${prop}'}`,
              );
            }
            return localStorage.get().invoke();
          };
        }
        return Reflect.get(target, prop);
      },
      set(target, prop, value) {
        if (prop === "proxy") {
          return Reflect.set(target, prop, value);
        }
        if (!localStorage.exists()) {
          throw new PeaError(
            `scope ${String(key)} not found setting '${String(prop)}'`,
          );
        }

        return Reflect.set(localStorage.get(), prop, value);
      },
    }),
  );

  return (...[service, ...args]: any[]) => {
    new AsyncScope(() => {
      localStorage.set(
        new ServiceDescriptor<any, any>(
          key,
          service,
          args as any,
          false,
          isFn(service),
        ),
      );
    });
  };
}
ContextImpl.prototype.scoped = scoped as any;
const serviceProxySymbol = Symbol("@pea/ServiceDescriptorProxy");