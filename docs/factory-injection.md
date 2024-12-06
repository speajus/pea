
# Factory Injection

Factory injection in Pea allows you to create instances with runtime parameters and complex initialization logic. This pattern is particularly useful when services require configuration or when you need different instances based on runtime conditions.

## Basic Factory Usage

Register a factory function instead of a class:

```typescript
import { pea, context, peaKey } from "@speajus/pea";

// Define a service with configuration
class DatabaseConnection {
  constructor(
    private host: string,
    private port: number
  ) {}
}

// Register with a factory function
context.register(DatabaseConnection, (config = pea(ConfigService)) => {
  return new DatabaseConnection(
    config.dbHost,
    config.dbPort
  );
});
```

## Using PeaKeys with Factories

For better type safety, use `peaKey` with your factories:

```typescript
interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const cacheKey = peaKey<Cache>("cache");

// Register different implementations based on environment
context.register(cacheKey, (config = pea(ConfigService)) => {
  if (config.environment === "production") {
    return new RedisCache(config.redisUrl);
  }
  return new MemoryCache();
});
```

## Factory Dependencies

Factories can depend on other services:

```typescript
class EmailService {
  constructor(
    private apiKey: string,
    private logger: LoggerService
  ) {}
}

context.register(EmailService, (
  config = pea(ConfigService),
  logger = pea(LoggerService)
) => {
  return new EmailService(
    config.emailApiKey,
    logger
  );
});
```


## Factory Patterns

### Conditional Creation

Create different implementations based on conditions:

```typescript
const loggerKey = peaKey<Logger>("logger");

context.register(loggerKey, (config = pea(ConfigService)) => {
  switch (config.environment) {
    case "production":
      return new CloudLogger(config.cloudApiKey);
    case "development":
      return new ConsoleLogger();
    case "test":
      return new TestLogger();
    default:
      return new NoopLogger();
  }
});
```

### Factory with Options

Pass configuration objects to factories:

```typescript
interface HttpClientOptions {
  baseUrl: string;
  timeout: number;
  retries: number;
}

const httpClientKey = peaKey<HttpClient>("http-client");

context.register(httpClientKey, (
  config = pea(ConfigService),
  logger = pea(LoggerService),
  retries = pea(RetriesService)
) => {
  return new HttpClient({config, logger, retries}, logger);
});
```

### Factory Composition

Compose multiple factories together:

```typescript
const apiClientKey = peaKey<ApiClient>("api-client");

context.register(apiClientKey, (
  http = pea(httpClientKey),
  auth = pea(AuthService),
  cache = pea(cacheKey)
) => {
  return new ApiClient({
    httpClient: http,
    authService: auth,
    cache: cache
  });
});
```

## Best Practices

1. **Use Type Safety**: Always define return types for factories:
   ```typescript
   // Good
   context.register(dbKey, (config: ConfigService): DatabaseConnection => {
     return new DatabaseConnection(config.dbUrl);
   });
   
   // Bad - Missing return type
   context.register(dbKey, (config) => {
     return new DatabaseConnection(config.dbUrl);
   });
   ```

2. **Default Parameters**: Use default parameters with `pea()`:
   ```typescript
   // Good
   context.register(serviceKey, (
     config = pea(ConfigService),
     logger = pea(LoggerService)
   ) => {
     return new Service(config, logger);
   });
   ```

3. **Error Handling**: Handle factory initialization errors:
   ```typescript
   context.register(dbKey, async (config = pea(ConfigService)) => {
     try {
       return await DatabaseConnection.create(config.dbUrl);
     } catch (error) {
       logger.error("Failed to create database connection", error);
       throw new ServiceInitializationError(error);
     }
   });
   ```

## Common Use Cases

### Connection Pools

```typescript
const poolKey = peaKey<Pool>("database-pool");

context.register(poolKey, async (config = pea(ConfigService)) => {
  const pool = await createPool({
    host: config.dbHost,
    port: config.dbPort,
    max: config.maxConnections,
    idleTimeout: config.idleTimeout
  });
  
  // Clean up on application shutdown
  process.on("SIGTERM", () => pool.end());
  
  return pool;
});
```

### Feature Flags

```typescript
const featureKey = peaKey<FeatureService>("features");

context.register(featureKey, (config = pea(ConfigService)) => {
  return new FeatureService({
    enableNewUI: config.environment === "development",
    enableBetaFeatures: config.betaUsers.includes(config.currentUser),
    enableMetrics: config.environment === "production"
  });
});
```
