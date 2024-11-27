import { ServiceDescriptor } from "./ServiceDescriptor";
import { destroySymbol, removeSymbol, serviceSymbol } from "./symbols";

export type Constructor<T = any> = new (...args: any[]) => T;
export type Fn<T = any> = (...args: any[]) => T;
export type AwaitedReturnType<T extends Fn> = Awaited<ReturnType<T>>;


//This is just a fake type to make key tracking easier.
export type CKey = { __brand: "ContextKey" };

export type PeaKey<TRegistry extends RegistryType> =
  | PeaKeyType
  | Constructor
  | Fn
  | keyof TRegistry;



export interface Service<T extends symbol = symbol> {
  [serviceSymbol]: T;
}

export type ValueOf<
  TRegistry extends RegistryType,
  T,
  K = unknown,
> =
  T extends PeaKeyType<infer TValue>
  ? TValue
  : T extends Constructor
  ? InstanceType<T>
  : T extends Fn
  ? ReturnType<T>
  : T extends keyof TRegistry
  ? TRegistry[T]
  : never;
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


export type PeaKeyType<T = any> = symbol & { [serviceSymbol]: T };
