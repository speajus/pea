import { PeaKeyType } from "./types";

export const serviceSymbol = Symbol("@pea/Service");
export const destroySymbol = Symbol("@pea/Service.destroy");
export const removeSymbol = Symbol("@pea/Service.remove");

export const peaKey = <T>(name: string): PeaKeyType<T> => {
  return Symbol(name) as any;
};
