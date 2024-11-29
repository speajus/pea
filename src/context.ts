import { type Registry } from "./registry";
import { hasA, isFn, isSymbol, PeaError } from "./guards";
import type {
    Service,
    Constructor,
    ValueOf,
    Fn,
    VisitFn,
    PeaKey,
    CKey,
    RegistryType,
    ServiceArgs,
} from "./types";
import { ServiceDescriptor } from "./ServiceDescriptor";
import { serviceSymbol } from "./symbols";

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
export class Context<TRegistry extends RegistryType = Registry> implements Context<TRegistry> {
    //this thing is used to keep track of dependencies.
    protected map = new Map<CKey, ServiceDescriptor<TRegistry, any>>();
    constructor(private readonly parent?: Context<any>) { }
    pea<T extends PeaKey<TRegistry>>(service: T): ValueOf<TRegistry, T>;
    pea(service: unknown): unknown {
        return (
            this.map.get(keyOf(service as any)) ?? this.register(service as any)
        ).proxy;
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
        const ctx = this.ctx(service);
        if (ctx.dependencies?.size) {
            for (const dep of ctx.dependencies) {
                this._visit(dep, fn, seen);
            }
        }
        fn(ctx);
    }

    protected has(key: CKey): boolean {
        return this.map.has(key) ?? this.parent?.has(key) ?? false;
    }
    protected ctx(
        k: CKey,
        defaults?: ServiceDescriptor<TRegistry, any>,
    ): ServiceDescriptor<TRegistry, any> {
        let ret = this.map.get(k) ?? this.parent?.ctx(k);
        if (!ret) {
            ret = defaults ?? new ServiceDescriptor(k as any);
            this.map.set(k, ret);
        }
        return ret;
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


