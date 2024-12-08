import { isConstructor, isFn, isSymbol } from "./guards";
import { PeaKey, PeaKeyType } from "./types";

export const serviceSymbol = Symbol("@pea/Service");
export const destroySymbol = Symbol("@pea/Service.destroy");
export const removeSymbol = Symbol("@pea/Service.remove");

const peaKeyMap = new WeakMap<{}, string>();

export const peaKey = <T>(name: string): PeaKeyType<T> => {
  const sym = Symbol();
  peaKeyMap.set(sym, name);
  return sym as any;
};

export const peaKeyName = (key: PeaKeyType<any>) => {
  return peaKeyMap.get(key);
}

export function isPeaKey(v: unknown): v is PeaKeyType<unknown> {
  return isSymbol(v) ? peaKeyMap.has(v) : false;
}
export function asString(key: PeaKey<any>) {
  if (isPeaKey(key)) {
    return peaKeyName(key);
  }
  if (isFn(key)) {
    return key.name ?? "<anonymous>";
  }
  return String(key);
}
