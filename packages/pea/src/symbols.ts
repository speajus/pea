import { isSymbol } from "./guards";
import { PeaKeyType } from "./types";

export const serviceSymbol = Symbol("@pea/Service");
export const destroySymbol = Symbol("@pea/Service.destroy");
export const removeSymbol = Symbol("@pea/Service.remove");

const peaKeyMap = new WeakMap<{}, string>();

export const peaKey = <T>(name: string): PeaKeyType<T> => {
  const sym = Symbol();
  peaKeyMap.set(sym, name);
  return sym as any;
};

export const peaKeyName = (key: PeaKeyType<any>) => peaKeyMap.get(key) ?? '<symbol>';

export function isPeaKey(v: unknown): v is symbol {
  return isSymbol(v) && peaKeyMap.has(v);
}
