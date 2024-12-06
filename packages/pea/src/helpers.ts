import { Registry } from "./registry";
import { pea } from "./context";
import { PeaKey, RegistryType, ValueOf } from "./types";

type PathOf<
  T,
  TPath extends string,
  TKey extends string & keyof T = keyof T & string,
> = TPath extends TKey
  ? T[TPath]
  : TPath extends
  | `${infer TFirst extends TKey}.${infer TRest}`
  | `[${infer TFirst extends TKey}]${infer TRest}`
  ? PathOf<T[TFirst], TRest>
  : never;

const toPath = (path: string) => path.split(/\.|\[(.+?)\]/g).filter(Boolean);

function get<T, TKey extends string>(
  obj: T,
  key: TKey,
  defaultValue?: PathOf<T, TKey> | undefined,
): PathOf<T, TKey> {
  const value = toPath(key).reduce((acc, part) => {
    return (acc as any)?.[part];
  }, obj) as any;
  return value ?? defaultValue;
}

export function pathOf<
  T extends PeaKey<TRegistry>,
  TPath extends string,
  TRegistry extends RegistryType = Registry,
>(
  service: T,
  path: TPath,
  defaultValue?: PathOf<ValueOf<TRegistry, T>, TPath> | undefined,
) {
  return (ctx = pea(service)) =>
    get(ctx as ValueOf<TRegistry, T>, path, defaultValue);
}

export function transform<R, T extends PeaKey<TRegistry>,
  TRegistry extends RegistryType = Registry>(service: T, transformer: (v: ValueOf<TRegistry, T>) => R): R {
  return pea((ctx = pea(service)) => transformer(ctx));
}