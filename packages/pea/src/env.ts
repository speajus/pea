import { context, pea } from "./context";
import { peaKey } from "./symbols";
import { pathOf } from "./helpers";

type Env = typeof process.env;

//make env easier to use.
export interface PeaEnv extends Env {
}

export const envPeaKey = peaKey<PeaEnv>("@pea/env");

context.register(envPeaKey, () => process.env);

export function env(envKey: keyof PeaEnv & string) {
    return pea(pathOf(envPeaKey, envKey));
}
