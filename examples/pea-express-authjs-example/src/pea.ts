import type { User, Session } from "@auth/express"
import { context, pathOf, peaKey } from "@speajus/pea";

export const userPeaKey = peaKey<User | null>("user");
export const sessionPeaKey = peaKey<Session | null>("session");

context.register(userPeaKey, pathOf(sessionPeaKey, 'user'));