import { newProxy } from "./newProxy";
import { Registry } from "./registry";
import { serviceSymbol } from "./symbols";
import { has, hasA, isConstructor, isFn, isService, isSymbol } from "./guards";
import type { Service, Constructor, CtxClass, CtxFn, CtxValue, Fn } from "./types";

 type Ctx<T> = (CtxClass<T> | CtxFn<T> | CtxValue<T>) & { resolved: boolean };

type MapKey = symbol | Constructor | Fn | keyof Registry;
class Context {
   #map = new Map<MapKey, Ctx<any>>();
   proxyObject<T extends Fn>(service:T&Service):ReturnType<T>;
   proxyObject<T extends Fn>(service:T):ReturnType<T>;
   proxyObject<T extends Constructor>(service:T&Service):InstanceType<T>;
   proxyObject<T extends Constructor>(service:T):InstanceType<T>;
   proxyObject<T extends keyof Registry>(service:T):Registry[T];
   proxyObject<T>(service:T):T extends keyof Registry ? Registry[T] : T extends Constructor ? InstanceType<T> : T extends Fn ? ReturnType<T> : never{
    const ctx = this.#map.get(service as MapKey);
    if (ctx?.resolved){
        return ctx.instance as any;
    }
    return newProxy(()=>{
        return this.resolve(service as any);
    });
   }

   
   register<T extends Fn>(service:symbol, fn:T, ...args:Parameters<T>):this;
   register<T extends Constructor>(service:symbol, constructor:T, ...args:ConstructorParameters<T>): this;
   register<T extends keyof Registry>(service:T, value:Registry[T]): this;
   register<T extends Constructor>(service:T, ...args:ConstructorParameters<T>): this;
   register<T extends Fn>(service:T, ...args:any[]): this;
   register<T>(service:symbol,  ..._args:any[]): this {
     let serv:Constructor | Fn | unknown;
     let key:MapKey  = service;
     let args:any[] = _args;
      if (isService(service)){
             key = service[serviceSymbol];
             serv = service;
             args = _args;
        }else if (isSymbol(service)){
          key = service;
          serv = _args[0];
          args = _args.slice(1);
      }else {
        serv = service;
        key = service;
      }
       let ctx:Ctx<any>;
       if (isFn(serv)){
         if (isConstructor(serv)){
             ctx = {
                constructor:serv,
                resolved:false,
                args
             };
         }else{
            ctx = {
                factory:serv,
                resolved:false,
                args
            }
         }
       }else{
        ctx = {
            instance:serv,
            resolved:true
        }
       }
       this.#map.set(key, ctx);
       return this;
   }
   resolve<T extends Constructor>(key:symbol, service:T, ...args:ConstructorParameters<T>): InstanceType<T> ;
   resolve<T extends  Fn >(key:symbol, service:T, ...args:Parameters<T>): ReturnType<T> ;
   resolve<T extends Constructor>(service:T & Service, ...args:ConstructorParameters<T>): InstanceType<T> ;
   resolve<T extends Constructor>(service:T, ...args:ConstructorParameters<T>): InstanceType<T> ;
   resolve<T extends  Fn >(service:T, ...args:Parameters<T>): ReturnType<T> ;
   resolve<T extends keyof Registry>(service:T): Registry[T] ;
   resolve<T extends (Constructor & Service) | Fn | keyof Registry>(service:T, ..._args:any[]) {
    const key:MapKey = isService(service) ? service[serviceSymbol] : service;
    const ctx = this.#map.get(key);

    const serv = isSymbol(service) ? _args[0] : service;
    const args = has(ctx, 'args') ? (ctx as any)?.args : isSymbol(service) ? _args.slice(1) : _args;
    if (ctx?.resolved){
        return ctx.instance;
    }
    if (serv){
        if (!ctx){
           return this.register(key as any, serv, ...args).resolve(key as any);
        }
       if (ctx.resolved){
            return ctx.instance;
        }
        if ( hasA(ctx,'factory', isFn)  ){
            ctx.resolved = true;
            return (ctx.instance =  ctx.factory(...args as any));
        }   
        if ( hasA(ctx,'constructor', isFn)  ){
            ctx.resolved = true;
            ctx.instance = new ctx.constructor(...args as any)
            return ctx.instance;
        }
        throw new Error(`service '${String(service)}' not registered`);
     }else if (ctx){ 
        if (!ctx.resolved){
            if (has(ctx, 'constructor')){
                ctx.instance =  new ctx.constructor(...args as any);
              }else if (hasA(ctx, 'factory', isFn)){
                (ctx as any).instance = (ctx as any).factory(...args as any);
            }
           ctx.resolved = true;
        }
        return ctx.instance;
    }else{
        return this.register(key as any, serv, ...args)
        .resolve(key as any);

     }
   }
}

export const context = new Context();
export function pea<T extends keyof Registry>(service:T):Registry[T];
export function pea<T extends Fn, K extends keyof Registry>(fn:T & {[serviceSymbol]:K}):Registry[K];
export function pea<T extends Constructor, K extends keyof Registry>(fn:T & {[serviceSymbol]:K}):Registry[K];
export function pea<T extends Constructor>(constructor:T):InstanceType<T> ;
export function pea<T extends Fn>(factory:T):ReturnType<T> ;

export function pea<T extends Constructor | Fn | keyof Registry>(service:T): 
T extends Constructor ? InstanceType<T> : T extends Fn ? ReturnType<T>  :
 T extends keyof Registry ? Registry[T] : never {
    return context.proxyObject(service as any)    
};

