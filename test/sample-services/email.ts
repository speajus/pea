import { authServiceSymbol,  } from "./auth";
import { DBService, IDBService } from "./db";
import { pea,  } from "@spea/pea";
declare module "@spea/registry" {

 interface Registry {
    [emailServiceSymbol]: typeof EmailService;
 }
}
export const emailServiceSymbol = Symbol("email-service-type");

export class EmailService {
    static service = emailServiceSymbol;
    constructor(private authService = pea(authServiceSymbol), private dbService: IDBService = pea(DBService)) {}

    async sendEmail(to: string, subject: string, body: string) {
        if (await this.authService.isAuthenticated()){
            console.log('authenticated');
        }
        if (this.dbService.connection()){
            console.log('connected');
        }
        console.log(`Email sent to ${to} with subject "${subject}" and body "${body}"`);
    }
}