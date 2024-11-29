import { hasA, isSymbol } from "./guards";
import { serviceSymbol } from "./symbols";
import type { CKey, PeaKey, Service } from "./types";

export function keyOf(key: PeaKey<any> | Service): CKey {
  return hasA(key, serviceSymbol, isSymbol)
    ? (key[serviceSymbol] as any)
    : (key as any);
}
