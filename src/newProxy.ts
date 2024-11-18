import { type Class } from "./types";

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