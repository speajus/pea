import { ServiceDescriptor } from "./ServiceDescriptor";
import { destroySymbol, removeSymbol, serviceSymbol } from "./symbols";

export type Constructor = new (...args: any[]) => any;
export type Fn = (...args: any[]) => any;
export type AwaitedReturnType<T extends Fn> = Awaited<ReturnType<T>>;

export type ServiceReturn<
  TRegistry extends RegistryType,
  T,
> = T extends Constructor
  ? InstanceType<T>
  : T extends Fn
  ? ReturnType<T>
  : T extends keyof TRegistry
  ? TRegistry[T]
  : never;

//This is just a fake type to make key tracking easier.
export type CKey = { __brand: "ContextKey" };

interface CtxBase<TRegistry extends RegistryType, T> {
  resolved: boolean;
  primitive?: boolean;
  proxy?: ValueOf<TRegistry, T>;
  dependencies?: Set<CKey>;
}

export interface CtxClass<TRegistry extends RegistryType, T extends Constructor>
  extends CtxBase<TRegistry, InstanceType<T>> {
  _constructor: T;
  instance?: InstanceType<T>;
  args: ConstructorParameters<T>;
}

export interface CtxFn<TRegistry extends RegistryType, T extends Fn>
  extends CtxBase<TRegistry, ReturnType<T>> {
  _factory: T;
  args: Parameters<T>;
  instance?: ReturnType<T>;
}
export interface CtxValue<TRegistry extends RegistryType, T>
  extends CtxBase<TRegistry, T> {
  instance?: T;
}

export type PeaKey<TRegistry extends RegistryType> =
  | Constructor
  | Fn
  | keyof TRegistry;

export type Ctx<TRegistry extends RegistryType, T> = T extends Constructor
  ? CtxClass<TRegistry, T>
  : T extends Fn
  ? CtxFn<TRegistry, T>
  : CtxValue<TRegistry, T>;

export interface Service<T extends symbol = symbol> {
  [serviceSymbol]: T;
}

export type ValueOf<
  TRegistry extends RegistryType,
  T,
  K = unknown,
> = T extends Constructor
  ? InstanceType<T>
  : T extends Fn
  ? ReturnType<T>
  : T extends keyof TRegistry
  ? TRegistry[T]
  : K extends PrimitiveType
  ? PrimitiveValue<K>
  : T;
export type Primitive = string | number | boolean | symbol | bigint;
export type PrimitiveType = String | Number | Boolean | Symbol | BigInt;
export type PrimitiveValue<T extends PrimitiveType> = T extends String
  ? string
  : T extends Number
  ? number
  : T extends Boolean
  ? boolean
  : T extends Symbol
  ? symbol
  : T extends BigInt
  ? bigint
  : never;



export type VisitFn<
  TRegistry extends RegistryType,
  T extends PeaKey<TRegistry>,
> = (
  value: ServiceDescriptor<TRegistry, T>,
) => unknown | typeof destroySymbol | typeof removeSymbol;

export interface RegistryType {
  [key: symbol]: any;
}
