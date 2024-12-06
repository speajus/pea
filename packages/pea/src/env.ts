import { context } from "./context";
import { peaKey } from "./symbols";
import { pathOf } from "./helpers";

export const Default = {
  env: process.env,
};

type Env = typeof process.env;

//make env easier to use.
export interface PeaEnv extends Env { }

export const envPeaKey = peaKey<PeaEnv>("@pea/env");

context.register(envPeaKey, () => Default.env);

export function env<K extends keyof PeaEnv & string, D extends string>(
  envKey: K,
  defaultValue?: D,
): string | D {
  return context.register(
    Symbol.for(`@pea/env/${envKey}`),
    pathOf(envPeaKey, envKey, defaultValue as any),
  ).proxy;
}

export function envRequired<K extends keyof PeaEnv & string>(
  envKey: K,
): string {
  return context
    .register(Symbol.for(`@pea/env/${envKey}`), pathOf(envPeaKey, envKey))
    .withOptional(false).proxy;
}
