import { serviceSymbol } from "./symbols";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class = new (...args: any[]) => any;
export type Constructor = new (...args:any[])=>any;
export type Fn = (...args:any[])=>any;
export type AwaitedReturnType<T extends Fn> = Awaited<ReturnType<T>>;

export type CtxClass<T> = T extends Constructor ? {
    constructor:T;
    instance?:InstanceType<T>;
    args:ConstructorParameters<T>;
} : never;
export type CtxFn<T > =  T extends Fn ? {
    factory:T;
    args:Parameters<T>;
    instance?:AwaitedReturnType<T>;
} : never;

export  type CtxValue<T> = {
    instance?:T;
};

export interface Service<T extends symbol = symbol> {
    [serviceSymbol]:T;
}