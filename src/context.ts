import { type Registry } from "./registry";
import {
    hasA,
    isFn,
    isSymbol,
    PeaError,
} from "./guards";
import type {
    Service,
    Constructor,
    ValueOf,
    Fn,
    VisitFn,
    PeaKey,
    CKey,
    RegistryType,
    Primitive,
    PrimitiveType,
} from "./types";
import { ServiceDescriptor } from "./ServiceDescriptor";
import { serviceSymbol } from "./symbols";

export type ContextType = InstanceType<typeof Context>;

class Context<TRegistry extends RegistryType = Registry> {

    //this thing is used to keep track of dependencies.
    #map = new Map<CKey, ServiceDescriptor<TRegistry, any>>();
    constructor(private readonly parent?: Context<any>) { }
    pea<T extends Fn>(service: T & Service): ValueOf<TRegistry, T>;
    pea<T extends Fn>(service: T): ValueOf<TRegistry, T>;
    pea<T extends Constructor>(service: T & Service): ValueOf<TRegistry, T>;
    pea<T extends Constructor>(service: T): ValueOf<TRegistry, T>;
    pea<T extends keyof TRegistry>(service: T): ValueOf<TRegistry, T>;
    pea<T extends PrimitiveType>(service: symbol, type: T): ValueOf<TRegistry, T>;

    pea(
        service: unknown,
        ...args: unknown[]
    ): unknown {

        return (this.#map.get(keyOf(service as any)) ?? this.register(service as any, ...args)).proxy;
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
            for (const key of this.#map.keys()) {
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
        const ctx = this.ctx(service);
        if (ctx.dependencies?.size) {
            for (const dep of ctx.dependencies) {
                this._visit(dep, fn, seen);
            }
        }
        fn(ctx);
    }

    register<T extends Primitive>(service: symbol, value: T): ServiceDescriptor<TRegistry, T>;
    register<T extends Fn>(service: symbol, fn: T, ...args: Parameters<T>): ServiceDescriptor<TRegistry, T>;
    register<T extends Constructor>(
        service: symbol,
        constructor: T,
        ...args: ConstructorParameters<T>
    ): ServiceDescriptor<TRegistry, T>;
    register<T extends keyof TRegistry>(service: T, value: TRegistry[T]): ServiceDescriptor<TRegistry, T>;
    register<T extends Constructor>(
        service: T,
        ...args: ConstructorParameters<T>
    ): ServiceDescriptor<TRegistry, T>;
    register<T extends Fn>(service: T, ...args: any[]): ServiceDescriptor<TRegistry, T>;
    register<T extends PeaKey<TRegistry>>(service: T, ..._args: any[]): ServiceDescriptor<TRegistry, T> {
        const key = keyOf(service);

        let serv: Constructor | Fn | unknown = service;
        let args: any[] = _args;

        if (isSymbol(service)) {

            serv = _args[0];
            args = _args.slice(1);
        }

        let inst = this.#map.get(keyOf(service));

        if (inst) {
            if (serv != null && args?.length) {
                inst.service = serv;
                inst.args = args;
            }
            if (inst.invalid) {
                this.invalidate(key);
            }
            return inst;
        }
        this.#map.set(key, (inst = new ServiceDescriptor<TRegistry, any>(service, serv, args, true, isFn(serv))));
        return inst;
    }
    private has(key: CKey): boolean {
        return this.#map.has(key) ?? this.parent?.has(key) ?? false;
    }
    private ctx(k: CKey, defaults?: ServiceDescriptor<TRegistry, any>): ServiceDescriptor<TRegistry, any> {
        let ret = this.#map.get(k) ?? this.parent?.ctx(k);
        if (!ret) {
            ret = defaults ?? ServiceDescriptor.value(k as any, k);
            this.#map.set(k, ret);
        }
        return ret;
    }
    private invalidate(key: CKey, ctx?: ServiceDescriptor<TRegistry, any>, seen = new Set<CKey>()) {
        if (seen.size === seen.add(key).size) {
            return;
        }
        ctx = ctx ?? this.#map.get(key);

        if (!ctx) {
            //I don't  think this should happen, but what do I know.
            return;
        }
        ctx.invalidate();

        for (const [k, v] of this.#map) {
            if (
                v.hasDependency(key)
            ) {
                this.invalidate(k, v, seen);
            }
        }
    }
    resolve<T extends PeaKey<TRegistry>>(
        service: T,
        ..._args: any[]
    ): ValueOf<TRegistry, T> {
        const descriptor = this.register(service as any, ..._args);
        return descriptor.invoke();
    }

    newContext<TTRegistry extends TRegistry = TRegistry>() {
        return new Context<TTRegistry>(this);
    }




}

export function createNewContext<TRegistry extends RegistryType>() {
    return new Context<TRegistry>();
}

export const context = createNewContext<Registry>();

export const pea = context.pea.bind(context);

export function keyOf(key: PeaKey<any> | Service): CKey {
    return hasA(key, serviceSymbol, isSymbol)
        ? (key[serviceSymbol] as any)
        : (key as any);
}
