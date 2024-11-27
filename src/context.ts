import { newProxy, proxyKey } from "./newProxy";
import { Registry } from "./registry";
import { destroySymbol, removeSymbol, serviceSymbol } from "./symbols";
import {
    hasA,
    isConstructor,
    isFn,
    isObjectish,
    isPrimitive,
    isSymbol,
    PeaError,
} from "./guards";
import type {
    Service,
    Constructor,
    CtxClass,
    CtxFn,
    ValueOf,
    Fn,
    Primitive,
    PrimitiveType,
    PrimitiveValue,
    VisitFn,
    PeaKey,
    Ctx,
    CKey,
    RegistryType,
} from "./types";

export type ContextType = InstanceType<typeof Context>;

class Context<TRegistry extends RegistryType = Registry> {
    //this thing is used to keep track of dependencies.
    #dependencies = new Set<CKey>();
    #map = new Map<CKey, Ctx<TRegistry, any>>();
    constructor(private readonly parent?: Context<any>) { }
    pea<T extends Fn>(service: T & Service): ValueOf<TRegistry, T>;
    pea<T extends Fn>(service: T): ValueOf<TRegistry, T>;
    pea<T extends Constructor>(service: T & Service): ValueOf<TRegistry, T>;
    pea<T extends Constructor>(service: T): ValueOf<TRegistry, T>;
    pea<T extends keyof Registry>(service: T): ValueOf<TRegistry, T>;
    pea<T extends PrimitiveType>(service: symbol, type: T): ValueOf<TRegistry, T>;
    pea<T extends PeaKey<TRegistry>, K = never>(
        service: T,
        ...args: any[]
    ): ValueOf<TRegistry, T, K> {
        const key = keyOf(service);
        this.#dependencies.add(key);
        const ctx = this.has(key)
            ? this.ctx(key)
            : this.register(service as any, ...args).ctx(key);
        return ctx.proxy ??= newProxy(key, () => this.resolve(key as any));

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
    visit(fn: VisitFn<TRegistry, unknown>): void;
    visit<T extends PeaKey<TRegistry>>(
        service: T,
        fn: VisitFn<TRegistry, T>,
    ): void;
    visit<T extends PeaKey<TRegistry>>(
        service: T | VisitFn<TRegistry, unknown>,
        fn?: VisitFn<TRegistry, T> | undefined,
    ) {
        const key = keyOf(service);
        if (isFn(fn)) {
            this._visit(key, fn as any);
        } else if (isFn(service)) {
            for (const key of this.#map.keys()) {
                this._visit(key, service as any);
            }
        } else {
            throw new PeaError("invalid arguments");
        }
    }
    private _visit(
        service: CKey,
        fn: (value: unknown, mapKey: PeaKey<TRegistry>) => unknown,
        seen = new Set<CKey>(),
    ) {
        if (seen.size === seen.add(service).size) {
            return;
        }
        const ctx = this.ctx(service);
        if (ctx.dependencies) {
            for (const dep of ctx.dependencies) {
                this._visit(dep, fn, seen);
            }
        }
        const result = fn(ctx.instance, service as any);
        if (result === destroySymbol) {
            ctx.instance = undefined;
            ctx.resolved = false;
        }
        if (result === removeSymbol) {
            this.#map.delete(service);
        } else {
            ctx.instance = result;
        }
    }

    register<T extends Primitive>(service: symbol, value: T): this;
    register<T extends Fn>(service: symbol, fn: T, ...args: Parameters<T>): this;
    register<T extends Constructor>(
        service: symbol,
        constructor: T,
        ...args: ConstructorParameters<T>
    ): this;
    register<T extends keyof TRegistry>(service: T, value: TRegistry[T]): this;
    register<T extends Constructor>(
        service: T,
        ...args: ConstructorParameters<T>
    ): this;
    register<T extends Fn>(service: T, ...args: any[]): this;
    register(service: PeaKey<TRegistry>, ..._args: any[]): this {
        const key = keyOf(service);
        if (this.has(key)) {
            this.invalidate(key);
        }
        let serv: Constructor | Fn | unknown = service;
        let args: any[] = _args;

        if (isSymbol(service)) {
            if (_args.length === 0) {
                throw new PeaError(
                    `service '${String(service)}' could not be registered.`,
                );
            }
            serv = _args[0];
            args = _args.slice(1);
        }
        /**
         * If a value is registered with proxies, than we need to keep track of them. If
         * it is instatiated with defaults we use the context#dependencies to resolve them.
         */
        const dependencies = _args.reduce((set, arg) => {
            let depKey: CKey | undefined;
            if (isObjectish(arg) && (depKey = (arg as any)[proxyKey]) != null) {
                return (set ?? new Set<CKey>()).add(depKey);
            }
            return set;
        }, undefined as Set<CKey> | undefined);

        const ctx = isFn(serv)
            ? isConstructor(serv)
                ? {
                    _constructor: serv,
                    resolved: false,
                    dependencies,
                    args,
                }
                : {
                    _factory: serv,
                    resolved: false,
                    dependencies,
                    args,
                }
            : isPrimitive(serv)
                ? {
                    primitive: true,
                    instance: serv,
                    resolved: true,
                } //should be a plain object
                : {
                    primitive: false,
                    instance: serv,
                    resolved: true,
                };

        this.ctx(key, ctx);
        return this;
    }
    private has(key: CKey): boolean {
        return this.#map.has(key) ?? this.parent?.has(key) ?? false;
    }
    private ctx(k: CKey, defaults?: Ctx<TRegistry, any>): Ctx<TRegistry, any> {
        let ret = this.#map.get(k) ?? this.parent?.ctx(k);
        if (!ret) {
            this.#map.set(k, (ret = defaults ?? { resolved: false }));
        } else if (defaults != null) {
            Object.assign(ret, defaults);
        }
        return ret;
    }
    private invalidate(key: CKey, ctx?: Ctx<TRegistry, any>, seen = new Set<CKey>()) {
        if (seen.size === seen.add(key).size) {
            return;
        }
        ctx = ctx ?? this.#map.get(key);

        if (!ctx) {
            //I don't  think this should happen, but what do I know.
            return;
        }
        ctx.resolved = false;
        ctx.instance = undefined;

        for (const [k, v] of this.#map) {
            if (
                v.dependencies?.has(key) &&
                (isConstructorCtx(v) || isFactoryCtx(v))
            ) {
                this.invalidate(k, v, seen);
            }
        }
    }

    resolve<T extends Primitive>(key: symbol, value: T): T;
    resolve<T extends Constructor>(
        key: symbol,
        service: T,
        ...args: ConstructorParameters<T>
    ): ValueOf<TRegistry, T>;
    resolve<T extends Fn>(
        key: symbol,
        service: T,
        ...args: Parameters<T>
    ): ValueOf<TRegistry, T>;
    resolve<T extends Constructor & Service>(
        service: T,
        ...args: ConstructorParameters<T>
    ): ValueOf<TRegistry, T>;
    resolve<T extends Constructor>(
        service: T,
        ...args: ConstructorParameters<T>
    ): ValueOf<TRegistry, T>;
    resolve<T extends Fn & Service>(
        service: T,
        ...args: Parameters<T>
    ): ValueOf<TRegistry, T>;
    resolve<T extends Fn>(
        service: T,
        ...args: Parameters<T>
    ): ValueOf<TRegistry, T>;
    resolve<T extends keyof TRegistry>(service: T): ValueOf<TRegistry, T>;
    resolve<T extends (Constructor & Service) | Fn | keyof TRegistry>(
        service: T,
        ..._args: any[]
    ): ValueOf<TRegistry, T> {
        const key = keyOf(service);
        if (!this.has(key)) {
            //Tried to resolve a service that was not registered.
            if (service == null || (isSymbol(service) && _args.length === 0)) {
                throw new PeaError(
                    `service '${String(service)}' not registered, and can not be resolved without a corresponding, value, factory, or class.`,
                );
            }
            return this.register(service as any, ..._args).resolve(service as any);
        }

        const ctx = this.ctx(key);
        if (ctx.resolved) {
            return ctx.instance;
        }

        if (isFactoryCtx<TRegistry>(ctx)) {
            ctx.resolved = true;
            ctx.dependencies = this.#dependencies = new Set(ctx.dependencies);
            ctx.instance = ctx._factory(...ctx.args);
            return ctx.instance;
        }
        if (isConstructorCtx(ctx)) {
            ctx.resolved = true;
            ctx.dependencies = this.#dependencies = new Set(ctx.dependencies);
            ctx.instance = new ctx._constructor(...ctx.args);

            return ctx.instance;
        }
        throw new PeaError(`unknown state for '${String(service)}'`);
    }

    newContext<TTRegistry extends TRegistry = TRegistry>() {
        return new Context<TTRegistry>(this);
    }
}

export function createNewContext<TRegistry extends RegistryType>() {
    return new Context<TRegistry>();
}

export const context = createNewContext<Registry>();
export function pea<T extends keyof Registry>(service: T): Registry[T];
export function pea<T extends Fn, K extends keyof Registry>(
    fn: T & { [serviceSymbol]: K },
): Registry[K];
export function pea<T extends Constructor, K extends keyof Registry>(
    fn: T & { [serviceSymbol]: K },
): Registry[K];

export function pea<T extends PrimitiveType>(
    service: symbol,
    type: T,
): PrimitiveValue<T>;
export function pea<T extends Constructor>(constructor: T): InstanceType<T>;
export function pea<T extends Fn>(factory: T): ReturnType<T>;

export function pea<T extends Constructor | Fn | keyof Registry>(
    service: T,
    ...args: any[]
): T extends Constructor
    ? InstanceType<T>
    : T extends Fn
    ? ReturnType<T>
    : T extends keyof Registry
    ? Registry[T]
    : never {
    return context.pea.apply(context, [service, ...args] as any) as any;
}

export function keyOf(key: PeaKey<any> | Service): CKey {
    return hasA(key, serviceSymbol, isSymbol)
        ? (key[serviceSymbol] as any)
        : (key as any);
}

function isFactoryCtx<TRegistry extends RegistryType>(
    ctx: Ctx<TRegistry, any>,
): ctx is CtxFn<TRegistry, any> {
    return hasA(ctx, "_factory", isFn);
}
function isConstructorCtx<TRegistry extends RegistryType>(
    ctx: Ctx<TRegistry, any>,
): ctx is CtxClass<TRegistry, any> {
    return hasA(ctx, "_constructor", isFn);
}
