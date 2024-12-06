# Manual Registration

While Pea supports auto-registration, manual registration gives you more control over how services are created and managed. Understanding manual registration is crucial as it follows the "last registration wins" principle while maintaining singleton instances.

## Basic Registration

### Class Registration

```typescript
import { pea, context } from "@speajus/pea";

class LoggerService {
  log(message: string) {
    console.log(message);
  }
}

// Register the class
context.register(LoggerService);

// Or register with a specific instance
context.register(LoggerService, new LoggerService());
```

### Factory Registration

```typescript
import { pea, context, peaKey } from "@speajus/pea";

interface DatabaseConnection {
  query(sql: string): Promise<any>;
}

const dbKey = peaKey<DatabaseConnection>("database");

// Register using a factory function
context.register(dbKey, (config = pea(ConfigService)) => {
  return new PostgresConnection(config.dbUrl);
});
```

## Last Registration Wins

Pea follows the "last registration wins" principle, where the most recent registration for a key becomes the active one:

```typescript
import { pea, context, peaKey } from "@speajus/pea";

interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const cacheKey = peaKey<Cache>("cache");

// First registration
context.register(cacheKey, () => new MemoryCache());

// Second registration - this one wins
context.register(cacheKey, () => new RedisCache());

// All resolutions will use RedisCache
const cache = context.resolve(cacheKey); // Returns RedisCache instance
```

## Singleton Behavior

Every registered service is a singleton by default. The same instance is returned for all resolutions:

```typescript
import { pea, context } from "@speajus/pea";

class UserService {
  private counter = 0;
  
  increment() {
    this.counter++;
    return this.counter;
  }
}

context.register(UserService);

// Both references point to the same instance
const service1 = context.resolve(UserService);
const service2 = context.resolve(UserService);

service1.increment(); // Returns 1
service2.increment(); // Returns 2 (same instance)

console.log(service1 === service2); // true
```

### Factory Singletons

Even factory-created instances are singletons:

```typescript
import { pea, context, peaKey } from "@speajus/pea";

interface Config {
  apiUrl: string;
}

const configKey = peaKey<Config>("config");

// Factory is called only once
context.register(configKey, () => ({
  apiUrl: process.env.API_URL ?? "http://localhost:3000"
}));

// Both resolve to the same instance
const config1 = context.resolve(configKey);
const config2 = context.resolve(configKey);

console.log(config1 === config2); // true
```

## Overriding Registrations

### Development vs Production

```typescript
import { pea, context, peaKey } from "@speajus/pea";

interface EmailService {
  sendEmail(to: string, body: string): Promise<void>;
}

const emailKey = peaKey<EmailService>("email");

// Development registration
if (process.env.NODE_ENV === "development") {
  context.register(emailKey, () => ({
    sendEmail: async (to, body) => {
      console.log(`[DEV] Email to ${to}: ${body}`);
    }
  }));
}

// Production registration
if (process.env.NODE_ENV === "production") {
  context.register(emailKey, () => new AwsSesEmailService());
}
```

### Testing Overrides

```typescript
import { pea, context } from "@speajus/pea";

describe("UserService", () => {
  beforeEach(() => {
    // Override for testing - last registration wins
    context.register(DatabaseService, {
      query: vi.fn().mockResolvedValue([])
    });
  });

  it("should fetch users", async () => {
    const userService = context.resolve(UserService);
    await userService.getUsers();
  });
});
```

## Best Practices

### 1. Centralize Registrations

```typescript
// registry.ts
export function setupRegistry() {
  // Core services
  context.register(LoggerService);
  context.register(ConfigService);
  
  // Feature services
  context.register(UserService);
  context.register(AuthService);
  
  // Environment-specific overrides
  if (process.env.NODE_ENV === "production") {
    context.register(CacheService, new RedisCacheService());
  }
}
```

### 2. Type Safety

```typescript
import { pea, peaKey } from "@speajus/pea";

interface MetricsService {
  track(event: string, data: unknown): void;
}

const metricsKey = peaKey<MetricsService>("metrics");

declare module "@speajus/pea" {
  interface Registry {
    [metricsKey]: MetricsService;
  }
}

// Type-safe registration
context.register(metricsKey, {
  track: (event, data) => {
    // Implementation
  }
});
```

### 3. Explicit Dependencies

```typescript
import { pea, context } from "@speajus/pea";

// Good: Dependencies are clear
context.register(ApiClient, (
  config = pea(ConfigService),
  logger = pea(LoggerService),
  metrics = pea(MetricsService)
) => {
  return new ApiClient(config, logger, metrics);
});
```

## Common Patterns

### Configuration Override

```typescript
import { pea, context, peaKey } from "@speajus/pea";

const configKey = peaKey<Config>("config");

// Base configuration
context.register(configKey, {
  apiUrl: "http://api.example.com",
  timeout: 5000
});

// Override in tests
if (process.env.NODE_ENV === "test") {
  context.register(configKey, {
    apiUrl: "http://localhost:3000",
    timeout: 1000
  });
}
```

### Feature Flags

```typescript
import { pea, context, peaKey } from "@speajus/pea";

interface FeatureService {
  isEnabled(feature: string): boolean;
}

const featureKey = peaKey<FeatureService>("features");

// Register based on environment
context.register(featureKey, (config = pea(ConfigService)) => {
  if (config.environment === "production") {
    return new RemoteFeatureService();
  }
  return new LocalFeatureService();
});
```

### Options
When manually registering a service you have several options you can specify.

### Cacheable
You can disable caching for a service by using the `withCacheable` method. When
caching is disabled each time the service is resolved it will be resolved again.

```typescript
import { pea, context, peaKey } from "@speajus/pea";

class Random {
  value: number;
  constructor(private readonly max = 100}){
    this.value = Math.floor(Math.random() * this.max)
  }
}

context.register(Random).withCacheable(false)
```

### Args
You can change the resolved args of a service by using the `withArgs` method.

```typescript
import { pea, context, peaKey } from "@speajus/pea";

class Random {
  value: number;
  constructor(private readonly max = 100}){
    this.value = Math.floor(Math.random() * this.max)
  }
}

context.register(Random).withArgs(1000)
```

### With Value
You can set a value by using `withValue`.  This
will not be invoked.

```typescript
import { pea, context, peaKey } from "@speajus/pea";

const numKey = peaKey<number>("num")

context.register(numKey).withValue(1000);

```
