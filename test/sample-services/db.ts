import { serviceSymbol } from "@spea/pea/symbols";
import {pea } from "../../src/context";

export const dbServiceSymbol = Symbol('db-service-type');

declare module "@spea/registry" {
 export interface Registry {
    [dbServiceSymbol]:typeof DBService;
    [connectionSymbol]:string;
 }
}

export interface IDBService  {
    connection():string;
}

export const connectionSymbol = Symbol('db-service-connection');

export class DBService  implements IDBService {
    
    public static readonly [serviceSymbol] = dbServiceSymbol;

    constructor(private readonly connectionUrl: string = pea(connectionSymbol)){
    }
    connection(){
        return this.connectionUrl;;
    }
}