import { describe, it, expect } from "vitest";
import { isConstructor } from "../src/guards";


describe('guards test', ()=>{
    it('should be a constructor', ()=>{
        expect(isConstructor(class A {})).toBe(true);
    })
    it('should not be a constructor fat arrow', ()=>{
        expect(isConstructor(()=>void 0)).toBe(false);
    });
    // it('should not be a constructor', ()=>{
    //     function fn(){
    //         return true;
    //     }
    //     console.log(fn.prototype.constructor.name);
    //     expect(isConstructor(fn)).toBe(false);
    // })

})