import { keyOf } from "./util";
import {
  has,
  isConstructor,
  isFn,
  isPrimitive,
  isSymbol,
  PeaError,
} from "./guards";
import { newProxy, proxyKey } from "./newProxy";
import type { Registry } from "./registry";
import { isPeaKey, peaKeyName, serviceSymbol } from "./symbols";
import type {
  CKey,
  Constructor,
  Fn,
  OfA,
  PeaKey,
  PeaKeyType,
  RegistryType,
  ValueOf,
} from "./types";

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

  public readonly [serviceSymbol]: PeaKey<TRegistry>;
  dependencies?: Set<CKey>;
  private _instance?: Returns<T>;
  public invoked = false;
  private _cacheable = true;
  private _service?: OfA<T>;
  private _args: Args<T> = [] as any;
  private _proxy?: Returns<T>;
  private _factory = false;
  private interceptors?: InterceptFn<Returns<T>>[];
  public primitive?: boolean;
  public invalid = false;
  public optional = true;
  public tags: PeaKeyType<T>[] = [];
  private _name: string | undefined;
  constructor(
    key: PeaKey<TRegistry>,
    service: T | undefined = undefined,
    args: Args<T> = [] as any,
    cacheable = true,
    public invokable = true,
    public description?: string,
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

  get name() {
    if (this._name) return this._name;

    if (isSymbol(this[serviceSymbol])) {
      this._name = isPeaKey(this[serviceSymbol])
        ? peaKeyName(this[serviceSymbol])
        : this[serviceSymbol].description;
    } else if (isFn(this[serviceSymbol])) {
      if (this[serviceSymbol].name) {
        this._name = this[serviceSymbol].name;
      }
    }
    return this._name || "<anonymous>";
  }

  set name(name: string | undefined) {
    this._name = name;
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
  /**
   * Set the args to be used with the service.   These can be other peas, or any other value.
   * @param args
   * @returns
   */
  withArgs(...args: Args<T>) {
    this.args = args;
    this.invalidate();
    return this;
  }
  /**
   * Change the service implementation.
   * @param service
   * @returns
   */
  withService(service: T) {
    this.service = service;
    this.invalidate();
    return this;
  }
  /**
   * You can turn off response caching by setting this to false.
   * This is useful for things taht can not be cached.   Any pea depending on a non-cacheable,
   * will be not cached.
   *
   * @param cacheable
   * @returns
   */
  withCacheable(cacheable?: boolean) {
    this.cacheable = cacheable ?? !this.cacheable;
    this.invalidate();
    return this;
  }
  withInvokable(invokable?: boolean) {
    this.invokable = invokable ?? !this.invokable;
    this.invalidate();
    return this;
  }
  /**
   * Sets the service as optional.
   * This will not throw an error if the service is not found. The proxy however
   * will continue to exist, just any access to it will return undefined.
   *
   * You can use `isNullish` from the guards to check if the service if a proxy is actually
   * nullish.
   *
   * @param optional
   * @returns
   */
  withOptional(optional?: boolean) {
    this.optional = optional ?? !this.optional;
    this.invalidate();
    return this;
  }
  /**
   * This is used to set a value.  This is useful for things like constants.  This will not be invoked.
   * @param value
   * @returns
   */
  withValue(value: ValueOf<TRegistry, T>) {
    this.service = value;
    this.invokable = false;
    this.invalidate();
    return this;
  }
  /**
   * Tags are used to group services.  This is useful for finding all services of a certain type.
   * @param tags
   * @returns
   */
  withTags(...tags: PeaKeyType<any>[]) {
    this.tags = tags;
    return this;
  }
  /**
   * A description of the service.  This is useful for debugging.
   * @param description
   * @returns
   */
  withDescription(description: string) {
    this.description = description;
    return this;
  }
  /**
   * Interceptors allow you to intercept the invocation of a service.  This is useful for things like logging, or
   * metrics.
   * @param interceptors
   * @returns
   */
  withInterceptors(...interceptors: InterceptFn<Returns<T>>[]) {
    this.interceptors = [...(this.interceptors ?? []), ...interceptors];
    return this;
  }
  withName(name: string) {
    this._name = name;
    return this;
  }
  /**
   * Check to see if the current service has a dependency.
   * @param key
   * @returns
   */
  hasDependency(key: CKey) {
    return this.dependencies?.has(key) ?? false;
  }
  /**
   * Add a dependency to the service.  This is used to track dependencies.
   * @param keys
   * @returns
   */
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
    this.invalid = true;
    this.invoked = false;
    this._instance = undefined;
  }
  /**
   * Invokes the service and returns the value.  This is where the main resolution happens.
   *
   * @returns
   */
  invoke = (): Returns<T> => {
    if (this.interceptors?.length) {
      const invoke = this.interceptors?.reduceRight(
        (next: () => Returns<T>, interceptor) => {
          return () => interceptor.call(this, next);
        },
        this._invoke,
      );
      return invoke.call(this);
    }
    return this._invoke();
  };

  _invoke = (): Returns<T> => {
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
/**
 * The interceptor function, allows you to intercept the invocation of a service.  The
 * invocation may be a previous intercpetor.
 */
type InterceptFn<T> = (invoke: () => T) => T;

export type ServiceDescriptorListener = (
  ...args: ServiceDescriptor<any, any>[]
) => void;
