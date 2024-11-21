import { createPrimitiveProxy, newProxy } from "./newProxy";
import { Registry } from "./registry";
import { serviceSymbol } from "./symbols";
import { has, hasA, isConstructor, isFn, isPrimitive, isPrimitiveType, isService, isSymbol } from "./guards";
import type { Service, Constructor, CtxClass, CtxFn, CtxValue, ValueOf, Fn, Primitive, PrimitiveType, PrimitiveValue } from "./types";

type Ctx<T> = (CtxClass<T> | CtxFn<T> | CtxValue<T>) & {
    dependsOn: Set<MapKey>,
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
        const ctx = this.ctx(service as MapKey);

        const primitive = isPrimitiveType(type);

        if (ctx) {
            if (ctx.proxy) {
                return ctx.proxy;
            }
            if (primitive) {
                ctx.primitive = true;
                return (ctx.proxy = createPrimitiveProxy(type, () => {
                    return this.resolve(service as any, type);
                }));
            }
            return (ctx.proxy = newProxy(() => this.resolve(service as any)));
        }

        const newCtx = {
            primitive,
            resolved: false,
            proxy: primitive ?
                createPrimitiveProxy(type, () => {
                    return this.resolve(service as any, type);
                }) : newProxy(() => {
                    return this.resolve(service as any);
                })
        };
        this.#map.set(service as MapKey, newCtx);
        return newCtx.proxy;
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
    register<T>(service: symbol, ..._args: any[]): this {
        let serv: Constructor | Fn | unknown;
        let key: MapKey = service;
        let args: any[] = _args;
        let primitive = false;
        let instance: unknown;
        if (isPrimitive(_args[0])) {
            primitive = true;
            instance = _args[0];
            args = [];
            this.#map.set(key, { instance, primitive, resolved: true });
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
        let ctx: Ctx<any>;
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
        this.#map.set(key, ctx);
        return this;
    }
    private ctx(key: MapKey | Service): Ctx<any> | undefined {
        return this.#map.get(hasA(key, serviceSymbol, isSymbol) ? key[serviceSymbol] as MapKey : key as MapKey) ?? this.parent?.ctx(key);
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
        const key: MapKey = isService(service) ? service[serviceSymbol] : service;
        const ctx = this.ctx(key);

        const serv = isSymbol(service) ? _args[0] : service;
        const args = has(ctx, 'args') ? (ctx as any)?.args : isSymbol(service) ? _args.slice(1) : _args;
        if (ctx?.resolved) {
            return ctx.instance;
        }
        if (serv) {
            if (!ctx) {
                return this.register(key as any, serv, ...args).resolve(key as any);
            }
            if (ctx.resolved) {
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
        } else if (ctx) {
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

        return this.register(key as any, serv, ...args)
            .resolve(key as any);


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

