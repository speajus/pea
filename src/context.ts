import { createPrimitiveProxy, newProxy } from "./newProxy";
import { Registry } from "./registry";
import { serviceSymbol } from "./symbols";
import { has, hasA, isConstructor, isFn, isPrimitive, isPrimitiveType, isService, isSymbol } from "./guards";
import type { Service, Constructor, CtxClass, CtxFn, CtxValue, ValueOf, Fn, Primitive, PrimitiveType, PrimitiveValue } from "./types";

type Ctx<T> = (CtxClass<T> | CtxFn<T> | CtxValue<T>) & {
    resolved: boolean,
    primitive?: boolean,
    proxy?: ValueOf<T>
};

export type ContextType = InstanceType<typeof Context>;

type MapKey = symbol | Constructor | Fn | keyof Registry;
class Context {
    #map = new Map<MapKey, Ctx<any>>();
    constructor(private readonly parent?: Context) {
    }
    proxyObject<T extends Fn>(service: T & Service): ValueOf<T>;
    proxyObject<T extends Fn>(service: T): ValueOf<T>;
    proxyObject<T extends Constructor>(service: T & Service): ValueOf<T>;
    proxyObject<T extends Constructor>(service: T): ValueOf<T>;
    proxyObject<T extends keyof Registry>(service: T): ValueOf<T>;
    proxyObject<T extends PrimitiveType>(service: symbol, type: T): ValueOf<T>;
    proxyObject<T, K = never>(service: T, type?: K): ValueOf<T, K> {
        let ctx = this.ctx(service as MapKey);

        const primitive = ctx?.primitive ?? (isPrimitiveType(type) || isPrimitive(type));

        if (ctx.proxy) {
            return ctx.proxy;
        }
        if (primitive) {
            ctx.primitive = true;
            ctx.instance = type ?? ctx.instance;
            return (ctx.proxy = createPrimitiveProxy(ctx)) as any;
        }
        return (ctx.proxy = newProxy(() => this.resolve(service as any)));
    }

    destroy(service: MapKey) {
        this.#map.delete(service);
    }

    register<T extends Primitive>(service: symbol, value: T): this;
    register<T extends Fn>(service: symbol, fn: T, ...args: Parameters<T>): this;
    register<T extends Constructor>(service: symbol, constructor: T, ...args: ConstructorParameters<T>): this;
    register<T extends keyof Registry>(service: T, value: Registry[T]): this;
    register<T extends Constructor>(service: T, ...args: ConstructorParameters<T>): this;
    register<T extends Fn>(service: T, ...args: any[]): this;
    register<T>(service: MapKey, ..._args: any[]): this {
        let serv: Constructor | Fn | unknown;
        let key: MapKey = service;
        let args: any[] = _args;
        let primitive = false;
        let instance: unknown;
        if (isPrimitive(_args[0])) {
            primitive = true;
            instance = _args[0];
            args = [];
            this.ctx(key, { instance, primitive, resolved: true });
            return this;
        }
        if (isService(service)) {
            key = service[serviceSymbol];
            serv = service;
            args = _args;
        } else if (isSymbol(service)) {
            key = service;
            serv = _args[0];
            args = _args.slice(1);
        } else {
            serv = service;
            key = service;
        }
        let ctx: Ctx<any> = { resolved: false };
        if (isFn(serv)) {
            if (isConstructor(serv)) {
                ctx = {
                    constructor: serv,
                    resolved: false,
                    args
                };
            } else {
                ctx = {
                    factory: serv,
                    resolved: false,
                    args
                }
            }
        } else {
            ctx = {
                instance: serv,
                resolved: true
            }
        }
        this.ctx(key, ctx);
        return this;
    }
    private has(key: MapKey | Service): boolean {
        return this.#map.has(keyOf(key)) ?? this.parent?.has(key) ?? false;
    }
    private ctx(key: MapKey | Service, defaults?: Ctx<any>): Ctx<any> {
        let k = keyOf(key);
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
        if (!this.has(service)) {
            this.register(service as any, ..._args);
        }
        const ctx = this.ctx(key);

        const serv = isSymbol(service) ? _args[0] : service;
        const args = has(ctx, 'args') ? (ctx as any)?.args : isSymbol(service) ? _args.slice(1) : _args;

        if (serv) {

            if (ctx.resolved) {
                if (ctx.primitive) {
                    ctx.primitive = serv;
                }
                return ctx.instance;
            }
            if (ctx.primitive) {
                ctx.resolved = true;
                ctx.instance = serv;
                return ctx.instance;
            }
            if (hasA(ctx, 'factory', isFn)) {
                ctx.resolved = true;
                return (ctx.instance = ctx.factory(...args));
            }
            if (hasA(ctx, 'constructor', isFn)) {
                ctx.resolved = true;
                ctx.instance = new (ctx.constructor)(...args)
                return ctx.instance;
            }
            throw new Error(`service '${String(service)}' not registered`);
        }

        if (!ctx.resolved) {
            if (hasA(ctx, 'constructor', isFn)) {
                ctx.instance = new (ctx.constructor)(...args);
            } else if (hasA(ctx, 'factory', isFn)) {
                ctx.instance = ctx.factory(...args);
            }
            ctx.resolved = true;
        }
        return ctx.instance;


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

export function pea<T extends Constructor | Fn | keyof Registry>(service: T, type?: any):
    T extends Constructor ? InstanceType<T> : T extends Fn ? ReturnType<T> :
    T extends keyof Registry ? Registry[T] : never {
    return context.proxyObject(service as any, type);
};

function keyOf(key: MapKey | Service) {
    return hasA(key, serviceSymbol, isSymbol) ? key[serviceSymbol] as MapKey : key as MapKey;
}