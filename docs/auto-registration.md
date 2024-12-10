# Auto Registration

`Pea` provides automatic registration capabilities for both constructors and factories, making dependency management more convenient and reducing boilerplate code.

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
    },
  };
};

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
  constructor(readonly dbUrl = "postgres://localhost:5432") {}
}

const createDatabase = (config = pea(ConfigService)) => {
  return {
    connect: async () => {
      // Use config.dbUrl
    },
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
  constructor(private cache = pea(createCache)) {}
}
```

## Scoped Auto Registration

### 1. Factory Return Types

Be explicit about factory return types:

```typescript
import { pea, context } from "@speajus/pea";

interface Logger {
  log(message: string): void;
}

const createLogger = (): Logger => {
  return {
    log: (message) => console.log(message),
  };
};

// Type-safe auto registration
class Service {
  constructor(private logger = pea(createLogger)) {}
}
```

### 3. Testing Considerations

Override auto-registered services in tests:

```typescript
import { context } from "@speajus/pea";

describe("UserService", () => {
  beforeEach(() => {
    // Override auto-registered dependencies
    context.register(LoggerService, {
      log: vi.fn(),
    });
  });

  it("should create user", () => {
    const userService = context.resolve(UserService);
    // Test with mocked dependencies
  });
});
```

## Limitations

### Circular Dependencies

Auto registration doesn't prevent circular dependencies, but does try to resolve them:

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
