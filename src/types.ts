import { Registry } from "@spea/registry";
import { serviceSymbol } from "./symbols";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class = new (...args: any[]) => any;
export type Constructor = new (...args: any[]) => any;
export type Fn = (...args: any[]) => any;
export type AwaitedReturnType<T extends Fn> = Awaited<ReturnType<T>>;

export type ServiceReturn<T> = T extends Constructor ? InstanceType<T> :
    T extends Fn ? ReturnType<T> :
    T extends keyof Registry ? Registry[T] : never;

export type CtxClass<T> = T extends Constructor ? {
    constructor: T;
    instance?: InstanceType<T>;
    args: ConstructorParameters<T>;
} : never;
export type CtxFn<T> = T extends Fn ? {
    factory: T;
    args: Parameters<T>;
    instance?: AwaitedReturnType<T>;
} : never;

export type CtxValue<T> = {
    instance?: T;
};

export interface Service<T extends symbol = symbol> {
    [serviceSymbol]: T;
}

type RegistryKey = keyof Registry;

export type ValueOf<T, K = unknown> = T extends Constructor ? InstanceType<T> : T extends Fn ? ReturnType<T> : T extends RegistryKey ? Registry[T] : K extends PrimitiveType ? PrimitiveValue<K> : T;
export type Primitive = string | number | boolean | symbol | bigint;
export type PrimitiveType = String | Number | Boolean | Symbol | BigInt;
export type PrimitiveValue<T extends PrimitiveType> = T extends String ? string : T extends Number ? number : T extends Boolean ? boolean : T extends Symbol ? symbol : T extends BigInt ? bigint : never;