import { Registry } from "./registry";
import { destroySymbol, removeSymbol, serviceSymbol } from "./symbols";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class = new (...args: any[]) => any;
export type Constructor = new (...args: any[]) => any;
export type Fn = (...args: any[]) => any;
export type AwaitedReturnType<T extends Fn> = Awaited<ReturnType<T>>;

export type ServiceReturn<T> = T extends Constructor ? InstanceType<T> :
    T extends Fn ? ReturnType<T> :
    T extends keyof Registry ? Registry[T] : never;

export type CKey = { __brand: 'ContextKey' };

interface CtxBase<T> {
    resolved: boolean;
    primitive?: boolean;
    proxy?: ValueOf<T>;
    dependencies?: Set<CKey>;
}

export interface CtxClass<T extends Constructor> extends CtxBase<InstanceType<T>> {
    _constructor: T;
    instance?: InstanceType<T>;
    args: ConstructorParameters<T>;
}

export interface CtxFn<T extends Fn> extends CtxBase<ReturnType<T>> {
    _factory: T;
    args: Parameters<T>;
    instance?: ReturnType<T>;
}
export interface CtxValue<T> extends CtxBase<T> {
    instance?: T;
}

export type PeaKey = Constructor | Fn | keyof Registry | symbol;

export type Ctx<T> = T extends Constructor ? CtxClass<T> : T extends Fn ? CtxFn<T> : CtxValue<T>;

export interface Service<T extends symbol = symbol> {
    [serviceSymbol]: T;
}

type RegistryKey = keyof Registry;

export type ValueOf<T, K = unknown> = T extends Constructor ? InstanceType<T> : T extends Fn ? ReturnType<T> : T extends RegistryKey ? Registry[T] : K extends PrimitiveType ? PrimitiveValue<K> : T;
export type Primitive = string | number | boolean | symbol | bigint;
export type PrimitiveType = String | Number | Boolean | Symbol | BigInt;
export type PrimitiveValue<T extends PrimitiveType> = T extends String ? string : T extends Number ? number : T extends Boolean ? boolean : T extends Symbol ? symbol : T extends BigInt ? bigint : never;

type VisitFnType<K, V> = (value: V, mapKey: K) => (unknown | typeof destroySymbol | typeof removeSymbol);

export type VisitFn<T> = T extends keyof Registry ? VisitFnType<keyof Registry, Registry[T]> : T extends Constructor ? VisitFnType<Constructor, InstanceType<T>> : T extends Fn ? VisitFnType<Fn, ReturnType<T>> : never;