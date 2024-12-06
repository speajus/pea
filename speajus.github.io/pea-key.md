## Using PeaKeys

For the most separation of concerns, with type safety and runtime flexibility, use the `peaKey`.
PeaKeys are symbols that are used to register and retrieve services, they fake having a type, kinda
like branded types.   We can use this type information for convenient tokens.

## Interfaces
Separate your interfaces from your implementation.

```typescript 
# interfaces.ts
// Define your interfaces
interface LoggerService {
  log(message: string): void;
}

interface DatabaseService {
  findUser(id: string): Promise<User>;
}

```

```typescript
# pea-keys.ts
import {  peaKey } from "@speajus/pea";
import type { LoggerService, DatabaseService } from "./interfaces";


// Define your keys
const loggerKey = peaKey<LoggerService>("@yourservice/logger");
const dbKey = peaKey<DatabaseService>("@yourservice/database");

```

## Registering Services

Register services with `context.register()`:

```typescript 
# services.ts
import { context } from "@speajus/pea";
import type { LoggerService, DatabaseService } from "./interfaces";
import { loggerKey, dbKey } from "./services";

class LoggerServiceImpl implements LoggerService {
    ...
}
class DatabaseServiceImpl implements DatabaseService {
    ...
}

context.register(loggerKey, LoggerService);
context.register(dbKey, DatabaseService);


```