
import {it, describe, expect } from 'vitest';
import { context as ctx, pea, serviceSymbol } from '@spea/pea';

const aiSymbol =  Symbol('a');
const abSymbol = Symbol('b');
class A {
    static readonly [serviceSymbol]= aiSymbol;
    constructor(private readonly connectionUrl: string){
    }
    connection(){
        return this.connectionUrl;
    }
}
type AI = InstanceType<typeof A>;
declare module "@spea/registry" {
    export interface Registry {
        [aiSymbol]: AI;
        [abSymbol]: string;
    }   
}

describe('pea test', ()=>{
    
    it('should return the an instance', ()=>{

        const connectionInstance = ctx.register(abSymbol, "myconnection")
                .resolve(abSymbol)
        
        expect(connectionInstance).toBe("myconnection");


      ctx.register(aiSymbol,  A, pea(abSymbol));
         const ainstance =          ctx.resolve(aiSymbol);

        expect(ainstance.connection()).toBe("myconnection");
    });

    it('should instatiate classes that', ()=>{
        class B {}
        expect(ctx.resolve(B)).toBeInstanceOf(B);
    });

    it('should return factory functions', ()=>{
        const fn= ()=>{
            return 'fn';
        }
        const result = ctx.register(fn);
        expect(result.resolve(fn)).toBe('fn');
    });

})