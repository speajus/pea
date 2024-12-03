import { keyOf } from "./util";
import { has, isConstructor, isFn, isPrimitive, PeaError } from "./guards";
import { newProxy, proxyKey } from "./newProxy";
import type { Registry } from "./registry";
import { serviceSymbol } from "./symbols";
import type { CKey, Constructor, Fn, OfA, PeaKey, RegistryType, ValueOf } from "./types";

const EMPTY = [] as const;
type EmptyTuple = typeof EMPTY;

type Args<T> = T extends Constructor
  ? ConstructorParameters<T>
  : T extends Fn
  ? Parameters<T>
  : EmptyTuple;
type Returns<T> = T extends Constructor
  ? InstanceType<T>
  : T extends Fn
  ? ReturnType<T>
  : T;

export class ServiceDescriptor<
  TRegistry extends RegistryType,
  T extends Constructor | Fn | unknown,
> {
  static #dependencies = new Set<CKey>();

  static value<
    T extends keyof TRegistry & symbol,
    TRegistry extends RegistryType = Registry,
  >(key: T, service: TRegistry[T]) {
    return new ServiceDescriptor(key, service, EMPTY as any, false, false);
  }

  static singleton<T extends Constructor | Fn>(service: T, ...args: Args<T>) {
    return new ServiceDescriptor(service, service, args);
  }

  static factory<T extends Constructor | Fn>(service: T, ...args: Args<T>) {
    return new ServiceDescriptor(service, service, args, false);
  }

  readonly [serviceSymbol]: PeaKey<TRegistry>;
  dependencies?: Set<CKey>;
  private _instance?: Returns<T>;
  public invoked = false;
  private _cacheable = true;
  private _service?: OfA<T>;
  private _args: Args<T> = [] as any;
  private _proxy?: Returns<T>;
  private _factory = false;
  public primitive?: boolean;
  public invalid = false;
  public optional = true;

  constructor(
    key: PeaKey<TRegistry>,
    service: T | undefined = undefined,
    args: Args<T> = [] as any,
    cacheable = true,
    public invokable = true,
  ) {
    this[serviceSymbol] = key;
    this.args = args as Args<T>;
    this._cacheable = cacheable;
    if (!invokable) {
      //So if something is not invokable, it should never be invoked. Which is important.
      this.invoked = false;
    }
    this.service = service;
  }

  get proxy(): Returns<T> {
    const key = keyOf(this[serviceSymbol]);
    ServiceDescriptor.#dependencies.add(key);
    return (this._proxy ??= newProxy(key, this));
  }

  set cacheable(_cacheable: boolean) {
    if (this._cacheable === _cacheable) {
      return;
    }
    this.invalidate();
    this._cacheable = _cacheable;
  }

  get cacheable() {
    return this._cacheable;
  }

  set service(_service: OfA<T> | undefined) {
    if (this._service === _service) {
      return;
    }
    if (this.invoked) {
      this.invalid = true;
    }
    this.invalidate();
    this.invokable = isFn(_service);
    this._service = _service;
    this._factory = this.invokable && !isConstructor(_service as Fn<T>);
  }

  get service() {
    return this._service as OfA<T>;
  }

  get args() {
    return this._args!;
  }

  set args(newArgs: Args<T>) {
    /**
     * If the args are the same, we don't need to invalidate.  Also
     * if the value hasn't been invoked, we don't need to invalidate.
     */
    //if (newArgs === this._args || (this._args?.length === newArgs.length &&
    // this._args.every((v, i) => v === newArgs[i] && !isPea(v)))) {
    // return;
    //}
    if (this.invoked) {
      this.invalid = true;
    }
    this.invalidate();
    newArgs.forEach((arg) => {
      if (has(arg, proxyKey)) {
        this.addDependency(arg[proxyKey] as CKey);
      }
    });
    this._args = newArgs;
  }
  withArgs(...args: Args<T>) {
    this.args = args;
    return this;
  }
  withService(service: T) {
    this.service = service;
    return this;
  }
  withCacheable(cacheable?: boolean) {
    this.cacheable = cacheable ?? !this.cacheable;
    return this;
  }
  withInvokable(invokable?: boolean) {
    this.invokable = invokable ?? !this.invokable;
    return this;
  }
  withOptional(optional?: boolean) {
    this.optional = optional ?? !this.optional;
    return this;
  }
  withValue(value: ValueOf<TRegistry, T>) {
    this.service = value;
    this.invokable = false;
    this.invalidate();
    return this;
  }
  hasDependency(key: CKey) {
    return this.dependencies?.has(key) ?? false;
  }

  addDependency(...keys: CKey[]) {
    if (keys.length) {
      const set = (this.dependencies ??= new Set<CKey>());
      keys.forEach((v) => set.add(v));
    }
    return this;
  }

  invalidate() {
    if (this.invoked === false) {
      return;
    }
    this.invoked = false;
    this._instance = undefined;
  }

  invoke = (): Returns<T> => {
    if (!this.invokable) {
      return this.service as Returns<T>;
    }
    if (!this.invalid && this.invoked && this.cacheable) {
      return this._instance as Returns<T>;
    }
    if (!isFn(this.service)) {
      throw new PeaError(
        `service '${String(this.service)}' is not a function and is not configured as a value, to configure as a value set invokable to false on the service description`,
      );
    }
    ServiceDescriptor.#dependencies.clear();
    const resp = this._factory
      ? this.service(...this.args)
      : new (this.service as any)(...this.args);
    this.addDependency(...ServiceDescriptor.#dependencies);
    this.invoked = true;
    this.primitive = isPrimitive(resp);
    if (resp == null && !this.optional) {
      throw new PeaError(
        `service '${String(this[serviceSymbol])}' is not optional and returned null`,
      );
    }
    if (this.cacheable) {
      return (this._instance = resp);
    }

    return resp;
  };
}
