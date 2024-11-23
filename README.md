# Injection

A lightweight Dependency Injection (DI) framework for Node.js, based on proxies.

## Overview

Injection is a simple yet powerful DI framework designed to make dependency management in Node.js applications easier and more flexible. It leverages JavaScript proxies to provide a seamless integration experience.

**Note: This project is still a work in progress. APIs may change, and additional features are planned.**

## Features

- Lightweight and only 3 methods, `context.register`, `context.resolve` and `pea`.
- Proxy-based lazy loading of dependencies 
- No dependencies
- Type-safe and fully typed
- Not based on decorators.
- Constructor injection
- Factory injection
- Primitive injection

## Dependencies and Requirements
This has no runtime dependencies.  It also works with most modern JS runtimes.


## Installation

```bash
npm install @spea/pea
```

or

```bash
yarn add @spea/pea
```

## Basic Usage

Here's a simple example of how to use Injection:

```typescript
import { pea, context } from '@spea/pea';

// Define a service
class DatabaseService {
  connect() {
    console.log('Connected to database');
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

## Advanced Usage

### Custom Symbols

You can use symbols to register and retrieve services:

```typescript
import { pea, context } from '@spea/pea';

const dbService = Symbol('DatabaseService');

class DatabaseService {
  connect() {
    console.log('Connected to database');
  }
}
//this makes pea work with symbols
declare module "@spea/registry" {
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

## API Reference
### pea(service, type?)

Returns a proxy for the given service.  If the service is a symbol, the type can be used to specify the type of the service.  Symbols should be registered with the context.  For example:

```typescript
const dbService = Symbol('DatabaseService');

class DatabaseService {
  connect() {
    console.log('Connected to database');
  }
}
declare module "@spea/registry" {
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
```

### context.register(service, ...args)

Registers a service with the given arguments.

### context.resolve(service, ...args)

Resolves a service with the given arguments.

### context.visit(service, fn)

Visits all dependencies of a service. This can be used to destroy all dependencies, or something, else. The
return of `fn` becomes the new value of the dependency. As primitives do not have dependencies, they do not get visited.   

## Roadmap

- Improve documentation and add more examples
- Finish AsyncLocal work for scope.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.