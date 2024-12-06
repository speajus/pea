# Getting Started with Pea

## Basic Concepts

Pea is built around three core concepts:
- `context` - The container that manages your dependencies
- `pea()` - The function used to inject dependencies
- `peaKey` - Type-safe symbols for service registration

## Basic Usage

### 1. Service Registration

There are several ways to register services with Pea:

```typescript
import { pea, context, peaKey } from "@speajus/pea";

// Method 1: Direct class registration
class LoggerService {
  log(message: string) {
    console.log(message);
  }
}
context.register(LoggerService);

// Method 2: Using peaKey (recommended)
const dbServiceKey = peaKey<DatabaseService>("database");
context.register(dbServiceKey, DatabaseService);

// Method 3: Factory registration
context.register(dbServiceKey, () => {
  return new DatabaseService("connection-string");
});
```

### 2. Dependency Injection

Inject dependencies using the `pea()` function:

```typescript
class UserService {
  // Constructor injection
  constructor(
    private logger = pea(LoggerService),
    private db = pea(dbServiceKey)
  ) {}

  async getUser(id: string) {
    this.logger.log(`Fetching user ${id}`);
    return this.db.findUser(id);
  }
}
```

### 3. Service Resolution

Resolve services using `context.resolve()`:

```typescript
const userService = context.resolve(UserService);
await userService.getUser("123");
```

## Type Safety

Pea provides full TypeScript support. Define your registry types for better type inference:

```typescript
declare module "@speajus/pea" {
  export interface Registry {
    [dbServiceKey]: DatabaseService;
  }
}
```

## Environment Variables

Pea includes built-in support for environment variables:

```typescript
import { env, envRequired } from "@speajus/pea/env";

class ConfigService {
  // Optional environment variable with default
  readonly apiUrl = env("API_URL", "http://localhost:3000");
  
  // Required environment variable
  readonly apiKey = envRequired("API_KEY");
}
```

## Async Context

For web applications, Pea supports request-scoped dependencies:

```typescript
import "@speajus/pea/async";

const sessionKey = peaKey<Session>("session");

// In your middleware
app.use((req, res, next) => {
  const requestScoped = context.scoped(sessionKey);
  requestScoped(next, getCurrentSession());
});

// In your service
class AuthService {
  constructor(private session = pea(sessionKey)) {}
  
  isAuthenticated() {
    return Boolean(this.session?.user);
  }
}
```

## Best Practices

1. Use `peaKey` for service registration:
   ```typescript
   const loggerKey = peaKey<LoggerService>("logger");
   ```

2. Register services at application startup:
   ```typescript
   export function register() {
     context.register(loggerKey, LoggerService);
     context.register(dbKey, DatabaseService);
   }
   ```

3. Use factory functions for configurable services:
   ```typescript
   context.register(dbKey, (config = pea(ConfigService)) => {
     return new DatabaseService(config.connectionString);
   });
   ```

4. Keep services focused and follow single responsibility principle:
   ```typescript
   class UserService {
     constructor(
       private db = pea(dbKey),
       private logger = pea(loggerKey),
       private auth = pea(authKey)
     ) {}
   }
   ```

## Next Steps

- Explore the [examples](https://github.com/speajus/pea/tree/main/examples) for real-world usage
- Read the [API documentation](https://speajus.github.io/pea) for detailed information
- Check out integration examples with popular frameworks:
  - Express
  - Drizzle ORM
  - Auth.js
