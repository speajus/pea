import { AsyncLocalStorage } from "node:async_hooks";
import { has, hasA, isFn, isSymbol, PeaError } from "./guards";
import { Context } from "./context";
import { ServiceDescriptor } from "./ServiceDescriptor";
import { keyOf } from "./util";
import { PeaKey } from "./types";

//borrowed from https://eytanmanor.medium.com/should-you-use-asynclocalstorage-2063854356bb
const asyncLocalStorage = new AsyncLocalStorage<
  Map<PeaKey<any>, ServiceDescriptor<any, any>>
>();
const serviceProxySymbol = Symbol("@pea/ServiceDescriptorProxy");

/**
 * Scoping allows for a variable to be scoped to a specific context.  This is
 * useful for things like database connections, or other resources that need to be
 * scoped to a specific context.   Note the requirement to use either a `Registry` key or
 * a `peaKey`.
 *
 * @param key - pkey or registry key
 * @returns
 */
const scoped: Context["scoped"] = function (this: Context, key) {
  const serviceDesc = this.register(key);
  if (
    hasA(serviceDesc, serviceProxySymbol, isSymbol) &&
    serviceDesc[serviceProxySymbol] !== (keyOf(key) as any)
  ) {
    throw new PeaError(
      `key ${String(key)} already registered as '${String(serviceDesc[serviceProxySymbol])}', can not register a key into more than one scope`,
    );
  }
  if (has(serviceDesc.invoke, asyncLocalSymbol)) {
    throw new PeaError(
      `key ${String(key)} already registered as async scoped, can not register a key into more than one scope`,
    );
  }
  serviceDesc.invoke = () => getServiceDescription(key).invoke();
  //@ts-expect-error - this allows to check if the invoke function is async scoped.
  serviceDesc.invoke[asyncLocalSymbol] = key;

  return (next: () => void, ...[service, ...args]) => {
    const map = asyncLocalStorage.getStore() ?? new Map();
    if (!map.has(key)) {
      map.set(
        key,
        new ServiceDescriptor(
          key,
          service,
          args as any,
          false,
          isFn(service),
          `async scoped pea '${String(key)}'`,
        ),
      );
    }
    return asyncLocalStorage.run(map, next) as any;
  };
};

function getServiceDescription(key: PeaKey<any>): ServiceDescriptor<any, any> {
  const serviceDesc = asyncLocalStorage.getStore()?.get(key);
  if (!serviceDesc) {
    throw new PeaError(
      `key ${String(key)} not found in async storage, make sure the callback has been handled.`,
    );
  }
  return serviceDesc;
}
Context.prototype.scoped = scoped;

const asyncLocalSymbol = Symbol();
