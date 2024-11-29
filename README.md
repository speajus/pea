# [@speajus/pea](https://github.com/speajus/pea)

A lightweight Dependency Injection (DI) framework for Node.js, based on proxies.

## Overview

Injection is a simple yet powerful DI framework designed to make dependency management in Node.js applications easier and more flexible. It leverages JavaScript proxies to provide a seamless integration experience.
Some more examples can be found [here](https://github.com/speajus/spea-example/tree/main)

**Note: This project is still a work in progress. APIs may change, and additional features are planned.**

## Features

- Lightweight nearly everything is done with `peaKey`, `context.register`, `context.resolve` and `pea`.
- Proxy-based lazy loading of dependencies
- No (runtime) dependencies (other than `node:async_hooks`)
- Type-safe and fully typed
- Not based on decorators.
- Constructor injection
- Factory injection
- Primitive injection
- Caching

## Dependencies and Requirements

This has no runtime dependencies. It also works with most modern JS runtimes.

## Installation

```bash
npm install @speajus/pea
```

or

```bash
yarn add @speajus/pea
```

## Basic Usage

Here's a simple example of how to use Injection:

```typescript
import { pea, context } from "@speajus/pea";

// Define a service
class DatabaseService {
  connect() {
    console.log("Connected to database");
  }
}

// Register the service
context.register(DatabaseService);

// Use the service
class UserService {
  constructor(private db = pea(DatabaseService)) {}

  getUsers() {
    this.db.connect();
    // ... fetch users
  }
}

const userService = context.resolve(UserService);
userService.getUsers(); // Outputs: Connected to database
```

## PeaKey symbols

You can use symbols to register and retrieve services, please use the `peaKey` symbols,
as they provide type safety and do not require any additional configuration.

```ts
import { pea, context, peaKey } from "@speajus/pea";
class DatabaseService {
  connect() {
    console.log("Connected to database");
  }
}
const dbService = peaKey<DatabaseService>("db-service");

// Register the service
context.register(dbService, DatabaseService);

// Use the service
class UserService {
  constructor(private db = pea(dbService)) {}

  getUsers() {
    this.db.connect();
    // ... fetch users
  }
}

const userService = context.resolve(UserService);
```

## Advanced Usage

### Custom Registry

You can use symbols to register and retrieve services, it is preferrable to use the `peaKey` symbols:

```typescript
import { pea, context } from '@speajus/pea';

const dbService = Symbol('DatabaseService');

class DatabaseService {
  connect() {
    console.log('Connected to database');
  }
}
//this makes pea work with symbols
declare module "@speajus/registry" {
    export interface Registry {
        [dbService]: typeof DatabaseService;
    }
}

context.register(dbService, DatabaseService);

class UserService {
  constructor(private db = pea(dbService)) {}

  getUsers() {
    this.db.connect();
    // ... fetch users
  }
}
...
const userService = context.resolve(UserService);
userService.getUsers(); // Outputs: Connected to database
```

## AsyncLocal Storage usage

Preliminary support is available for AsyncLocalStorage, it's highly inspired by
[AsyncVars](https://eytanmanor.medium.com/should-you-use-asynclocalstorage-2063854356bb)
. This is useful for things like user Auth in web apps. This code has no warranty or fitness
garuntees, it is super mega **Experimental**.

Note: You must import the `import "@speajus/pea/async"` somewhere in your module for this to work. This is an attempt
to prevent the need for complicated build configurations, when runnning in browser. This module depends
on `node:async_hooks` and will not work in the browser.

```ts
//this extends context to add async support.
import "@speajus/pea/async";

const userSymbol = peaKey<User>("user");

class AuthService {
  constructor(private user = pea(userSymbol)) {}

  isAuthenticated() {
    return this.user != null;
  }
  hasRole(role: string) {
    return this.user?.roles.includes(role);
  }
}
const requestScoped = context.scoped(userSymbol);
const app = express();
app.use((req, res, next) => {
  requestScoped(req.user);
  next();
});
```

## API Reference

### pea(service, type?)

Returns a proxy for the given service. If the service is a symbol, the type can be used to specify the type of the service. Symbols should be registered with the context. For example:

```typescript
const dbService = Symbol("DatabaseService");

class DatabaseService {
  connect() {
    console.log("Connected to database");
  }
}
declare module "@speajus/pea" {
  export interface Registry {
    [dbService]: InstanceOf<typeof DatabaseService>;
  }
}

context.register(dbService, DatabaseService);

class UserService {
  constructor(private db = pea(dbService)) {}

  getUsers() {
    this.db.connect();
    // ... fetch users
  }
}
const userService = context.resolve(UserService);
userService.getUsers(); // Outputs: Connected to database
```

### context.register(service, ...args)

Registers a service with the given arguments.

### context.resolve(service, ...args)

Resolves a service with the given arguments.

### context.visit(service, fn)

Visits all dependencies of a service. This can be used to destroy all dependencies, or something, else. The
return of `fn` becomes the new value of the dependency. As primitives do not have dependencies, they do not get visited.

## Limitations

When using factories as keys, the arguments are not resolved. This is because the factory is not a constructor, and the arguments are not passed to the factory. This is a limitation of the current API, we can not differentiate
between trying to use a factory as a key, or trying to use a factory as a service. There would be no way to differentiate trying to replace the factory or trying register it. We may need to add additional API to support this.

## Invalidation

When a service is registered, all service that depend on it are invalidated. This means that all dependencies are resolved again. This is done to ensure that all dependencies are up to date.
This is done by keeping track of all dependencies.

## Caching

Values are cached in the context. If at some point the value is changed, all services that depend on it are invalidated. This is done by keeping track of all dependencies.

## Roadmap

- Improve documentation and add more examples
- Finish AsyncLocal work for scope.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
