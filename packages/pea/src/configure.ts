import { service } from "./newProxy";
import { Constructor, Fn, PeaKeyType } from "./types";

export function withOptional<T>(value: T):  T  | undefined {
  service(value).withOptional(true);  
  return value;
}
export function withArgs<T extends Fn<any> | Constructor<any>> (value:T, ...args:T extends Constructor<any> ? ConstructorParameters<any> : Parameters<any>) {
    service(value).withArgs(...args);
    return value;
}
export function withValue<T>(value:T, val:T extends Constructor<any> ? InstanceType<T> : T extends Fn<any> ? ReturnType<T> : T):T {
    service(value).withValue(val);
    return value;
}
export function withCacheable<T>(value:T, cacheable:boolean = true):T {
    service(value).withCacheable(cacheable);
    return value;
}
export function withTags<T>(value:T, tags:PeaKeyType<any>[]):T {
    service(value).withTags(...tags);
    return value;
}
export function withService<T>(value:T, factory:Constructor<T> | Fn<T>):T {
    service(value).withService(factory);
    return value;
}