# Registry and Module Augmentation

The Pea registry system uses TypeScript's module augmentation to provide type safety for your dependency injection. This allows you to define the types of your services at compile time and get full type checking and IntelliSense support.

## Basic Registry Augmentation

### Declaring Service Types

To register your service types with Pea, augment the `Registry` interface:

```typescript
import { peaKey } from "@speajus/pea";

// Define your service
interface DatabaseService {
  connect(): Promise<void>;
  query(sql: string): Promise<any>;
}

// Create a key
const dbKey = Symbol("DatabaseService");

// Augment the registry
declare module "@speajus/pea" {
  interface Registry {
    [dbKey]: DatabaseService;
  }
}
```

## Type Safety Features

### Constructor Registration

```typescript
class LoggerService {
  log(message: string): void {
    console.log(message);
  }
}

declare module "@speajus/pea" {
  interface Registry {
    [typeof LoggerService]: InstanceType<typeof LoggerService>;
  }
}

// Type-safe registration
context.register(LoggerService);
```

### Factory Registration

```typescript
interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const cacheKey = peaKey<CacheService>("cache");

declare module "@speajus/pea" {
  interface Registry {
    [cacheKey]: CacheService;
  }
}

// Type-safe factory registration
context.register(cacheKey, (config = pea(ConfigService)) => {
  return new RedisCacheService(config.redisUrl);
});
```

## Advanced Usage

### Multiple Service Implementations

```typescript
interface AuthProvider {
  authenticate(token: string): Promise<boolean>;
}

const localAuthKey = peaKey<AuthProvider>("local-auth");
const oauthKey = peaKey<AuthProvider>("oauth");

declare module "@speajus/pea" {
  interface Registry {
    [localAuthKey]: AuthProvider;
    [oauthKey]: AuthProvider;
  }
}
```

### Generic Services

```typescript
interface Repository<T> {
  findById(id: string): Promise<T>;
  save(entity: T): Promise<void>;
}

interface User {
  id: string;
  name: string;
}

const userRepoKey = peaKey<Repository<User>>("user-repository");

declare module "@speajus/pea" {
  interface Registry {
    [userRepoKey]: Repository<User>;
  }
}
```

## Best Practices

### 1. Centralize Registry Declarations

Create a dedicated types file for your registry declarations:

```typescript
// types/registry.ts
import { peaKey } from "@speajus/pea";
import type { 
  UserService, 
  AuthService, 
  LoggerService 
} from "../services";

export const userServiceKey = peaKey<UserService>("user");
export const authServiceKey = peaKey<AuthService>("auth");
export const loggerServiceKey = peaKey<LoggerService>("logger");

declare module "@speajus/pea" {
  interface Registry {
    [userServiceKey]: UserService;
    [authServiceKey]: AuthService;
    [loggerServiceKey]: LoggerService;
  }
}
```

### 2. Use Symbol Service Keys

```typescript
// services/database/types.ts
export const dbServiceSymbol = Symbol("DatabaseService");

declare module "@speajus/pea" {
  interface Registry {
    [dbServiceSymbol]: DatabaseService;
  }
}
```

### 3. Group Related Services

```typescript
// features/auth/types.ts
export const authKeys = {
  service: peaKey<AuthService>("auth-service"),
  provider: peaKey<AuthProvider>("auth-provider"),
  cache: peaKey<AuthCache>("auth-cache")
} as const;

declare module "@speajus/pea" {
  interface Registry {
    [authKeys.service]: AuthService;
    [authKeys.provider]: AuthProvider;
    [authKeys.cache]: AuthCache;
  }
}
```

### 4. Document Service Contracts

```typescript
/**
 * Represents a caching service for the application
 * @interface CacheService
 */
interface CacheService {
  /**
   * Retrieves a value from cache
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  get(key: string): Promise<string | null>;
  
  /**
   * Stores a value in cache
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds
   */
  set(key: string, value: string, ttl?: number): Promise<void>;
}

declare module "@speajus/pea" {
  interface Registry {
    [cacheServiceKey]: CacheService;
  }
}
```

## Common Patterns

### Factory with Dependencies

```typescript
interface Config {
  apiUrl: string;
  apiKey: string;
}

interface ApiClient {
  get(path: string): Promise<any>;
  post(path: string, data: any): Promise<any>;
}

const configKey = peaKey<Config>("config");
const apiClientKey = peaKey<ApiClient>("api-client");

declare module "@speajus/pea" {
  interface Registry {
    [configKey]: Config;
    [apiClientKey]: ApiClient;
  }
}

// Type-safe factory with dependencies
context.register(apiClientKey, (
  config = pea(configKey),
  logger = pea(LoggerService)
) => {
  return new ApiClientImpl(config, logger);
});
```

### Conditional Registration

```typescript
interface EmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

const emailKey = peaKey<EmailProvider>("email");

declare module "@speajus/pea" {
  interface Registry {
    [emailKey]: EmailProvider;
  }
}

// Register different implementations based on environment
if (process.env.NODE_ENV === "production") {
  context.register(emailKey, () => new AwsEmailProvider());
} else {
  context.register(emailKey, () => new MockEmailProvider());
}
```

### Testing Support

```typescript
// test/mocks/registry.ts
declare module "@speajus/pea" {
  interface Registry {
    [dbKey]: jest.Mocked<DatabaseService>;
    [authKey]: jest.Mocked<AuthService>;
  }
}

// test/setup.ts
context.register(dbKey, () => createMock<DatabaseService>());
context.register(authKey, () => createMock<AuthService>());
```
```
</augment_code_snippet>

This documentation covers module augmentation in Pea's registry system, including basic usage, type safety features, advanced patterns, and best practices for maintaining a type-safe dependency injection system.
