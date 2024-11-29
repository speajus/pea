import { AsyncLocalStorage } from "node:async_hooks";
import { PeaError } from "./guards";
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
  constructor(private readonly symbol: symbol) {}

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
