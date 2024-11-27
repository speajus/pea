import { keyOf } from "./context";
import { has, isConstructor, isFn } from "./guards";
import { newProxy, proxyKey } from "./newProxy";
import { serviceSymbol } from "./symbols";
import { CKey, Constructor, Fn, PeaKey, RegistryType } from "./types";

type Args<T> = T extends Constructor ? ConstructorParameters<T> : T extends Fn ? Parameters<T> : never;
type Returns<T> = T extends Constructor ? InstanceType<T> : T extends Fn ? ReturnType<T> : never;


export class ServiceDescriptor<TRegistry extends RegistryType, T extends Constructor | Fn> {

    static singleton<T extends Constructor | Fn>(service: T, ...args: Args<T>) {
        return new ServiceDescriptor(service, service, args);
    }

    static factory<T extends Constructor | Fn>(service: T, ...args: Args<T>) {
        return new ServiceDescriptor(service, service, args, false);
    }


    readonly [serviceSymbol]: CKey;
    dependencies?: Set<CKey>;

    private _instance?: Returns<T>;
    private _invoked = false;
    private _cacheable = true;
    private _service?: T;
    private _args: Args<T> = [] as any;
    private _proxy?: Returns<T>;

    constructor(
        key: PeaKey<TRegistry>,
        service: T,
        args: Args<T>,
        cacheable = true,
    ) {
        this[serviceSymbol] = keyOf(key);
        this.service = service;
        this.args = args as Args<T>;
        this.cacheable = cacheable;

    }

    get proxy() {
        return this._proxy ??= newProxy(this[serviceSymbol], () => this.invoke());
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

    set service(_service: T) {
        if (this._service === _service) {
            return;
        }
        this.invalidate();
        this._service = _service;
    }

    get service() {
        return this._service!;
    }

    get args() {
        return this._args!;
    }

    set args(_args: Args<T>) {
        this.invalidate();
        _args.forEach(arg => {
            if (has(arg, proxyKey)) {
                this.addDependency((arg as any)[proxyKey]);
            }
        });
        this._args = _args;
    }

    hasDependency(key: CKey) {
        return this.dependencies?.has(key) ?? false;
    }

    addDependency(...keys: CKey[]) {
        if (keys.length) {
            const set = this.dependencies ??= new Set<CKey>();
            keys.forEach(v => set.add(v));
        }
        return this;
    }

    invalidate() {
        this._invoked = false;
        this._instance = undefined;
    }

    invoke(): Returns<T> {
        if (this._invoked && this.cacheable) {
            return this._instance as Returns<T>;
        }
        const resp = isConstructor(this.service) ? new this.service(...this.args) : this.service(...this.args);
        if (this.cacheable) {
            return this._instance = resp;
        }
        return resp;
    }
}
