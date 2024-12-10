# Manual Registration

While Pea supports auto-registration, manual registration provides more control over how services are created and managed. This guide covers various manual registration patterns and best practices.

## Basic Registration

### Class Registration

```typescript
import { pea, context } from "@speajus/pea";

class LoggerService {
  log(message: string) {
    console.log(message);
  }
}

// Register the class directly
context.register(LoggerService);

// Or register with a specific instance
//context.register(LoggerService, ()=>new LoggerService());

// Use the service
class UserService {
  constructor(private logger:LoggerService)) {
    this.logger.log("UserService initialized");
  }
}
const userService = context.resolve(UserService, pea(LoggerService));
```

### Factory Registration

```typescript
import { pea, context, peaKey } from "@speajus/pea";

// Define a factory function
const createDatabase = () => ({
  connect: async () => {
    // Database connection logic
  },
});

// Register using a factory
context.register(createDatabase);

// Or with a specific key
const dbKey = peaKey<ReturnType<typeof createDatabase>>("database");
context.register(dbKey, createDatabase);
```

## Advanced Registration

### Conditional Registration

```typescript
import { pea, context } from "@speajus/pea";
import { env } from "@speajus/pea/env";
}
// Environment-based registration
context.register(CacheService, (nodeEnv = env("NODE_ENV")) =>
nodeEnv == "production" ? new RedisCacheService() :  new InMemoryCacheService());

// Feature flag registration
const featureFlag = process.env.FEATURE_ENABLED === "true";
if (featureFlag) {
  context.register(FeatureService, new EnhancedFeatureService());
}
```

### Registration with Dependencies

```typescript
import { pea, context } from "@speajus/pea";

class ConfigService {
  constructor(readonly dbUrl = process.env.DATABASE_URL) {}
}

class DatabaseService {
  constructor(private config: ConfigService) {}
}

// Register with explicit dependencies
context.register(
  DatabaseService,
  (config = pea(ConfigService)) => new DatabaseService(config)
);
```

## Type-Safe Registration

### Using PeaKey

```typescript
import { pea, peaKey } from "@speajus/pea";

interface MetricsService {
  track(event: string): void;
}

const metricsKey = peaKey<MetricsService>("metrics");

// Type-safe registration
context.register(metricsKey, {
  track: (event) => console.log(event),
});

// Usage
class AnalyticsService {
  constructor(private metrics = pea(metricsKey)) {
    this.metrics.track("AnalyticsService.init");
  }
}
```

### Module Augmentation

```typescript
import { pea, peaKey } from "@speajus/pea";

const configKey = peaKey<Config>("config");

// Extend Registry type
declare module "@speajus/pea" {
  interface Registry {
    [configKey]: Config;
  }
}

// Now registration is type-safe
context.register(configKey, {
  apiUrl: "https://api.example.com",
});
```

## Registration Options

### Singleton vs Factory

```typescript
import { pea, context } from "@speajus/pea";

// Singleton (default)
context.register(UserService);

// New instance per resolution
context.register(UserService);

// Cached factory (singleton after first resolution)
context
  .register(UserService)
  .withCachable()
  .withOptional()
  .withDescription("This is the user service")
  .withName("UserService");
```

### Tags and Metadata

```typescript
import { pea, context } from "@speajus/pea";

// Register with tags
context.register(UserService).withTags("service", "user");

// Register with metadata
context.register(UserService).withMetadata({ version: "1.0.0" });
```

## Best Practices

1. **Explicit Dependencies**: Prefer explicit registration for core services to make dependencies clear.

   ```typescript
   context.register(CoreService, pea(LoggerService), pea(ConfigService));
   ```

2. **Configuration Management**: Use manual registration for configuration objects.

   ```typescript
   context.register(ConfigKey, {
     apiUrl: process.env.API_URL,
     timeout: parseInt(process.env.TIMEOUT ?? "5000"),
   });
   ```

3. **Testing**: Use manual registration to swap implementations in tests.

   ```typescript
   // In tests
   context.register(DatabaseService, new MockDatabaseService());
   ```

4. **Lifecycle Management**: Use registration hooks for cleanup.
   ```typescript
   context.register(DatabaseService).onDispose(async (service) => {
     await service.disconnect();
   });
   ```

## Common Patterns

### Plugin Registration

```typescript
import { pea, context, peaKey } from "@speajus/pea";

const pluginKey = peaKey<Plugin[]>("plugins");

context.register(AuthPlugin).withTag(pluginKey);
context.register(LoggingPlugin).withTag(pluginKey);
context.register(MetricsPlugin).withTag(pluginKey);

// Access all plugins
class PluginManager {
  constructor(private plugins = context.listOf(pluginKey)) {
    this.plugins.forEach((plugin) => plugin.initialize());
  }
}
```

### Feature Toggles

```typescript
import { pea, context, peaKey } from "@speajus/pea";

interface FeatureFlag {
  newUI: boolean;
  beta: boolean;
}
const featureKey = peaKey<FeatureFlag>("features");

// Register feature flags
context.register(featureKey, {
  newUI: process.env.ENABLE_NEW_UI === "true",
  beta: process.env.ENABLE_BETA === "true",
});
```
