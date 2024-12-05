import { type Registry } from "./registry";
import { isConstructor, isFn, isSymbol, PeaError } from "./guards";
import type {
  Constructor,
  ValueOf,
  Fn,
  VisitFn,
  PeaKey,
  CKey,
  RegistryType,
  ServiceArgs,
  PeaKeyType,
} from "./types";
import { ServiceDescriptor } from "./ServiceDescriptor";
import { filterMap, isInherited, keyOf } from "./util";
import { peaKey, isPeaKey } from "./symbols";

export interface Context<TRegistry extends RegistryType = Registry> {
  register<TKey extends PeaKey<TRegistry>>(
    tkey: TKey,
    ...args: ServiceArgs<TKey, TRegistry> | []
  ): ServiceDescriptor<TRegistry, ValueOf<TRegistry, TKey>>;
  resolve<TKey extends PeaKey<TRegistry>>(
    tkey: TKey,
    ...args: ServiceArgs<TKey, TRegistry> | []
  ): ValueOf<TRegistry, TKey>;
  newContext<TTRegistry extends TRegistry = TRegistry>(): Context<TTRegistry>;
  pea<T extends PeaKey<TRegistry>>(service: T): ValueOf<TRegistry, T>;
  pea(service: unknown): unknown;
  visit(fn: VisitFn<TRegistry, any>): void;
  visit<T extends PeaKey<TRegistry>>(
    service: T,
    fn: VisitFn<TRegistry, T>,
  ): void;
}
export class Context<TRegistry extends RegistryType = Registry>
  implements Context<TRegistry> {
  //this thing is used to keep track of dependencies.
  protected map = new Map<CKey, ServiceDescriptor<TRegistry, any>>();
  constructor(private readonly parent?: Context<any>) { }
  pea<T extends PeaKey<TRegistry>>(service: T): ValueOf<TRegistry, T>;
  pea(service: unknown): unknown {
    return (this.get(keyOf(service as any)) ?? this.register(service as any))
      .proxy;
  }

  /**
   * Starting at a service, apply a function to all dependencies.  This is
   * useful if you want to destroy all dependencies.   This also could be
   * used for trigger init methods.  It will only visit each dependency once.
   *
   *
   * ```typescript
   *   context.visit(EmailService, (v)=>{
   *     v.destroy?.();
   *     return removeSymbol;
   *   });
   *
   * ```
   *
   * @param service
   * @param fn
   */
  visit(fn: VisitFn<TRegistry, any>): void;
  visit<T extends PeaKey<TRegistry>>(
    service: T,
    fn: VisitFn<TRegistry, T>,
  ): void;
  visit<T extends PeaKey<TRegistry>>(
    service: T | VisitFn<TRegistry, any>,
    fn?: VisitFn<TRegistry, T> | undefined,
  ) {
    const key = keyOf(service);
    if (isFn(fn)) {
      this._visit(key, fn as any);
    } else if (isFn(service)) {
      for (const key of this.map.keys()) {
        this._visit(key, service as VisitFn<TRegistry, any>);
      }
    } else {
      throw new PeaError("invalid arguments");
    }
  }

  private _visit(
    service: CKey,
    fn: VisitFn<TRegistry, any>,
    seen = new Set<CKey>(),
  ) {
    if (seen.size === seen.add(service).size) {
      return;
    }
    const ctx = this.get(service);
    if (ctx) {
      if (ctx.dependencies?.size) {
        for (const dep of ctx.dependencies) {
          this._visit(dep, fn, seen);
        }
      }
      fn(ctx);
    }
  }

  protected get(key: CKey): ServiceDescriptor<TRegistry, any> | undefined {
    return this.map.get(key) ?? this.parent?.get(key);
  }

  protected has(key: CKey): boolean {
    return this.map.has(key) ?? this.parent?.has(key) ?? false;
  }

  protected set(key: CKey, value: ServiceDescriptor<TRegistry, any>) {
    this.map.set(key, value);
  }

  private invalidate(
    key: CKey,
    ctx?: ServiceDescriptor<TRegistry, any>,
    seen = new Set<CKey>(),
  ) {
    if (seen.size === seen.add(key).size) {
      return;
    }
    ctx = ctx ?? this.map.get(key);

    if (!ctx) {
      //I don't  think this should happen, but what do I know.
      console.warn(`invalidate called on unknown key ${String(key)}`);
      return;
    }
    ctx.invalidate();

    for (const [k, v] of this.map) {
      if (v.hasDependency(key)) {
        this.invalidate(k, v, seen);
      }
    }
  }
  register<TKey extends PeaKey<TRegistry>>(
    tkey: TKey,
    ...origArgs: ServiceArgs<TKey, TRegistry> | []
  ): ServiceDescriptor<TRegistry, ValueOf<TRegistry, TKey>> {
    const key = keyOf(tkey);

    let serv: Constructor | Fn | unknown = tkey;
    let args: any[] = [...origArgs];

    if (isSymbol(tkey)) {
      serv = args.shift();
    }

    let inst = this.map.get(key);

    if (inst) {
      if (origArgs?.length) {
        inst.args = args;
        inst.service = serv;
      }
      if (inst.invalid) {
        this.invalidate(key);
      }
      return inst;
    }
    this.map.set(
      key,
      (inst = new ServiceDescriptor<TRegistry, ValueOf<TRegistry, TKey>>(
        tkey,
        serv as any,
        args as any,
        true,
        isFn(serv),
      )),
    );
    return inst;
  }

  resolve<TKey extends PeaKey<TRegistry>>(
    tkey: TKey,
    ...args: ServiceArgs<TKey, TRegistry> | []
  ): ValueOf<TRegistry, TKey> {
    return this.register(tkey, ...args).invoke() as any;
  }

  newContext<TTRegistry extends TRegistry = TRegistry>() {
    return new Context<TTRegistry>(this);
  }
  scoped<R, TKey extends PeaKeyType | (keyof TRegistry & symbol)>(
    _key: TKey,
  ): (next: () => R, ...args: ServiceArgs<TKey, TRegistry>) => R {
    throw new PeaError(
      "async not enabled, please add 'import \"@speajus/pea/async\";' to your module to enable async support",
    );
  }
  protected *_listOf<T extends PeaKey<TRegistry>>(
    service: T,
  ): Generator<ValueOf<TRegistry, T>> {
    const sym = isPeaKey(service);

    if (sym) {
      yield* filterMap(this.map.values(), (v) =>
        v.tags.includes(service as any) ? v.proxy : undefined,
      );
    } else if (isFn(service)) {
      if (isConstructor(service)) {
        yield* filterMap(this.map.values(), (v) =>
          isInherited(v.service, service) ? v.proxy : undefined,
        );
      } else {
        yield* filterMap(this.map.values(), (v) =>
          v.service && v.service === service ? v.proxy : undefined,
        );
      }
    }
    if (this.parent) yield* this.parent._listOf(service);
  }

  /**
   * Tries to find all instances of a service.  This is useful if you want to find all instances of a service. Or a tag
   * of service.   tags should be PeaKeyType that are used to tag services.  Note this returns a proxy.  So it should
   * recall if a dependent value changes.
   *
   * The performance currently should be not great, but all we really need is a mechanism to only invalidate the list 
   * when a dependency changes.  This is a future optimization.  That should make it very fast.   So far I have been
   * hesitant to add 'events' to the system, however this is a good way to do it.
   * 
   * 
   *
   * @param service
   * @returns
   */
  listOf<T extends PeaKey<TRegistry>>(
    service: T,
  ): Array<ValueOf<TRegistry, T>> {
    return this.register(isPeaKey(service) ? service : peaKey(String(service)), () =>
      Array.from(this._listOf(service)),
    ).withCacheable(false).proxy as any;
  }
}

export function createNewContext<TRegistry extends RegistryType>() {
  return new Context<TRegistry>();
}

export const context = createNewContext<Registry>();

export const pea = context.pea.bind(context);
