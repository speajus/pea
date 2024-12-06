
# ListOf

The `listOf` function is a powerful feature in Pea that allows you to retrieve all instances of a specific service type or tagged with a specific key. It supports inheritance and factory patterns, making it ideal for plugin systems or collecting related services.  `listOf` is a proxy, and will automatically update when a dependency changes.

## Basic Usage

```typescript
import { pea, peaKey, context } from "@speajus/pea";

// Using PeaKey
const pluginKey = peaKey<Plugin>("plugin");
const plugins = context.listOf(pluginKey);

// Using Class type
const services = context.listOf(BaseService);
```

## Features

### Tag-based Collection

```typescript
interface LoggerService {
  log(message: string): void;
}

const loggerKey = peaKey<LoggerService>("logger");

// Register multiple services with the same tag
class ConsoleLogger {
  log(message: string) { console.log(message); }
}

class FileLogger {
  log(message: string) { /* log to file */ }
}

const ctx = context;
ctx.register(ConsoleLogger).withTags(loggerKey);
ctx.register(FileLogger).withTags(loggerKey);

// Get all loggers
const loggers: LoggerService[] = ctx.listOf(loggerKey);
loggers.forEach(logger => logger.log("Hello"));
```

### Inheritance-based Collection

```typescript
class BasePlugin {
  abstract execute(): void;
}

class PluginA extends BasePlugin {
  execute() { console.log("Plugin A"); }
}

class PluginB extends BasePlugin {
  execute() { console.log("Plugin B"); }
}

const ctx = context;
ctx.register(PluginA);
ctx.register(PluginB);

// Get all plugins that inherit from BasePlugin
const plugins = ctx.listOf(BasePlugin);
plugins.forEach(plugin => plugin.execute());
```

### Factory-based Collection

```typescript
interface Handler {
  handle(data: any): void;
}

const handlerFactory = () => ({
  handle: (data: any) => console.log(data)
});

const ctx = context;
ctx.register(peaKey("handler-a"), handlerFactory);
ctx.register(peaKey("handler-b"), handlerFactory);
ctx.register(handlerFactory);

// Get all instances created by the factory
const handlers = ctx.listOf(handlerFactory);
handlers.forEach(handler => handler.handle("test"));
```

## Type Safety

The `listOf` function maintains type safety through the registry:

```typescript
interface Plugin {
  name: string;
  execute(): void;
}

const pluginKey = peaKey<Plugin>("plugin");

// Type-safe registration
ctx.register(pluginKey, {
  name: "test",
  execute: () => console.log("executing")
}).withTags(pluginKey);

// Type-safe retrieval
const plugins: Plugin[] = ctx.listOf(pluginKey);
```

## Common Use Cases

### Plugin System

```typescript
interface Plugin {
  name: string;
  initialize(): void;
}

const pluginKey = peaKey<Plugin>("plugin");

class PluginManager {
  constructor(private ctx = context) {}

  initializePlugins() {
    const plugins = this.ctx.listOf(pluginKey);
    for (const plugin of plugins) {
      console.log(`Initializing plugin: ${plugin.name}`);
      plugin.initialize();
    }
  }
}
```

### Event Handlers

```typescript
interface EventHandler {
  event: string;
  handle(data: any): void;
}

const handlerKey = peaKey<EventHandler>("event-handler");

class EventBus {
  constructor(private ctx = context) {}

  emit(event: string, data: any) {
    const handlers = this.ctx.listOf(handlerKey);
    handlers
      .filter(h => h.event === event)
      .forEach(h => h.handle(data));
  }
}
```

### Middleware Chain

```typescript
interface Middleware {
  order: number;
  process(data: any, next: () => void): void;
}

const middlewareKey = peaKey<Middleware>("middleware");

class MiddlewareChain {
  constructor(private ctx = context) {}

  execute(data: any) {
    const middleware = this.ctx.listOf(middlewareKey)
      .sort((a, b) => a.order - b.order);

    let index = 0;
    const next = () => {
      if (index < middleware.length) {
        middleware[index++].process(data, next);
      }
    };

    next();
  }
}
```

## Best Practices

1. **Use Tags for Flexible Grouping**
   ```typescript
   const httpHandlerKey = peaKey<HttpHandler>("http-handler");
   const adminHandlerKey = peaKey<HttpHandler>("admin-handler");

   class UserHandler implements HttpHandler {
     // implementation
   }

   // Register with multiple tags
   ctx.register(UserHandler)
      .withTags(httpHandlerKey, adminHandlerKey);
   ```

2. **Combine with Factory Pattern**
   ```typescript
   const validatorKey = peaKey<Validator>("validator");

   const createValidator = (type: string) => ({
     type,
     validate: (data: any) => /* validation logic */
   });

   ctx.register(peaKey("email"), () => createValidator("email"))
      .withTags(validatorKey);
   ctx.register(peaKey("phone"), () => createValidator("phone"))
      .withTags(validatorKey);
   ```

3. **Order Management**
   ```typescript
   interface OrderedPlugin {
     order: number;
     execute(): void;
   }

   const pluginKey = peaKey<OrderedPlugin>("plugin");

   class PluginOrchestrator {
     executeInOrder() {
       const plugins = ctx.listOf(pluginKey)
         .sort((a, b) => a.order - b.order);
       
       plugins.forEach(p => p.execute());
     }
   }
   ```

4. **Dynamic Registration**
   ```typescript
   class FeatureRegistry {
     registerFeature(feature: Feature) {
       return ctx.register(feature).withTags(featureKey);
     }

     getFeatures() {
       return ctx.listOf(featureKey);
     }
   }
   ```
```
</augment_code_snippet>

This documentation covers the `listOf` functionality in detail, including its various use cases with PeaKeys, inheritance, and factories, along with best practices for implementing plugin systems and other collection-based patterns.
