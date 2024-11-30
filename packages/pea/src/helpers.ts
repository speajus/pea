import { Registry } from "./registry";
import { pea } from "./context";
import { PeaKey } from "./types";

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

function get<T, TKey extends string>(obj: T, key: TKey): PathOf<T, TKey> {
  return toPath(key).reduce(
    (acc, part) => (acc as any)?.[part] as any,
    obj,
  ) as any;
}

export function pathOf<T extends PeaKey<Registry>, TPath extends string>(
  service: T,
  path: TPath,
) {
  return (ctx = pea(service)) => get(ctx, path);
}
