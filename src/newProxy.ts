import { isPrimitiveType } from "./guards";
import  type { Primitive, PrimitiveType,  Class } from "./types";

export function newProxy<T extends Class>(
    instance:()=>InstanceType<T>
   ) {
       return new Proxy({} as InstanceType<T>, {
           get(_target, prop) {
             return instance()[prop];
           },
           set(_target, prop, value) {
             instance()[prop] = value;
             return true;
           },
           ownKeys: () => {
             return Object.keys(instance());
           },
           getPrototypeOf: () => {
             return Object.getPrototypeOf(instance());
           },
         });
    
    }


export function createPrimitiveProxy(primitiveVal:Primitive | PrimitiveType, fn:()=>Primitive) {

      return new Proxy(Object(primitiveVal), {
        get(target, prop) {
          if (prop in target) {
            return (Object(fn()) as any)[prop];
          } else {
            return Reflect.get(target.valueOf(), prop);
          }
        },
        set(target, prop, value) {
          if (prop in target) {
            Object(fn())[prop] = value;
          } else {
            throw new Error("Cannot set properties on primitive values");
          }
          return true;
        }
      });
    }
    
    