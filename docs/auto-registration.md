
# Auto Registration

Pea provides automatic registration capabilities for both constructors and factories, making dependency management more convenient and reducing boilerplate code.

## Constructor Auto Registration

### Basic Auto Registration

When a class is used as a dependency without explicit registration, Pea will automatically register it:

```typescript
import { pea, context } from "@speajus/pea";

class LoggerService {
  log(message: string) {
    console.log(message);
  }
}

// No explicit registration needed
class UserService {
  constructor(private logger = pea(LoggerService)) {}
  
  createUser() {
    this.logger.log("Creating user...");
  }
}

// LoggerService is automatically registered
const userService = context.resolve(UserService);
```


## Factory Auto Registration

### Basic Factory Auto Registration

Factories are automatically registered when used as dependencies:

```typescript
import { pea, context, peaKey } from "@speajus/pea";

interface DatabaseConnection {
  query(sql: string): Promise<any>;
}

const dbFactory = () => {
  return {
    query: async (sql: string) => {
      // Implementation
    }
  };
};

const dbKey = peaKey<DatabaseConnection>("database");

// Factory is automatically registered
class Repository {
  constructor(private db = pea(dbFactory)) {}
}
```

### Factory with Dependencies

Auto-registered factories can use other dependencies:

```typescript
import { pea, context } from "@speajus/pea";

class ConfigService {
  constructor(
    readonly dbUrl = "postgres://localhost:5432"
  ) {}
}

const createDatabase = (config = pea(ConfigService)) => {
  return {
    connect: async () => {
      // Use config.dbUrl
    }
  };
};

// Both ConfigService and createDatabase are auto-registered
class UserRepository {
  constructor(private db = pea(createDatabase)) {}
}
```

## Conditional Auto Registration

### Environment-based Registration

Auto registration can be combined with conditional logic:

```typescript
import { pea, context, peaKey } from "@speajus/pea";

interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const cacheKey = peaKey<Cache>("cache");

const createCache = (config = pea(ConfigService)) => {
  if (config.environment === "production") {
    return new RedisCache(config.redisUrl);
  }
  return new MemoryCache();
};

// Cache implementation is auto-selected based on environment
class CacheService {
  constructor(private cache = pea(cacheKey)) {}
}
```

## Scoped Auto Registration

### Request-Scoped Services

Auto registration works with scoped services:

```typescript
import { pea, context } from "@speajus/pea";
import "@speajus/pea/async";

class RequestContext {
  constructor(
    readonly userId: string,
    readonly timestamp = Date.now()
  ) {}
}

// Auto-registered as request-scoped
class UserService {
  constructor(
    private context = pea(RequestContext),
    private db = pea(DatabaseService)
  ) {}
  
  async getCurrentUser() {
    return this.db.findUser(this.context.userId);
  }
}

app.use(async (req, res) => {
  const result = await context.scoped(RequestContext)(async () => {
    const userService = context.resolve(UserService);
    return userService.getCurrentUser();
  }, new RequestContext(req.userId));
});
```

## Best Practices

### 1. Explicit Types

Always declare types even with auto registration:

```typescript
import { pea, peaKey } from "@speajus/pea";

interface EmailService {
  sendEmail(to: string, subject: string): Promise<void>;
}

const emailKey = peaKey<EmailService>("email");

declare module "@speajus/pea" {
  interface Registry {
    [emailKey]: EmailService;
  }
}
```

### 2. Factory Return Types

Be explicit about factory return types:

```typescript
import { pea, context } from "@speajus/pea";

interface Logger {
  log(message: string): void;
}

const createLogger = (): Logger => {
  return {
    log: (message) => console.log(message)
  };
};

// Type-safe auto registration
class Service {
  constructor(private logger = pea(createLogger)) {}
}
```

### 3. Dependency Organization

Group related auto-registered services:

```typescript
import { pea, context } from "@speajus/pea";

// Group related services in a module
export class AuthModule {
  static register() {
    // Explicit registration when needed
    context.register(AuthService);
    context.register(TokenService);
    // Other services auto-register
  }
}

// Services auto-register when used
class AuthService {
  constructor(
    private tokens = pea(TokenService),
    private users = pea(UserService)
  ) {}
}
```

### 4. Testing Considerations

Override auto-registered services in tests:

```typescript
import { context } from "@speajus/pea";

describe("UserService", () => {
  beforeEach(() => {
    // Override auto-registered dependencies
    context.register(LoggerService, {
      log: vi.fn()
    });
  });

  it("should create user", () => {
    const userService = context.resolve(UserService);
    // Test with mocked dependencies
  });
});
```

## Limitations

### 1. Circular Dependencies

Auto registration doesn't prevent circular dependencies:

```typescript
// ❌ Bad: Circular dependency with auto registration
class ServiceA {
  constructor(private b = pea(ServiceB)) {}
}

class ServiceB {
  constructor(private a = pea(ServiceA)) {}
}

// ✅ Good: Use events or restructure
class ServiceA {
  constructor(private events = pea(EventBus)) {}
}
```

### 2. Initialization Order

Be careful with initialization order in auto-registered services:

```typescript
// ❌ Bad: Undefined initialization order
class Database {
  constructor() {
    // Initialization that depends on config
  }
}

// ✅ Good: Explicit initialization
const createDatabase = (config = pea(ConfigService)) => {
  return new Database(config);
};
```

### 3. Configuration

Some services might need explicit configuration:

```typescript
// ❌ Bad: Missing configuration
class ApiClient {
  constructor() {
    // No way to configure base URL
  }
}

// ✅ Good: Factory with configuration
const createApiClient = (config = pea(ConfigService)) => {
  return new ApiClient(config.apiUrl);
};
```
```
</augment_code_snippet>

This documentation covers auto registration features in Pea, including both constructor and factory auto registration, with best practices, examples, and common pitfalls to avoid. The examples demonstrate practical usage patterns while maintaining type safety and proper dependency management.
