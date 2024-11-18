import { AsyncLocalStorage } from "async_hooks";
import { type Class } from "./types";
import { newProxy } from "./newProxy";

/**
 * You can create your own 'scopes' this function.  This
 * will keep all the results in memory for the duration of the scope.
 * 
 * <code>
 *  const [requestScope, withRequestScope] = scope();
 *  const app = express();
 *  class User { constructor(public username?:string)}
 *  const user = withRequestScope(User);  
 * 
 *  app.use((req,res,next)=>{
 *    requestScope(()=>{
 *      user.username = req.headers['X-User'];
 *      return next();
 *    });
 *  })
 * 
 * 
 *  
 *  class MyService {
 *    constructor(private user:User){
 *    }
 *    doSomething(){
 *        console.log('myService',this.user.username);
 *    }
 *  }
 * 
 *  const myService = singleton(MyService, user);
 *  
 * app.get('/', (req,res)=>{
 *   myService.doSomething();
 * }) 
 * 
 * </code>
 * @returns 
 */

export function scope(){
const requestLocalStorage = new AsyncLocalStorage<
  Map<Class, InstanceType<Class>>
>();

const run = (fn: () => Promise<unknown>) => {
  requestLocalStorage.run( new Map<Class, InstanceType<Class>>(), ()=>{
    return fn();
  });
};

return [run, function withScope<T extends Class>(
  Constructor: T,
  ...args: ConstructorParameters<T>
):  InstanceType<T> {

  return newProxy(()=> {
    const store = requestLocalStorage.getStore();
    if (!store) {
      throw new Error(`must be called within a request`);
    }
    if (store.has(Constructor)) {
      return store.get(Constructor)! as InstanceType<T>;
    }
    let instance = new Constructor(...args);
    store.set(Constructor, instance);
    return instance;
  });

}];
}
