import { PeaKeyType } from "./types";

export const serviceSymbol = Symbol("service");
export const destroySymbol = Symbol("destroy");
export const removeSymbol = Symbol("remove");

export const peaKey = <T>(name: string): PeaKeyType<T> => {
  return Symbol(name) as any;
};
