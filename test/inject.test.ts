
import { it, describe, expect } from 'vitest';
import { context as ctx, pea, serviceSymbol } from '@spea/pea';
import { EmailService } from './sample-services/email';
import { AuthService, authServiceSymbol } from './sample-services/auth';
import { DBService } from './sample-services/db';

const aiSymbol = Symbol('a');
const abSymbol = Symbol('b');
const acSymbol = Symbol('c');
class A {
    static readonly [serviceSymbol] = aiSymbol;
    constructor(readonly connectionUrl: string) {
    }
    connection() {
        return this.connectionUrl;
    }
}
class C {
    constructor(readonly a = pea(aiSymbol)) {
    }
}
type AI = InstanceType<typeof A>;
declare module "@spea/registry" {
    export interface Registry {
        [aiSymbol]: AI;
        [abSymbol]: string;
        [acSymbol]: InstanceType<typeof C>;
    }
}

describe('pea test', () => {
    it('should test something', () => {
        const t = { value: 'I am a string' };
        const proxy = new Proxy(t, {
            getPrototypeOf() {
                return String.prototype;
            },
            get(target, prop, receiver) {
                console.log({ receiver, target, prop });
                const prim = Reflect.get(target, 'value');
                const value = prim[prop];
                return typeof value === 'function' ? value.bind(prim) : value;
            }
        });
        expect(proxy + '').toBe("I am a string");
        t.value = 'what';
        expect(proxy + '').toBe("what");
        expect(proxy).toBeInstanceOf(String);
    })
    it('should work with primatives', () => {
        const sym = Symbol('test--1');
        const ab = pea(sym, "my-test");
        expect(ab + '').toBe("my-test");

        ctx.resolve(sym, "my-test-2");
        expect(ab + '').toBe("my-test-2");

    })
    it('should return the an instance', () => {

        const connectionInstance = ctx.register(abSymbol, "myconnection")
            .resolve(abSymbol)

        expect(connectionInstance).toBe("myconnection");

        const ab = pea(abSymbol);

        ctx.register(aiSymbol, A, ab);
        const ainstance = ctx.resolve(aiSymbol);

        expect(ainstance.connection() + '').toBe("myconnection");
    });

    it('should instatiate classes that', () => {
        class B { }
        expect(ctx.resolve(B)).toBeInstanceOf(B);
    });

    it('should return factory functions', () => {
        const fn = () => {
            return 'fn';
        }
        const result = ctx.register(fn);
        expect(result.resolve(fn)).toBe('fn');
    });

    it('should in inject the things', async () => {
        ctx.register(authServiceSymbol, AuthService);
        ctx.register(DBService);
        const result = ctx.resolve(EmailService);
        expect(result).toBeInstanceOf(EmailService);
        expect(result.sendEmail("to", "what", "go")).toBeInstanceOf(Promise);
    })

    it('should return the an instance and visit', () => {
        class A { constructor() { } };
        class B { constructor(readonly a = pea(A)) { } };
        class C { constructor(readonly b = pea(B)) { } };


        class D {
            constructor(readonly a = pea(A), readonly b = pea(B), readonly c = pea(C)) { }
        };

        ctx.resolve(D);

        const all = new Set();
        ctx.visit(D, (_, key) => {
            all.add(key);
            return undefined;
        });
        expect(all.size).toBe(4);
        expect(all.has(D)).toBe(true);
        expect(all.has(A)).toBe(true);
        expect(all.has(B)).toBe(true);
        expect(all.has(C)).toBe(true);


    });

})