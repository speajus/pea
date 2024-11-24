import { createPrimitiveProxy, newProxy } from "./newProxy";
import { Registry } from "./registry";
import { destroySymbol, removeSymbol, serviceSymbol } from "./symbols";
import { has, hasA, isConstructor, isFn, isPrimitive, isSymbol } from "./guards";
import type { Service, Constructor, CtxClass, CtxFn, CtxValue, ValueOf, Fn, Primitive, PrimitiveType, PrimitiveValue, VisitFn, PeaKey, Ctx, CKey } from "./types";



export type ContextType = InstanceType<typeof Context>;

class Context {
    //this thing is used to keep track of dependencies. 
    static #dependencies = new Set<CKey>();
    #map = new Map<CKey, Ctx<any>>();
    constructor(private readonly parent?: Context) {
    }
    pea<T extends Fn>(service: T & Service): ValueOf<T>;
    pea<T extends Fn>(service: T): ValueOf<T>;
    pea<T extends Constructor>(service: T & Service): ValueOf<T>;
    pea<T extends Constructor>(service: T): ValueOf<T>;
    pea<T extends keyof Registry>(service: T): ValueOf<T>;
    pea<T extends PrimitiveType>(service: symbol, type: T): ValueOf<T>;
    pea<T extends PeaKey, K = never>(service: T, ...args: any[]): ValueOf<T, K> {
        const key = keyOf(service);
        Context.#dependencies.add(key);
        const ctx = this.has(key) ? this.ctx(key) : this.register(service as any, ...args).ctx(key);
        return ctx.proxy ?? (ctx.proxy =
            isPrimitiveCtx(ctx) ? createPrimitiveProxy(ctx) :
                newProxy(() => this.resolve(service as any)));
    }

    /**
     * Starting at a service, apply a function to all dependencies.  This is
     * useful if you want to destroy all dependencies.   This also could be
     * used for trigger init methods.  It will only visit each dependency once.
     *  
     * 
     * ```
     *   context.visit(EmailService, (v)=>{
     *     v.destroy?.();
     *     return undefined;
     *   });
     * 
     * ```
     * 
     * @param service 
     * @param fn 
     */
    visit(fn: VisitFn<unknown>): void;
    visit<T extends PeaKey>(service: T, fn: VisitFn<T>): void;
    visit<T extends PeaKey>(service: T | VisitFn<unknown>, fn?: VisitFn<T> | undefined) {
        const key = keyOf(service);
        if (isFn(fn)) {
            this._visit(key, fn as any);
        } else if (isFn(service)) {
            for (const key of this.#map.keys()) {
                this._visit(key, service);
            }
        } else {
            throw new PeaError('invalid arguments');
        }
    }
    private _visit(service: CKey, fn: (value: unknown, mapKey: PeaKey) => unknown, seen = new Set<CKey>()) {
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
        } if (result === removeSymbol) {
            this.#map.delete(service);
        } else {
            ctx.instance = fn(ctx.instance, service as any);
        }
    }


    register<T extends Primitive>(service: symbol, value: T): this;
    register<T extends Fn>(service: symbol, fn: T, ...args: Parameters<T>): this;
    register<T extends Constructor>(service: symbol, constructor: T, ...args: ConstructorParameters<T>): this;
    register<T extends keyof Registry>(service: T, value: Registry[T]): this;
    register<T extends Constructor>(service: T, ...args: ConstructorParameters<T>): this;
    register<T extends Fn>(service: T, ...args: any[]): this;
    register<T>(service: PeaKey, ..._args: any[]): this {
        const key = keyOf(service);
        let serv: Constructor | Fn | unknown = service;
        let args: any[] = _args;

        if (isSymbol(service)) {
            if (_args.length === 0) {
                throw new PeaError(`service '${String(service)}' could not be registered.`);
            }
            serv = _args[0];
            args = _args.slice(1);
        }

        const ctx = isFn(serv) ? isConstructor(serv) ? {
            _constructor: serv,
            resolved: false,
            args,
        } : {
            _factory: serv,
            resolved: false,
            args,
        } : isPrimitive(serv) ? {
            primitive: true,
            instance: serv,
            resolved: true
        } : null;

        if (ctx == null) {
            throw new PeaError(`unknown service type for '${String(key)}'`);
        }
        this.ctx(key, ctx);
        return this;
    }
    private has(key: CKey): boolean {
        return this.#map.has(key) ?? this.parent?.has(key) ?? false;
    }
    private ctx(k: CKey, defaults?: Ctx<any>): Ctx<any> {
        let ret = this.#map.get(k) ?? this.parent?.ctx(k);
        if (!ret) {
            this.#map.set(k, (ret = defaults ?? { resolved: false }));
        } else if (defaults != null) {
            Object.assign(ret, defaults);
        }
        return ret;
    }
    resolve<T extends Primitive>(key: symbol, value: T): T;
    resolve<T extends Constructor>(key: symbol, service: T, ...args: ConstructorParameters<T>): ValueOf<T>;
    resolve<T extends Fn>(key: symbol, service: T, ...args: Parameters<T>): ValueOf<T>;
    resolve<T extends Constructor & Service>(service: T, ...args: ConstructorParameters<T>): ValueOf<T>;
    resolve<T extends Constructor>(service: T, ...args: ConstructorParameters<T>): ValueOf<T>;
    resolve<T extends Fn & Service>(service: T, ...args: Parameters<T>): ValueOf<T>;
    resolve<T extends Fn>(service: T, ...args: Parameters<T>): ValueOf<T>;
    resolve<T extends keyof Registry>(service: T): ValueOf<T>;
    resolve<T extends (Constructor & Service) | Fn | keyof Registry>(service: T, ..._args: any[]): ValueOf<T> {
        const key = keyOf(service);
        if (!this.has(key)) {
            //Tried to resolve a service that was not registered.  
            if (service == null || isSymbol(service) && _args.length === 0) {
                throw new PeaError(`service '${String(service)}' not registered, and can not be resolved.`);
            }
            return this.register(service as any, ..._args).resolve(service as any);
        }

        const ctx = this.ctx(key);
        if (ctx.resolved) {
            return ctx.instance;
        }

        if (isFactoryCtx(ctx)) {
            ctx.resolved = true;
            ctx.dependencies = Context.#dependencies = new Set();
            ctx.instance = ctx._factory(...ctx.args);
            return ctx.instance;
        }
        if (isConstructorCtx(ctx)) {
            ctx.resolved = true;
            ctx.dependencies = Context.#dependencies = new Set();
            ctx.instance = new (ctx._constructor)(...ctx.args)
            return ctx.instance;
        }
        throw new PeaError(`unknown state for '${String(service)}'`);
    }

    newContext() {
        return new Context(this);
    }
}

