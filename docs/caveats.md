# Caveats and Limitations

When using Pea, it's important to understand certain limitations and behaviors that come from its proxy-based implementation. This guide covers common pitfalls and how to avoid them.

## Proxy Behavior

### Property Access

#### No Property Copying

Pea uses JavaScript Proxies, which means properties are accessed dynamically. The proxy doesn't keep copies of properties:

### Avoid Destructuring Dependencies

```typescript
class EmailService {
  constructor(private deps = pea(Dependencies)) {}
  
  // ❌ Bad: Destructuring breaks proxy
  sendEmail() {
    const { logger, mailer } = this.deps;
    logger.log("Sending email"); // May fail
  }
  
  // ✅ Good: Keep proxy intact
  sendEmail() {
    this.deps.logger.log("Sending email");
    this.deps.mailer.send();
  }
}
```

### Spread Operator Limitations

The spread operator doesn't work well with proxies:

```typescript
class ConfigService {
  constructor(private config = pea(AppConfig)) {}
  
  // ❌ Bad: Spread operator breaks proxy
  getFullConfig() {
    return { ...this.config };
  }
  
  // ✅ Good: Return specific properties
  getFullConfig() {
    return {
      apiUrl: this.config.apiUrl,
      timeout: this.config.timeout
    };
  }
}
```

## Dependency Resolution

### Circular Dependencies

Pea can handle circular dependencies, but they should be avoided:

```typescript
// ❌ Bad: Circular dependency
class ServiceA {
  constructor(private b = pea(ServiceB)) {}
}

class ServiceB {
  constructor(private a = pea(ServiceA)) {}
}

// ✅ Good: Use events or restructure
class ServiceA {
  constructor(private eventBus = pea(EventBus)) {}
}

class ServiceB {
  constructor(private eventBus = pea(EventBus)) {}
}
```

### Async Initialization

Services are initialized lazily, which can lead to unexpected async behavior:


## Type Safety

### Generic Types

Type inference with generics can be tricky:

```typescript
// ❌ Bad: Generic type lost in proxy
class Repository<T> {
  constructor(private db = pea(Database)) {}
}

// ✅ Good: Use specific type key
const userRepoKey = peaKey<Repository<User>>("userRepo");
context.register(userRepoKey, new Repository<User>());
```

### Optional Dependencies

Be explicit about optional dependencies:

```typescript
// ❌ Bad: Implicit optional dependency
class Service {
  constructor(private logger = pea(Logger)) {}
}

// ✅ Good: Explicit optional dependency
class Service {
  constructor(private logger:Logger | undefined = pea(Logger)) {}
}
```

## Performance Considerations

### Proxy Overhead

Proxies add a small performance overhead:
Proxies keep references to their targets:


## Testing Considerations

### Mocking Proxies

Testing proxied services requires special consideration:

```typescript
// ❌ Bad: Direct mock assignment
service.dependency = mockDependency;

// ✅ Good: Register mock with context
context.register(DependencyKey, mockDependency);
```

### Property Spying

Spying on proxy properties requires proper setup:

```typescript
// ❌ Bad: Direct spy on proxy
const spy = jest.spyOn(service.logger, 'log');

// ✅ Good: Register spy through context
const mockLogger = { log: jest.fn() };
context.register(LoggerKey, mockLogger);
```

## Best Practices to Avoid Issues

1. **Keep References**
```typescript
// Always store proxy references
class Service {
  private readonly config = pea(Config);
  private readonly logger = pea(Logger);
}
```

2. **Avoid Object Manipulation**
```typescript
// Don't manipulate proxy objects directly
const config = pea(Config);
Object.assign(config, newValues); // ❌ Bad

// Instead, use proper registration
context.register(Config, newValues); // ✅ Good
```

3. **Type Safety**
```typescript
// Always declare types in registry
declare module "@speajus/pea" {
  interface Registry {
    [ConfigKey]: Config;
    [LoggerKey]: Logger;
  }
}
```

4. **Async Handling**
```typescript
// Use async factories for async initialization
context.register(DatabaseKey, async () => {
  const db = await Database.initialize();
  return db;
});
```

## Working with Native JavaScript Features

### Property Enumeration

Some native operations might not work as expected:

```typescript
// ❌ Bad: Direct property enumeration
const config = pea(Config);
Object.keys(config); // May not return expected keys

// ✅ Good: Use specific properties
const config = pea(Config);
const keys = ['apiUrl', 'timeout'];
const values = keys.map(key => config[key]);
```

## Related Resources

- [JavaScript Proxy Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [TypeScript Generics Guide](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Pea Examples](https://github.com/speajus/pea/tree/main/examples)
