import { it, describe, expect } from "vitest";
import {
    context as ctx,
    destroySymbol,
    pea,
    RegistryType,
    serviceSymbol,
} from "@speajus/pea";
import { EmailService } from "./sample-services/email";
import { AuthService, authServiceSymbol } from "./sample-services/auth";
import { connectionSymbol, DBService } from "./sample-services/db";
import { createNewContext } from "@speajus/pea";

const aiSymbol = Symbol("a");
const abSymbol = Symbol("b");
const acSymbol = Symbol("c");
class A {
    static readonly [serviceSymbol] = aiSymbol;
    constructor(readonly connectionUrl: string) { }
    connection() {
        return this.connectionUrl;
    }
}
class C {
    constructor(readonly a = pea(aiSymbol)) { }
}
type AI = InstanceType<typeof A>;
declare module "@speajus/pea" {
    export interface Registry {
        [aiSymbol]: AI;
        [abSymbol]: string;
        [acSymbol]: InstanceType<typeof C>;
    }
}

describe("pea test", () => {
    it("should test something", () => {
        const t = { value: "I am a string" };
        const proxy = new Proxy(t, {
            getPrototypeOf() {
                return String.prototype;
            },
            get(target, prop, receiver) {
                const prim = Reflect.get(target, "value");
                const value = prim[prop as any] as any;
                return typeof value === "function" ? value.bind(prim) : value;
            },
        });
        expect(proxy + "").toBe("I am a string");
        t.value = "what";
        expect(proxy + "").toBe("what");
        expect(proxy).toBeInstanceOf(String);
    });

    it("should return the an instance", () => {
        ctx.register(abSymbol, "myconnection");
        console.log(ctx.resolve(abSymbol));
        expect(ctx.resolve(abSymbol) == "myconnection").toBe(true);
        // ctx.register(aiSymbol, A, pea(abSymbol));

        // const ainstance = ctx.resolve(aiSymbol);

        // expect(ainstance.connection() == "myconnection").toBe(true);
        // expect(ctx.resolve(abSymbol)).toBe("myconnection");
    });

    it("should instatiate classes that", () => {
        class B { }
        const resp = ctx.resolve(B);
        expect(ctx.resolve(B)).toBeInstanceOf(B);
    });

    it("should return factory functions", () => {
        const fn = () => {
            return "fn";
        };
        const result = ctx.register(fn);
        expect(result.invoke()).toBe("fn");
    });

    it("should in inject the things", async () => {
        ctx.register(authServiceSymbol, AuthService);
        ctx.register(connectionSymbol, "hello");
        ctx.register(DBService);
        const result = ctx.resolve(EmailService);
        expect(result).toBeInstanceOf(EmailService);
        expect(result.sendEmail("to", "what", "go")).toBeInstanceOf(Promise);
    });
    it('should cache things', () => {
        let i = 0;
        class Cache { constructor() { i++ } }
        const result = ctx.resolve(Cache);
        expect(i).toBe(1);
        const result2 = ctx.resolve(Cache);

        expect(result).toBeInstanceOf(Cache);
        expect(result2).toBe(result);
        expect(i).toBe(1);
    });
    it("should visit and destroy", () => {
        let d = 0;
        let c = 0;
        class Base {
            constructor() {
                c++;
            }
            destroy() {
                d++;
            }

            toString() {
                return this.constructor.name;
            }
        }
        class TA extends Base { }
        class TB extends Base {
            constructor(readonly a = pea(TA)) {
                super();
            }
        }
        class TC extends Base {
            constructor(readonly b = pea(TB)) {
                super();
            }
        }

        class TD {
            constructor(
                readonly a = pea(TA),
                readonly b = pea(TB),
                readonly c = pea(TC),
            ) { }
            toString() {
                return [this.a, this.b, this.c].join("-");
            }
        }

        const v = ctx.resolve(TD);
        expect(v.toString()).toBe("TA-TB-TC");
        expect(v.a).toBeInstanceOf(TA);
        expect(v.b).toBeInstanceOf(TB);
        expect(v.c).toBeInstanceOf(TC);
        expect(c).toBe(3);
        //make sure we only resolve once.
        ctx.resolve(TD).toString();

        ctx.visit(TD, (v) => {
            if (v.invoked) {
                const val = v.invoke();
                if (val instanceof Base) {
                    val.destroy();
                }
            }
            return destroySymbol;
        });
        expect(d).toBe(3);
        ctx.resolve(TD).toString();
        expect(c).toBe(3);
        expect(ctx.resolve(TD)).toBeInstanceOf(TD);
        expect(c).toBe(3);
    });

    it("should work with Service", () => {
        class TT {
            static [serviceSymbol] = Symbol("tt");
        }

        expect(ctx.resolve(TT)).toBeInstanceOf(TT);
    });
    it("should work with custom context", () => {
        const someKey = Symbol("custom");
        interface CustomRegistry extends RegistryType {
            [someKey]: string;
        }
        const customContext = createNewContext<CustomRegistry>();

        customContext.register(someKey, "custom value");

        expect(customContext.resolve(someKey)).toBe("custom value");
    });
    it("should inject non primitive objects", () => {
        const CONFIG = Symbol("Config");

        ctx.register(CONFIG, { test: 1 });
        expect(ctx.resolve(CONFIG).test).toBe(1);
    });
    it("should allow for injection of proxies in resolve", () => {
        let v = 10;
        const val = () => {
            return v++;
        };
        const factory = (a: number) => {
            return a + 1;
        };
        expect(ctx.resolve(factory, pea(val))).toBe(11);
        expect(ctx.resolve(val)).toBe(10);
        //check it again it should not change.
        expect(ctx.resolve(val)).toBe(10);
    });
    it("should recalculate when registration changes", () => {

        let c = 0;

        const dep = (val = 0) => {
            return val + (c++);
        };
        const factory = (a: number) => {
            return a + 1;
        };
        const arg = pea(dep);
        ctx.resolve(factory, arg);
        expect(ctx.resolve(factory, arg)).toBe(1);
        // //check it again it should not change.
        // expect(ctx.resolve(val)).toBe(10);
        ctx.register(dep).service = () => 100;
        expect(ctx.resolve(factory, pea(dep))).toBe(101);
        expect(ctx.resolve(factory, pea(dep))).toBe(101);
    });
});