export const context = new Context();
export function pea<T extends keyof Registry>(service: T): Registry[T];
export function pea<T extends Fn, K extends keyof Registry>(fn: T & { [serviceSymbol]: K }): Registry[K];
export function pea<T extends Constructor, K extends keyof Registry>(fn: T & { [serviceSymbol]: K }): Registry[K];

export function pea<T extends PrimitiveType>(service: symbol, type: T): PrimitiveValue<T>;
export function pea<T>(service: symbol, type: T): T extends PrimitiveType ? PrimitiveValue<T> : T extends Constructor ? InstanceType<T> : T extends Fn ? ReturnType<T> : never;
export function pea<T extends Constructor>(constructor: T): InstanceType<T>;
export function pea<T extends Fn>(factory: T): ReturnType<T>;

export function pea<T extends Constructor | Fn | keyof Registry>(service: T, ...args: any[]):
    T extends Constructor ? InstanceType<T> : T extends Fn ? ReturnType<T> :
    T extends keyof Registry ? Registry[T] : never {
    return context.pea.apply(context, [service, ...args] as any) as any;
};

function keyOf(key: PeaKey | Service): CKey {
    return hasA(key, serviceSymbol, isSymbol) ? key[serviceSymbol] as any : key as any;
}

function isFactoryCtx(ctx: Ctx<any>): ctx is CtxFn<any> {
    return hasA(ctx, '_factory', isFn);
}
function isConstructorCtx(ctx: Ctx<any>): ctx is CtxClass<any> {
    return hasA(ctx, '_constructor', isFn);
}
function isPrimitiveCtx(ctx: Ctx<any>): ctx is CtxValue<Primitive> {
    return ctx.primitive === true;
}

class PeaError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, Error);
    }
}
