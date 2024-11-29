import { peaKey, serviceSymbol } from "@speajus/pea";
import { pea } from "../../context";

export const dbServiceSymbol = peaKey<typeof DBService>("db-service-type");

export interface IDBService {
  connection(): string;
}

export const connectionPeaKey = peaKey<string>("connection");

export class DBService implements IDBService {
  public static readonly [serviceSymbol] = dbServiceSymbol;

  constructor(private readonly connectionUrl: string = pea(connectionPeaKey)) {}
  connection() {
    return this.connectionUrl;
  }
}
